import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { mindMapSchema } from "@shared/schema";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

// Schemas
const insertMindMapSchema = mindMapSchema.omit({ id: true, userId: true, createdAt: true });
const updateMindMapSchema = mindMapSchema.partial();

const router = Router();

// Mind map CRUD endpoints (protected)
router.get("/", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const mindMaps = await storage.getAllMindMaps(userId);
    res.json(mindMaps);
  } catch (error: any) {
    console.error("Error in GET /api/mindmaps:", error);
    res.status(500).json({ error: "Failed to fetch mind maps" });
  }
});

router.get("/:id", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const mindMap = await storage.getMindMap(req.params.id, userId);
    if (!mindMap) {
      res.status(404).json({ error: "Mind map not found" });
      return;
    }
    res.json(mindMap);
  } catch (error: any) {
    console.error("Error in GET /api/mindmaps/:id:", error);
    res.status(500).json({ error: "Failed to fetch mind map" });
  }
});

router.post("/", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const validatedData = insertMindMapSchema.parse(req.body);
    const mindMap = await storage.createMindMap({ ...validatedData, userId }, userId);
    res.json(mindMap);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
      return;
    }
    console.error("Error in POST /api/mindmaps:", error);
    res.status(500).json({ error: "Failed to create mind map" });
  }
});

router.patch("/:id", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const validatedData = updateMindMapSchema.parse(req.body);
    const mindMap = await storage.updateMindMap(req.params.id, userId, validatedData);
    if (!mindMap) {
      res.status(404).json({ error: "Mind map not found" });
      return;
    }
    res.json(mindMap);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
      return;
    }
    console.error("Error in PATCH /api/mindmaps/:id:", error);
    res.status(500).json({ error: "Failed to update mind map" });
  }
});

router.delete("/:id", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const success = await storage.deleteMindMap(req.params.id, userId);
    if (!success) {
      res.status(404).json({ error: "Mind map not found" });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/mindmaps/:id:", error);
    res.status(500).json({ error: "Failed to delete mind map" });
  }
});

export default router;

