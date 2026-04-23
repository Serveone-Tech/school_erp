// server/storage.ts
import { db } from "./db";
import {
  branches, users, students, staff, classes, sections, subjects, periods,
  studentAttendance, staffAttendance, homework, exams, examResults,
  feeStructure, feePayments, notices, studentRemarks, healthRecords,
  transportRoutes, studentTransport, libraryBooks, libraryIssues,
  inventory, visitors, staffLeave, payroll, communications, notifications,
  transactions, academicYears, organizations, plans, subscriptions, payments,
  parentPortalUsers,
  type ParentPortalUser,
  type Branch, type User, type Student, type Staff, type Class, type Section,
  type Subject, type Period, type StudentAttendance, type StaffAttendance,
  type Homework, type Exam, type FeeStructure, type FeePayment, type Notice,
  type HealthRecord, type TransportRoute, type LibraryBook, type InventoryItem,
  type Visitor, type Notification, type Plan, type Subscription, type Payment,
  type Organization, type AcademicYear,
  type InsertUser, type InsertBranch, type InsertStudent, type InsertStaff,
  type InsertClass, type InsertSection, type InsertSubject, type InsertPeriod,
  type InsertHomework, type InsertExam, type InsertFeeStructure, type InsertFeePayment,
  type InsertAttendance, type InsertNotice, type InsertPlan, type InsertSubscription,
  type InsertOrganization,
} from "../shared/schema";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";

function getAdminId(opts: any) {
  return opts?.adminId;
}

