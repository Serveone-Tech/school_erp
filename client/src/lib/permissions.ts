export type PermAction = "read" | "write" | "delete";

export const MODULES = [
  { key: "leads",          label: "Enquiries",          nav: "/leads" },
  { key: "students",       label: "Students",            nav: "/students" },
  { key: "teachers",       label: "Teachers",            nav: "/teachers" },
  { key: "courses",        label: "Courses & Batches",   nav: "/courses" },
  { key: "fees",           label: "Fees & Payments",     nav: "/fees" },
  // { key: "assignments",    label: "Assignments",          nav: "/assignments" },
  // { key: "exams",          label: "Exams",               nav: "/exams" },
  { key: "inventory",      label: "Inventory",           nav: "/inventory" },
  { key: "transactions",   label: "Income / Expense",    nav: "/transactions" },
  { key: "communications", label: "Communications",      nav: "/communications" },
  { key: "reports",        label: "Reports",             nav: "/reports" },
  { key: "report-card",       label: "Report Card",            nav: "/report-card" },
] as const;

export type ModuleKey = typeof MODULES[number]["key"];

/** Check if a permission string (e.g. "leads:write") is in the array */
export function hasPerm(permissions: string[], module: string, action: PermAction): boolean {
  // Support legacy flat format ("leads") as read-only
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
