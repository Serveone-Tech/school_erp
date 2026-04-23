import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import { libraryIssues, libraryBooks } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/books", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await storage.getLibraryBooks({ adminId, branchId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/books", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const book = await storage.createLibraryBook({ ...req.body, adminId, branchId, availableCopies: req.body.totalCopies || 1 });
    res.status(201).json(book);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/books/:id", requireAuth, async (req, res) => {
  try {
    const book = await storage.updateLibraryBook(Number(req.params.id), req.body);
    res.json(book);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.get("/issues", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const conds: any[] = [eq(libraryIssues.adminId, adminId)];
    const data = await db.select().from(libraryIssues).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/issues", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const issue = await db.insert(libraryIssues).values({ ...req.body, adminId, branchId }).returning();
    const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, req.body.bookId));
    if (book) await storage.updateLibraryBook(book.id, { availableCopies: (book.availableCopies || 1) - 1 });
    res.status(201).json(issue[0]);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/issues/:id/return", requireAuth, async (req, res) => {
  try {
    const [issue] = await db.update(libraryIssues).set({ returnDate: new Date().toISOString().split("T")[0], status: "Returned", ...req.body }).where(eq(libraryIssues.id, Number(req.params.id))).returning();
    const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, issue.bookId));
    if (book) await storage.updateLibraryBook(book.id, { availableCopies: (book.availableCopies || 0) + 1 });
    res.json(issue);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