export const storage = {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers(opts?: { adminId?: number }): Promise<User[]> {
    if (opts?.adminId) {
      const rows = await db.select().from(users).where(eq(users.adminId, opts.adminId));
      return rows;
    }
    return db.select().from(users);
  },
  async getUser(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  },
  async createUser(data: any): Promise<User> {
    const [u] = await db.insert(users).values(data).returning();
    return u;
  },
  async updateUser(id: number, data: any): Promise<User> {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  },
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },

  // ── Branches ───────────────────────────────────────────────────────────────
  async getBranches(opts?: { adminId?: number }): Promise<Branch[]> {
    if (opts?.adminId) return db.select().from(branches).where(eq(branches.adminId, opts.adminId));
    return db.select().from(branches);
  },
  async getBranch(id: number): Promise<Branch | undefined> {
    const [b] = await db.select().from(branches).where(eq(branches.id, id));
    return b;
  },
  async createBranch(data: InsertBranch): Promise<Branch> {
    const [b] = await db.insert(branches).values(data as any).returning();
    return b;
  },
  async updateBranch(id: number, data: Partial<InsertBranch>): Promise<Branch> {
    const [b] = await db.update(branches).set(data as any).where(eq(branches.id, id)).returning();
    return b;
  },
  async deleteBranch(id: number): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  },

  // ── Organizations ─────────────────────────────────────────────────────────
  async getOrganization(userId: number): Promise<Organization | undefined> {
    const [o] = await db.select().from(organizations).where(eq(organizations.userId, userId));
    return o;
  },
  async upsertOrganization(userId: number, data: any): Promise<Organization> {
    const { id, userId: _uid, createdAt, updatedAt, ...fields } = data;
    const existing = await this.getOrganization(userId);
    if (existing) {
      const [o] = await db.update(organizations).set({ ...fields, updatedAt: new Date() }).where(eq(organizations.userId, userId)).returning();
      return o;
    }
    const [o] = await db.insert(organizations).values({ ...fields, userId }).returning();
    return o;
  },

  // ── Academic Years ─────────────────────────────────────────────────────────
  async getAcademicYears(adminId: number): Promise<AcademicYear[]> {
    return db.select().from(academicYears).where(eq(academicYears.adminId, adminId));
  },
  async createAcademicYear(data: any): Promise<AcademicYear> {
    const [a] = await db.insert(academicYears).values(data).returning();
    return a;
  },

  // ── Classes ────────────────────────────────────────────────────────────────
  async getClasses(opts?: { adminId?: number; branchId?: number }): Promise<Class[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(classes.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(classes.branchId, opts.branchId));
    return db.select().from(classes).where(conds.length ? and(...conds) : undefined);
  },
  async getClass(id: number): Promise<Class | undefined> {
    const [c] = await db.select().from(classes).where(eq(classes.id, id));
    return c;
  },
  async createClass(data: InsertClass): Promise<Class> {
    const [c] = await db.insert(classes).values(data as any).returning();
    return c;
  },
  async updateClass(id: number, data: Partial<InsertClass>): Promise<Class> {
    const [c] = await db.update(classes).set(data as any).where(eq(classes.id, id)).returning();
    return c;
  },
  async deleteClass(id: number): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  async getSections(opts?: { classId?: number; adminId?: number }): Promise<Section[]> {
    const conds = [];
    if (opts?.classId) conds.push(eq(sections.classId, opts.classId));
    if (opts?.adminId) conds.push(eq(sections.adminId, opts.adminId));
    return db.select().from(sections).where(conds.length ? and(...conds) : undefined);
  },
  async createSection(data: InsertSection): Promise<Section> {
    const [s] = await db.insert(sections).values(data as any).returning();
    return s;
  },
  async updateSection(id: number, data: any): Promise<Section> {
    const [s] = await db.update(sections).set(data).where(eq(sections.id, id)).returning();
    return s;
  },
  async deleteSection(id: number): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  },

  // ── Subjects ───────────────────────────────────────────────────────────────
  async getSubjects(opts?: { adminId?: number; classId?: number }): Promise<Subject[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(subjects.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(subjects.classId, opts.classId));
    return db.select().from(subjects).where(conds.length ? and(...conds) : undefined);
  },
  async createSubject(data: InsertSubject): Promise<Subject> {
    const [s] = await db.insert(subjects).values(data as any).returning();
    return s;
  },
  async updateSubject(id: number, data: any): Promise<Subject> {
    const [s] = await db.update(subjects).set(data).where(eq(subjects.id, id)).returning();
    return s;
  },
  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  async getStaff(opts?: { adminId?: number; branchId?: number }): Promise<Staff[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(staff.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(staff.branchId, opts.branchId));
    return db.select().from(staff).where(conds.length ? and(...conds) : undefined).orderBy(desc(staff.createdAt));
  },
  async getStaffMember(id: number): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.id, id));
    return s;
  },
  async createStaff(data: InsertStaff): Promise<Staff> {
    const [s] = await db.insert(staff).values(data as any).returning();
    return s;
  },
  async updateStaff(id: number, data: Partial<InsertStaff>): Promise<Staff> {
    const [s] = await db.update(staff).set(data as any).where(eq(staff.id, id)).returning();
    return s;
  },
  async deleteStaff(id: number): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  },

  // ── Students ───────────────────────────────────────────────────────────────
  async getStudents(opts?: { adminId?: number; classId?: number; sectionId?: number; branchId?: number; status?: string }): Promise<Student[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(students.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(students.classId, opts.classId));
    if (opts?.sectionId) conds.push(eq(students.sectionId, opts.sectionId));
    if (opts?.branchId) conds.push(eq(students.branchId, opts.branchId));
    if (opts?.status) conds.push(eq(students.status, opts.status));
    return db.select().from(students).where(conds.length ? and(...conds) : undefined).orderBy(desc(students.createdAt));
  },
  async getStudent(id: number): Promise<Student | undefined> {
    const [s] = await db.select().from(students).where(eq(students.id, id));
    return s;
  },
  async createStudent(data: InsertStudent): Promise<Student> {
    const [s] = await db.insert(students).values(data as any).returning();
    return s;
  },
  async updateStudent(id: number, data: any): Promise<Student> {
    const [s] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return s;
  },
  async deleteStudent(id: number): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  async getAttendance(opts?: { adminId?: number; classId?: number; sectionId?: number; date?: string; studentId?: number; branchId?: number }): Promise<StudentAttendance[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(studentAttendance.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(studentAttendance.classId, opts.classId));
    if (opts?.sectionId) conds.push(eq(studentAttendance.sectionId, opts.sectionId));
    if (opts?.date) conds.push(eq(studentAttendance.date, opts.date));
    if (opts?.studentId) conds.push(eq(studentAttendance.studentId, opts.studentId));
    if (opts?.branchId) conds.push(eq(studentAttendance.branchId, opts.branchId));
    return db.select().from(studentAttendance).where(conds.length ? and(...conds) : undefined);
  },
  async upsertAttendance(data: any): Promise<StudentAttendance> {
    const [a] = await db.insert(studentAttendance).values(data)
      .onConflictDoUpdate({
        target: [studentAttendance.studentId, studentAttendance.date],
        set: { status: data.status, remark: data.remark, markedBy: data.markedBy, branchId: data.branchId },
      }).returning();
    return a;
  },

  // ── Homework ───────────────────────────────────────────────────────────────
  async getHomework(opts?: { adminId?: number; classId?: number; sectionId?: number; branchId?: number }): Promise<Homework[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(homework.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(homework.classId, opts.classId));
    if (opts?.sectionId) conds.push(eq(homework.sectionId, opts.sectionId));
    if (opts?.branchId) conds.push(eq(homework.branchId, opts.branchId));
    return db.select().from(homework).where(conds.length ? and(...conds) : undefined).orderBy(desc(homework.createdAt));
  },
  async createHomework(data: InsertHomework): Promise<Homework> {
    const [h] = await db.insert(homework).values(data as any).returning();
    return h;
  },
  async updateHomework(id: number, data: any): Promise<Homework> {
    const [h] = await db.update(homework).set(data).where(eq(homework.id, id)).returning();
    return h;
  },
  async deleteHomework(id: number): Promise<void> {
    await db.delete(homework).where(eq(homework.id, id));
  },

  // ── Exams ──────────────────────────────────────────────────────────────────
  async getExams(opts?: { adminId?: number; classId?: number; branchId?: number }): Promise<Exam[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(exams.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(exams.classId, opts.classId));
    if (opts?.branchId) conds.push(eq(exams.branchId, opts.branchId));
    return db.select().from(exams).where(conds.length ? and(...conds) : undefined).orderBy(desc(exams.createdAt));
  },
  async createExam(data: InsertExam): Promise<Exam> {
    const [e] = await db.insert(exams).values(data as any).returning();
    return e;
  },
  async updateExam(id: number, data: any): Promise<Exam> {
    const [e] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    return e;
  },
  async deleteExam(id: number): Promise<void> {
    await db.delete(exams).where(eq(exams.id, id));
  },

  // ── Fee Structure ──────────────────────────────────────────────────────────
  async getFeeStructures(opts?: { adminId?: number; classId?: number }): Promise<FeeStructure[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(feeStructure.adminId, opts.adminId));
    if (opts?.classId) conds.push(eq(feeStructure.classId, opts.classId));
    return db.select().from(feeStructure).where(conds.length ? and(...conds) : undefined);
  },
  async createFeeStructure(data: InsertFeeStructure): Promise<FeeStructure> {
    const [f] = await db.insert(feeStructure).values(data as any).returning();
    return f;
  },

  // ── Fee Payments ───────────────────────────────────────────────────────────
  async getFeePayments(opts?: { adminId?: number; studentId?: number; branchId?: number }): Promise<FeePayment[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(feePayments.adminId, opts.adminId));
    if (opts?.studentId) conds.push(eq(feePayments.studentId, opts.studentId));
    if (opts?.branchId) conds.push(eq(feePayments.branchId, opts.branchId));
    return db.select().from(feePayments).where(conds.length ? and(...conds) : undefined).orderBy(desc(feePayments.createdAt));
  },
  async createFeePayment(data: InsertFeePayment): Promise<FeePayment> {
    const [f] = await db.insert(feePayments).values(data as any).returning();
    return f;
  },

  // ── Notices ────────────────────────────────────────────────────────────────
  async getNotices(opts?: { adminId?: number; branchId?: number }): Promise<Notice[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(notices.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(notices.branchId, opts.branchId));
    return db.select().from(notices).where(conds.length ? and(...conds) : undefined).orderBy(desc(notices.createdAt));
  },
  async createNotice(data: InsertNotice): Promise<Notice> {
    const [n] = await db.insert(notices).values(data as any).returning();
    return n;
  },
  async updateNotice(id: number, data: any): Promise<Notice> {
    const [n] = await db.update(notices).set(data).where(eq(notices.id, id)).returning();
    return n;
  },
  async deleteNotice(id: number): Promise<void> {
    await db.delete(notices).where(eq(notices.id, id));
  },

  // ── Health Records ─────────────────────────────────────────────────────────
  async getHealthRecords(opts?: { adminId?: number; studentId?: number; branchId?: number }): Promise<HealthRecord[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(healthRecords.adminId, opts.adminId));
    if (opts?.studentId) conds.push(eq(healthRecords.studentId, opts.studentId));
    if (opts?.branchId) conds.push(eq(healthRecords.branchId, opts.branchId));
    return db.select().from(healthRecords).where(conds.length ? and(...conds) : undefined).orderBy(desc(healthRecords.createdAt));
  },
  async createHealthRecord(data: any): Promise<HealthRecord> {
    const [h] = await db.insert(healthRecords).values(data).returning();
    return h;
  },

  // ── Transport ──────────────────────────────────────────────────────────────
  async getTransportRoutes(opts?: { adminId?: number; branchId?: number }): Promise<TransportRoute[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(transportRoutes.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(transportRoutes.branchId, opts.branchId));
    return db.select().from(transportRoutes).where(conds.length ? and(...conds) : undefined);
  },
  async createTransportRoute(data: any): Promise<TransportRoute> {
    const [t] = await db.insert(transportRoutes).values(data).returning();
    return t;
  },
  async updateTransportRoute(id: number, data: any): Promise<TransportRoute> {
    const [t] = await db.update(transportRoutes).set(data).where(eq(transportRoutes.id, id)).returning();
    return t;
  },
  async deleteTransportRoute(id: number): Promise<void> {
    await db.delete(transportRoutes).where(eq(transportRoutes.id, id));
  },

  // ── Library ────────────────────────────────────────────────────────────────
  async getLibraryBooks(opts?: { adminId?: number; branchId?: number }): Promise<LibraryBook[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(libraryBooks.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(libraryBooks.branchId, opts.branchId));
    return db.select().from(libraryBooks).where(conds.length ? and(...conds) : undefined);
  },
  async createLibraryBook(data: any): Promise<LibraryBook> {
    const [b] = await db.insert(libraryBooks).values(data).returning();
    return b;
  },
  async updateLibraryBook(id: number, data: any): Promise<LibraryBook> {
    const [b] = await db.update(libraryBooks).set(data).where(eq(libraryBooks.id, id)).returning();
    return b;
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  async getInventory(opts?: { adminId?: number; branchId?: number }): Promise<InventoryItem[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(inventory.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(inventory.branchId, opts.branchId));
    return db.select().from(inventory).where(conds.length ? and(...conds) : undefined);
  },
  async createInventoryItem(data: any): Promise<InventoryItem> {
    const [i] = await db.insert(inventory).values(data).returning();
    return i;
  },
  async updateInventoryItem(id: number, data: any): Promise<InventoryItem> {
    const [i] = await db.update(inventory).set(data).where(eq(inventory.id, id)).returning();
    return i;
  },

  // ── Visitors ───────────────────────────────────────────────────────────────
  async getVisitors(opts?: { adminId?: number; date?: string; branchId?: number }): Promise<Visitor[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(visitors.adminId, opts.adminId));
    if (opts?.date) conds.push(eq(visitors.date, opts.date));
    if (opts?.branchId) conds.push(eq(visitors.branchId, opts.branchId));
    return db.select().from(visitors).where(conds.length ? and(...conds) : undefined).orderBy(desc(visitors.createdAt));
  },
  async createVisitor(data: any): Promise<Visitor> {
    const [v] = await db.insert(visitors).values(data).returning();
    return v;
  },
  async updateVisitor(id: number, data: any): Promise<Visitor> {
    const [v] = await db.update(visitors).set(data).where(eq(visitors.id, id)).returning();
    return v;
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  async getNotifications(adminId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.adminId, adminId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  },
  async createNotification(data: any): Promise<Notification> {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  },
  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  },
  async markAllNotificationsRead(adminId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.adminId, adminId));
  },

  // ── Plans ──────────────────────────────────────────────────────────────────
  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.isActive, true));
  },
  async getAllPlans(): Promise<Plan[]> {
    return db.select().from(plans);
  },
  async getPlan(id: number): Promise<Plan | undefined> {
    const [p] = await db.select().from(plans).where(eq(plans.id, id));
    return p;
  },
  async createPlan(data: any): Promise<Plan> {
    const [p] = await db.insert(plans).values(data).returning();
    return p;
  },
  async updatePlan(id: number, data: any): Promise<Plan> {
    const [p] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return p;
  },

  // ── Subscriptions ──────────────────────────────────────────────────────────
  async getSubscription(userId: number): Promise<Subscription | undefined> {
    const [s] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
    return s;
  },
  async createSubscription(data: any): Promise<Subscription> {
    const [s] = await db.insert(subscriptions).values(data).returning();
    return s;
  },
  async updateSubscription(id: number, data: any): Promise<Subscription> {
    const [s] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return s;
  },
  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  },

  // ── Transactions ───────────────────────────────────────────────────────────
  async getTransactions(opts?: { adminId?: number; branchId?: number }): Promise<any[]> {
    const conds = [];
    if (opts?.adminId) conds.push(eq(transactions.adminId, opts.adminId));
    if (opts?.branchId) conds.push(eq(transactions.branchId, opts.branchId));
    return db.select().from(transactions).where(conds.length ? and(...conds) : undefined).orderBy(desc(transactions.date));
  },
  async createTransaction(data: any): Promise<any> {
    const [t] = await db.insert(transactions).values(data).returning();
    return t;
  },

  // ── Parent Portal Users ────────────────────────────────────────────────────
  async getParentByEmail(email: string, adminId: number): Promise<ParentPortalUser | undefined> {
    const [p] = await db.select().from(parentPortalUsers)
      .where(and(eq(parentPortalUsers.email, email.toLowerCase()), eq(parentPortalUsers.adminId, adminId)));
    return p;
  },
  async getParentById(id: number): Promise<ParentPortalUser | undefined> {
    const [p] = await db.select().from(parentPortalUsers).where(eq(parentPortalUsers.id, id));
    return p;
  },
  async createParentPortalUser(data: {
    email: string;
    passwordHash: string;
    fatherName?: string | null;
    studentIds: number[];
    adminId: number;
  }): Promise<ParentPortalUser> {
    const [p] = await db.insert(parentPortalUsers).values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fatherName: data.fatherName ?? null,
      studentIds: data.studentIds,
      adminId: data.adminId,
    }).returning();
    return p;
  },
  async updateParentPortalUser(id: number, data: Partial<ParentPortalUser>): Promise<ParentPortalUser> {
    const [p] = await db.update(parentPortalUsers).set(data).where(eq(parentPortalUsers.id, id)).returning();
    return p;
  },
  async addStudentToParent(parentId: number, studentId: number): Promise<void> {
    await db.update(parentPortalUsers)
      .set({ studentIds: sql`array_append(student_ids, ${studentId})` })
      .where(eq(parentPortalUsers.id, parentId));
  },
};
