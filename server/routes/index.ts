import { Router } from "express";
import authRoutes from "./auth";
import aiRoutes from "./ai";
import mindmapRoutes from "./mindmaps";
import flashcardRoutes from "./flashcards";
import historyRoutes from "./history";
import billingRoutes from "./billing";
import quotaRoutes from "./quota";

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
