import { Router } from "express";
import { AuthController, requireAuth, requireAdmin } from "../controllers/auth.controller";
import bcrypt from "bcrypt";

const router = Router();

router.post("/register", async (req: any, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
    if (password.length < 6) return res.status(400).json({ message: "Password min 6 chars" });
    const { storage } = await import("../storage");
    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ message: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const allPermissions = ["students","staff","classes","attendance","homework","exams","fees","notices","transport","library","inventory","visitors","payroll","reports"];
    const user = await storage.createUser({ name, email, passwordHash, role: "admin", isOnboarded: false, permissions: allPermissions, branchId: null, isActive: true, adminId: null, organizationId: null } as any);
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userPermissions = allPermissions;
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, isOnboarded: user.isOnboarded } });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", AuthController.me);

// Forgot password / OTP flow (public)
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/reset-password-with-token", AuthController.resetPasswordWithToken);

// Change password for logged-in user
router.post("/change-password", requireAuth, AuthController.changePassword);

// User management (admin only)
router.get("/users", requireAuth, requireAdmin, AuthController.listUsers);
router.post("/users", requireAuth, requireAdmin, AuthController.createUser);
router.put("/users/:id", requireAuth, requireAdmin, AuthController.updateUser);
router.delete("/users/:id", requireAuth, requireAdmin, AuthController.deleteUser);

// Organization
router.get("/organization", async (req: any, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { storage } = await import("../storage");
    const org = await storage.getOrganization(userId);
    res.json(org || null);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/organization", async (req: any, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { storage } = await import("../storage");
    const org = await storage.upsertOrganization(userId, req.body);
    res.json(org);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.post("/onboard", async (req: any, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { storage } = await import("../storage");
    await storage.updateUser(userId, { isOnboarded: true });
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
