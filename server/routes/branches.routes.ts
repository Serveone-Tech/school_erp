import { Router } from "express";
import { BranchesController } from "../controllers/branches.controller";
import { requireAuth } from "../controllers/auth.controller";

const router = Router();

router.get("/", requireAuth, BranchesController.list);
router.post("/", requireAuth, BranchesController.create);
router.put("/:id", requireAuth, BranchesController.update);
router.delete("/:id", requireAuth, BranchesController.remove);

export default router;
