import { Router } from "express";
import { storage } from "../storage";
import { getUserSearchHistory, deleteHistoryItem, getHistoryDetail } from "../utils/history-manager";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

const router = Router();

// Get search history list
router.get("/", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const history = await getUserSearchHistory(userId);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get specific history item detail (reconstruct view)
router.get("/:id", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const detail = await getHistoryDetail(userId, req.params.id);
    if (!detail) {
      res.status(404).json({ error: "History item not found" });
      return;
    }
    res.json(detail);
  } catch (error: any) {
    console.error("Error fetching history detail:", error);
    res.status(500).json({ error: "Failed to fetch history detail" });
  }
});

// Delete history item
router.delete("/:id", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const success = await deleteHistoryItem(userId, req.params.id);
    if (!success) {
      res.status(404).json({ error: "History item not found" });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting history item:", error);
    res.status(500).json({ error: "Failed to delete history item" });
  }
});

export default router;

