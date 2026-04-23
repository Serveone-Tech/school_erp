export function parsePeriodToDateRange(
  period?: string,
  from?: string,
  to?: string
): { from?: Date; to?: Date } {
  if (!period) return {};
  const now = new Date();
  let fromDate: Date | undefined;
  let toDate: Date | undefined = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (period) {
    case "today":
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case "week":
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "15days":
      fromDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "year":
      fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case "custom":
      fromDate = from ? new Date(from) : undefined;
      toDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : undefined;
      break;
    default:
      return {};
  }
  return { from: fromDate, to: toDate };
}
