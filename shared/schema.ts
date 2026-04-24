// shared/schema.ts — School Management System
import {
  pgTable, text, serial, integer, timestamp, boolean, date, unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Branches ─────────────────────────────────────────────────────────────────
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  adminId: integer("admin_id").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Users (Auth + Roles) ──────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"), // admin | staff | teacher | accountant | superadmin
  permissions: text("permissions").array().default([]),
  branchId: integer("branch_id").references(() => branches.id),
  isActive: boolean("is_active").default(true),
  adminId: integer("admin_id").references((): any => users.id),
  isOnboarded: boolean("is_onboarded").default(false),
  organizationId: integer("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Organizations ────────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  logo: text("logo"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  type: text("type").default("school"), // school | college | institute
  boardAffiliation: text("board_affiliation"), // CBSE | ICSE | State Board
  principalName: text("principal_name"),
  establishedYear: text("established_year"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Academic Years ───────────────────────────────────────────────────────────
export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "2024-25"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isCurrent: boolean("is_current").default(false),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Classes ─────────────────────────────────────────────────────────────────
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // e.g. "Class 1", "Class 10"
  numericOrder: integer("numeric_order"), // for sorting
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Sections ────────────────────────────────────────────────────────────────
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // A | B | C
  classId: integer("class_id").references(() => classes.id).notNull(),
  classTeacherId: integer("class_teacher_id").references(() => staff.id),
  capacity: integer("capacity").default(40),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Subjects ────────────────────────────────────────────────────────────────
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  classId: integer("class_id").references(() => classes.id),
  isElective: boolean("is_elective").default(false),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff (Teachers + Other Staff) ──────────────────────────────────────────
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"),
  profilePicture: text("profile_picture"),
  gender: text("gender"),
  dob: text("dob"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pinCode: text("pin_code"),
  aadharNo: text("aadhar_no"),
  panNo: text("pan_no"),
  designation: text("designation").notNull(), // teacher | principal | accountant | peon | librarian | driver
  department: text("department"),
  qualification: text("qualification"),
  experience: text("experience"),
  joiningDate: text("joining_date"),
  salary: integer("salary"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  ifscCode: text("ifsc_code"),
  status: text("status").notNull().default("Active"),
  branchId: integer("branch_id").references(() => branches.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  userId: integer("user_id").references(() => users.id), // linked login account
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff Subjects (which teacher teaches which subject) ─────────────────────
export const staffSubjects = pgTable("staff_subjects", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  classId: integer("class_id").references(() => classes.id),
  sectionId: integer("section_id").references(() => sections.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
});

// ─── Students ─────────────────────────────────────────────────────────────────
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admissionNo: text("admission_no").notNull(),
  rollNo: text("roll_no"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: text("gender"),
  dob: text("dob"),
  profilePicture: text("profile_picture"),
  // Academic
  classId: integer("class_id").references(() => classes.id),
  sectionId: integer("section_id").references(() => sections.id),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  admissionDate: text("admission_date"),
  admissionType: text("admission_type").default("New"), // New | Transfer
  previousSchool: text("previous_school"),
  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pinCode: text("pin_code"),
  country: text("country").default("India"),
  // Family
  fatherName: text("father_name"),
  fatherPhone: text("father_phone"),
  fatherEmail: text("father_email"),
  fatherOccupation: text("father_occupation"),
  motherName: text("mother_name"),
  motherPhone: text("mother_phone"),
  motherEmail: text("mother_email"),
  motherOccupation: text("mother_occupation"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianRelation: text("guardian_relation"),
  // Medical
  bloodGroup: text("blood_group"),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  // Other
  nationality: text("nationality").default("Indian"),
  religion: text("religion"),
  category: text("category"), // General | SC | ST | OBC
  aadharNo: text("aadhar_no"),
  // Status
  status: text("status").notNull().default("Active"), // Active | Inactive | TC
  tcDate: text("tc_date"),
  tcReason: text("tc_reason"),
  branchId: integer("branch_id").references(() => branches.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Student Admission (from enquiry to admission) ────────────────────────────
export const admissions = pgTable("admissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id), // set after "Admit as Student"
  applicationNo: text("application_no"),
  // Applicant details
  applicantName: text("applicant_name").notNull().default(""),
  gender: text("gender"),
  dob: text("dob"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  fatherPhone: text("father_phone"),
  fatherEmail: text("father_email"),
  // Academic
  classApplied: text("class_applied"),
  admissionDate: timestamp("admission_date"),
  status: text("status").default("Pending"), // Pending | Approved | Rejected
  remarks: text("remarks"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Timetable / Periods ──────────────────────────────────────────────────────
export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // Period 1, Lunch, etc.
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Mon...6=Sat
  classId: integer("class_id").references(() => classes.id).notNull(),
  sectionId: integer("section_id").references(() => sections.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  staffId: integer("staff_id").references(() => staff.id),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Student Attendance ───────────────────────────────────────────────────────
export const studentAttendance = pgTable("student_attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("Present"), // Present | Absent | Late | Half Day | Holiday
  periodId: integer("period_id").references(() => periods.id),
  remark: text("remark"),
  markedBy: integer("marked_by").references(() => users.id),
  classId: integer("class_id").references(() => classes.id),
  sectionId: integer("section_id").references(() => sections.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff Attendance ─────────────────────────────────────────────────────────
export const staffAttendance = pgTable("staff_attendance", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("Present"), // Present | Absent | Late | Half Day | Leave
  inTime: text("in_time"),
  outTime: text("out_time"),
  remark: text("remark"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Homework & Assignments ───────────────────────────────────────────────────
export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id),
  classId: integer("class_id").references(() => classes.id).notNull(),
  sectionId: integer("section_id").references(() => sections.id),
  staffId: integer("staff_id").references(() => staff.id),
  assignedDate: text("assigned_date").notNull(),
  dueDate: text("due_date").notNull(),
  attachmentUrl: text("attachment_url"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Homework Submissions ─────────────────────────────────────────────────────
export const homeworkSubmissions = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").references(() => homework.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  submittedDate: text("submitted_date"),
  status: text("status").default("Pending"), // Submitted | Pending | Late
  grade: text("grade"),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Examinations ─────────────────────────────────────────────────────────────
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Unit Test 1 | Half Yearly | Annual
  examType: text("exam_type").default("Written"), // Written | Practical | Oral
  classId: integer("class_id").references(() => classes.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  date: text("date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  totalMarks: integer("total_marks").notNull(),
  passingMarks: integer("passing_marks"),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Exam Results ─────────────────────────────────────────────────────────────
export const examResults = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").references(() => exams.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  marksObtained: integer("marks_obtained"),
  grade: text("grade"),
  remarks: text("remarks"),
  isAbsent: boolean("is_absent").default(false),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Fee Structure ─────────────────────────────────────────────────────────────
export const feeStructure = pgTable("fee_structure", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),     // Tuition Fee | Activity Fee | Transport
  classId: integer("class_id").references(() => classes.id),
  amount: integer("amount").notNull(),
  frequency: text("frequency").default("Monthly"), // Monthly | Quarterly | Annual | One-time
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Fee Payments ─────────────────────────────────────────────────────────────
export const feePayments = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  feeStructureId: integer("fee_structure_id").references(() => feeStructure.id),
  receiptNo: text("receipt_no").notNull(),
  amount: integer("amount").notNull(),
  discount: integer("discount").default(0),
  fine: integer("fine").default(0),
  netAmount: integer("net_amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  dueDate: timestamp("due_date"),
  paymentMode: text("payment_mode").default("Cash"),
  month: text("month"),   // April | May etc
  status: text("status").default("Paid"), // Paid | Pending | Partial
  remark: text("remark"),
  collectedBy: integer("collected_by").references(() => users.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Notices & Circulars ──────────────────────────────────────────────────────
export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetAudience: text("target_audience").default("All"), // All | Students | Staff | Parents
  classId: integer("class_id").references(() => classes.id), // null = all classes
  attachmentUrl: text("attachment_url"),
  isPublished: boolean("is_published").default(true),
  publishDate: timestamp("publish_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Student Remarks (Daily) ──────────────────────────────────────────────────
export const studentRemarks = pgTable("student_remarks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  date: text("date").notNull(),
  remarkType: text("remark_type").default("General"), // General | Behaviour | Academic | Health
  remark: text("remark").notNull(),
  addedBy: integer("added_by").references(() => users.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Health Records ───────────────────────────────────────────────────────────
export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  date: text("date").notNull(),
  height: text("height"),
  weight: text("weight"),
  bmi: text("bmi"),
  bloodPressure: text("blood_pressure"),
  vision: text("vision"),
  dental: text("dental"),
  complaint: text("complaint"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  medicineGiven: text("medicine_given"),
  doctorName: text("doctor_name"),
  referredToHospital: boolean("referred_to_hospital").default(false),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Transport Routes ─────────────────────────────────────────────────────────
export const transportRoutes = pgTable("transport_routes", {
  id: serial("id").primaryKey(),
  routeName: text("route_name").notNull(),
  vehicleNo: text("vehicle_no"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  capacity: integer("capacity"),
  stops: text("stops"),  // JSON string of stops
  monthlyFee: integer("monthly_fee"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  gpsDeviceId: text("gps_device_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Student Transport ────────────────────────────────────────────────────────
export const studentTransport = pgTable("student_transport", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  routeId: integer("route_id").references(() => transportRoutes.id).notNull(),
  pickupStop: text("pickup_stop"),
  dropStop: text("drop_stop"),
  startDate: text("start_date"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Library Books ────────────────────────────────────────────────────────────
export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  isbn: text("isbn"),
  title: text("title").notNull(),
  author: text("author"),
  publisher: text("publisher"),
  edition: text("edition"),
  category: text("category"),
  subject: text("subject"),
  language: text("language").default("English"),
  totalCopies: integer("total_copies").default(1),
  availableCopies: integer("available_copies").default(1),
  price: integer("price"),
  rackNo: text("rack_no"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Library Issues ───────────────────────────────────────────────────────────
export const libraryIssues = pgTable("library_issues", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => libraryBooks.id).notNull(),
  studentId: integer("student_id").references(() => students.id),
  staffId: integer("staff_id").references(() => staff.id),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  returnDate: text("return_date"),
  fine: integer("fine").default(0),
  status: text("status").default("Issued"), // Issued | Returned | Overdue
  adminId: integer("admin_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit"),
  purchasePrice: integer("purchase_price"),
  vendor: text("vendor"),
  location: text("location"),
  branchId: integer("branch_id").references(() => branches.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// ─── Visitors ────────────────────────────────────────────────────────────────
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  purpose: text("purpose"),
  personToMeet: text("person_to_meet"),
  department: text("department"),
  inTime: text("in_time"),
  outTime: text("out_time"),
  date: text("date").notNull(),
  idProof: text("id_proof"),
  photo: text("photo"),
  status: text("status").default("In"), // In | Out
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff Leave ──────────────────────────────────────────────────────────────
export const staffLeave = pgTable("staff_leave", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  leaveType: text("leave_type").notNull(), // Sick | Casual | Annual | Maternity
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  days: integer("days"),
  reason: text("reason"),
  status: text("status").default("Pending"), // Pending | Approved | Rejected
  approvedBy: integer("approved_by").references(() => users.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff Payroll ────────────────────────────────────────────────────────────
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  month: text("month").notNull(),  // 2024-04
  basicSalary: integer("basic_salary").notNull(),
  allowances: integer("allowances").default(0),
  deductions: integer("deductions").default(0),
  netSalary: integer("net_salary").notNull(),
  workingDays: integer("working_days"),
  presentDays: integer("present_days"),
  leaveDays: integer("leave_days").default(0),
  paymentDate: timestamp("payment_date"),
  paymentMode: text("payment_mode"),
  status: text("status").default("Pending"), // Pending | Paid
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Parent-Teacher Communication ────────────────────────────────────────────
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  staffId: integer("staff_id").references(() => staff.id),
  type: text("type").notNull(), // Message | Meeting | Call
  subject: text("subject"),
  message: text("message").notNull(),
  direction: text("direction").default("Outgoing"), // Outgoing | Incoming
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  sentAt: timestamp("sent_at").defaultNow(),
});

// ─── Image Gallery ────────────────────────────────────────────────────────────
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  category: text("category"), // Sports | Annual Day | Classroom | etc
  date: text("date"),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Cloudinary Config (encrypted per admin) ──────────────────────────────────
export const cloudinaryConfigs = pgTable("cloudinary_configs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull().unique(),
  cloudName: text("cloud_name").notNull(),   // AES-256 encrypted
  apiKey: text("api_key").notNull(),         // AES-256 encrypted
  apiSecret: text("api_secret").notNull(),   // AES-256 encrypted
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Income / Expense Transactions ────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),       // Income | Expense
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
  branchId: integer("branch_id").references(() => branches.id),
  adminId: integer("admin_id").references(() => users.id).notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").default(false),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  adminId: integer("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Plans (SuperAdmin) ───────────────────────────────────────────────────────
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  monthlyPrice: integer("monthly_price").notNull().default(0),
  yearlyPrice: integer("yearly_price").notNull().default(0),
  validityDays: integer("validity_days"),
  features: text("features").array().default([]),
  maxStudents: integer("max_students").default(200),
  maxBranches: integer("max_branches").default(1),
  maxStaff: integer("max_staff").default(20),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  razorpayMonthlyPlanId: text("razorpay_monthly_plan_id"),
  razorpayYearlyPlanId: text("razorpay_yearly_plan_id"),
  sortOrder: integer("sort_order").default(0),
  allowedModules: text("allowed_modules").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => plans.id).notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  razorpaySubId: text("razorpay_sub_id"),
  razorpayCustomerId: text("razorpay_customer_id"),
  autoRenew: boolean("auto_renew").default(false),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => plans.id).notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("INR"),
  status: text("status").notNull().default("pending"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  billingCycle: text("billing_cycle"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Automation Credentials ───────────────────────────────────────────────────
export const automationCredentials = pgTable("automation_credentials", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  channel: text("channel").notNull(),
  config: text("config").notNull(),
  enabled: boolean("enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Automation Triggers ──────────────────────────────────────────────────────
export const automationTriggers = pgTable("automation_triggers", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  triggerId: text("trigger_id").notNull(),
  enabled: boolean("enabled").default(false),
  channels: text("channels").array().default([]),
  template: text("template"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Email SMTP Config (encrypted per admin) ──────────────────────────────────
export const emailConfigs = pgTable("email_configs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull().unique(),
  emailUser: text("email_user").notNull(),       // AES-256 encrypted Gmail address
  emailPass: text("email_pass").notNull(),       // AES-256 encrypted App Password
  emailFromName: text("email_from_name").notNull().default(""),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Parent Portal Users ──────────────────────────────────────────────────────
export const parentPortalUsers = pgTable("parent_portal_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fatherName: text("father_name"),
  studentIds: integer("student_ids").array().notNull().default([]),
  isActive: boolean("is_active").default(true),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueEmailAdmin: unique().on(t.email, t.adminId),
}));

// ─── Insert Schemas ───────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, passwordHash: true })
  .extend({ password: z.string().min(6) });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertClassSchema = createInsertSchema(classes).omit({ id: true, createdAt: true });
export const insertSectionSchema = createInsertSchema(sections).omit({ id: true, createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true, createdAt: true });
export const insertPeriodSchema = createInsertSchema(periods).omit({ id: true, createdAt: true });
export const insertHomeworkSchema = createInsertSchema(homework).omit({ id: true, createdAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export const insertExamResultSchema = createInsertSchema(examResults).omit({ id: true, createdAt: true });
export const insertFeeStructureSchema = createInsertSchema(feeStructure).omit({ id: true, createdAt: true });
export const insertFeePaymentSchema = createInsertSchema(feePayments).omit({ id: true, createdAt: true });
export const insertAttendanceSchema = createInsertSchema(studentAttendance).omit({ id: true, createdAt: true });
export const insertStaffAttendanceSchema = createInsertSchema(staffAttendance).omit({ id: true, createdAt: true });
export const insertNoticeSchema = createInsertSchema(notices).omit({ id: true, createdAt: true });
export const insertRemarkSchema = createInsertSchema(studentRemarks).omit({ id: true, createdAt: true });
export const insertHealthSchema = createInsertSchema(healthRecords).omit({ id: true, createdAt: true });
export const insertTransportSchema = createInsertSchema(transportRoutes).omit({ id: true, createdAt: true });
export const insertLibraryBookSchema = createInsertSchema(libraryBooks).omit({ id: true, createdAt: true });
export const insertLibraryIssueSchema = createInsertSchema(libraryIssues).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertVisitorSchema = createInsertSchema(visitors).omit({ id: true, createdAt: true });
export const insertLeaveSchema = createInsertSchema(staffLeave).omit({ id: true, createdAt: true });
export const insertPayrollSchema = createInsertSchema(payroll).omit({ id: true, createdAt: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Types ────────────────────────────────────────────────────────────────────
export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type AcademicYear = typeof academicYears.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type StudentAttendance = typeof studentAttendance.$inferSelect;
export type StaffAttendance = typeof staffAttendance.$inferSelect;
export type Homework = typeof homework.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type ExamResult = typeof examResults.$inferSelect;
export type FeeStructure = typeof feeStructure.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type Notice = typeof notices.$inferSelect;
export type StudentRemark = typeof studentRemarks.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type TransportRoute = typeof transportRoutes.$inferSelect;
export type LibraryBook = typeof libraryBooks.$inferSelect;
export type LibraryIssue = typeof libraryIssues.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type Visitor = typeof visitors.$inferSelect;
export type StaffLeave = typeof staffLeave.$inferSelect;
export type Payroll = typeof payroll.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AutomationCredential = typeof automationCredentials.$inferSelect;
export type AutomationTrigger = typeof automationTriggers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertFeeStructure = z.infer<typeof insertFeeStructureSchema>;
export type InsertFeePayment = z.infer<typeof insertFeePaymentSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertNotice = z.infer<typeof insertNoticeSchema>;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export const insertParentPortalUserSchema = createInsertSchema(parentPortalUsers)
  .omit({ id: true, createdAt: true, passwordHash: true, lastLoginAt: true });

export type ParentPortalUser = typeof parentPortalUsers.$inferSelect;
export type InsertParentPortalUser = z.infer<typeof insertParentPortalUserSchema>;
