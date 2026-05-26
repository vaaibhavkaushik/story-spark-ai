import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { User } from "../modules/user/user.model";
import { REQUEST_LIMITS } from "../../interfaces/ai_model_request_limit";
import ApiError from "../../errors/api_error";
import { JwtHalers } from "../../utils/jwt.helper";
import config from "../../config";
import { Secret } from "jsonwebtoken";
import { IQuotaRefundGuard } from "../modules/ai_model/ai_model.interface";
import logger from "../../utils/logger.util";

export class QuotaRefundGuard implements IQuotaRefundGuard {
  private email: string;
  private refunded: boolean = false;

  constructor(email: string) {
    this.email = email;
  }

  public async refund(): Promise<void> {
    if (this.refunded) {
      return;
    }
    this.refunded = true;
    try {
      await User.updateOne(
        { email: this.email, requestsThisMonth: { $gt: 0 } },
        { $inc: { requestsThisMonth: -1 } }
      );
    } catch (error) {
      // Rollback internal state to allow retry on transient DB failure
      this.refunded = false;
      logger.error(`Failed to refund quota for user ${this.email}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public isRefunded(): boolean {
    return this.refunded;
  }
}

// Note: Actual quota/limit enforcement was moved to the ai_model.service layer 
// to allow for atomic MongoDB operations and rollback on failure.
// This middleware now only ensures the user is authenticated and exists.
const checkRequestLimit =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization as string;
      if (!token) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "You are not authorized to access"
        );
      }
      const verifiedUser = await JwtHalers.verifyToken(
        token,
        config.jwt.secret as Secret
      );
      const { email: userEmail } = verifiedUser;
      const user = await User.findOne({ email: userEmail });

      if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, "User not found!");
      }

      res.locals.quotaRefundGuard = new QuotaRefundGuard(userEmail);

      next();
    } catch (err) {
      next(err);
    }
  };

export default checkRequestLimit;

