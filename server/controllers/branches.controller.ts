import type { Request, Response } from "express";
import { storage } from "../storage";

import { z } from "zod";
import { insertBranchSchema } from "@shared/schema";

export const BranchesController = {
  async list(req: Request, res: Response) {
    const adminId = (req.session as any)?.adminId ?? (req.session as any)?.userId;
    const list = await storage.getBranches(adminId ? { adminId } : undefined);
    res.json(list);
  },
  async create(req: Request, res: Response) {
    try {
      const adminId = (req.session as any)?.adminId ?? (req.session as any)?.userId;
      const input = insertBranchSchema.parse({ ...req.body, adminId });
      const branch = await storage.createBranch(input);
      res.status(201).json(branch);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },
  async update(req: Request, res: Response) {
    try {
      const input = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(Number(req.params.id), input);
      res.json(branch);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },
  async remove(req: Request, res: Response) {
    await storage.deleteBranch(Number(req.params.id));
    res.status(204).send();
  },
};
