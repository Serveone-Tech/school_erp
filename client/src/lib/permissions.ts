export type PermAction = "read" | "write" | "delete";

export const MODULES = [
  { key: "students",       label: "Students / Admissions / Remarks / Gallery" },
  { key: "classes",        label: "Classes, Sections & Timetable" },
  { key: "staff",          label: "Staff" },
  { key: "attendance",     label: "Attendance (Student & Staff)" },
  { key: "homework",       label: "Homework" },
  { key: "exams",          label: "Examinations" },
  { key: "notices",        label: "Notice Board" },
  { key: "fees",           label: "Fee Management" },
  { key: "transactions",   label: "Income / Expense" },
  { key: "payroll",        label: "Staff Payroll" },
  { key: "library",        label: "Library" },
  { key: "inventory",      label: "Inventory" },
  { key: "transport",      label: "Transport" },
  { key: "health",         label: "Health Records" },
  { key: "visitors",       label: "Visitors" },
  { key: "communications", label: "Communications & Automation" },
  { key: "reports",        label: "Reports" },
] as const;

export type ModuleKey = typeof MODULES[number]["key"];

/** Check if a permission string (e.g. "students:write") is in the array */
export function hasPerm(permissions: string[], module: string, action: PermAction): boolean {
  if (permissions.includes(`${module}:${action}`)) return true;
  // Legacy: plain module name = read only
  if (action === "read" && permissions.includes(module)) return true;
  return false;
}

/** Build a permissions array from a matrix object */
export function buildPermissionsArray(matrix: Record<string, Record<PermAction, boolean>>): string[] {
  const result: string[] = [];
  for (const [mod, actions] of Object.entries(matrix)) {
    for (const action of ["read", "write", "delete"] as PermAction[]) {
      if (actions[action]) result.push(`${mod}:${action}`);
    }
  }
  return result;
}

/** Parse a permissions array into a matrix */
export function parsePermissionsMatrix(permissions: string[]): Record<string, Record<PermAction, boolean>> {
  const matrix: Record<string, Record<PermAction, boolean>> = {};
  for (const mod of MODULES) {
    matrix[mod.key] = {
      read:   hasPerm(permissions, mod.key, "read"),
      write:  hasPerm(permissions, mod.key, "write"),
      delete: hasPerm(permissions, mod.key, "delete"),
    };
  }
  return matrix;
}

/** Full permissions matrix for admin */
export function fullPermissionsMatrix(): Record<string, Record<PermAction, boolean>> {
  const matrix: Record<string, Record<PermAction, boolean>> = {};
  for (const mod of MODULES) {
    matrix[mod.key] = { read: true, write: true, delete: true };
  }
  return matrix;
}
