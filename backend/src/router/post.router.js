import express from "express";
import { postController } from "./post.controller"; // Local controller mappings
import { protect } from "../../middlewares/auth.middleware"; // Your auth protector
import { checkRequestLimit } from "../../middlewares/quota.middleware"; // 1. IMPORT YOUR QUOTA MIDDLEWARE

const router = express.Router();

/* ============================================================
   PATCHED POST PATHS — GSSoC '26 COMPUTATION LIMITS
   ============================================================ */

// ... your alternate standard post routes (create, delete, get) ...

/**
 * @route   POST /api/v1/post/remix
 * @desc    Remix an existing story prompt variant
 * @access  Private (Quota Controlled)
 */
router.post(
  "/remix",
  protect,
  checkRequestLimit, // <-- 2. FIXED: Injected limit controller block here
  postController.remixStory
);

/**
 * @route   POST /api/v1/post/translate
 * @desc    Translate generated story variations across languages
 * @access  Private (Quota Controlled)
 */
router.post(
  "/translate",
  protect,
  checkRequestLimit, // <-- 3. FIXED: Injected limit controller block here
  postController.translateStory
);

export const PostRouter = router;
