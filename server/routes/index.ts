import { Router } from "express";
import authRoutes from "./auth.js";
import aiRoutes from "./ai.js";
import mindmapRoutes from "./mindmaps.js";
import flashcardRoutes from "./flashcards.js";
import historyRoutes from "./history.js";
import billingRoutes from "./billing.js";
import quotaRoutes from "./quota.js";

const router = Router();

// Mount routes to match original API structure
// Original: /api/auth/user -> authRoutes handles /user, so mount at /auth
router.use("/auth", authRoutes);

// Original: /api/generate-words -> aiRoutes handles /generate-words
// Original: /api/examples/generate -> aiRoutes handles /examples/generate
// Original: /api/synonyms/generate -> aiRoutes handles /synonyms/generate
router.use("/", aiRoutes); 

// Original: /api/mindmaps -> mindmapRoutes
router.use("/mindmaps", mindmapRoutes);

// Original: /api/flashcards -> flashcardRoutes
router.use("/flashcards", flashcardRoutes);

// Original: /api/history -> historyRoutes
router.use("/history", historyRoutes);

// Original: /api/billing/verify -> billingRoutes handles /verify, so mount at /billing
router.use("/billing", billingRoutes);

// Original: /api/quota -> quotaRoutes handles /quota, so mount at /
router.use("/", quotaRoutes);

export { router };
