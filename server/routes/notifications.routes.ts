import { Router } from "express";
import { NotificationsController } from "../controllers/notifications.controller";
import { requireAuth } from "../controllers/auth.controller";

const router = Router();

router.get("/", requireAuth, NotificationsController.list);
router.put("/read-all", requireAuth, NotificationsController.markAllRead);
router.put("/:id/read", requireAuth, NotificationsController.markRead);
router.delete("/clear-read", requireAuth, NotificationsController.clearRead);
router.delete("/:id", requireAuth, NotificationsController.deleteOne);
router.post("/refresh", requireAuth, NotificationsController.refresh);

export default router;
