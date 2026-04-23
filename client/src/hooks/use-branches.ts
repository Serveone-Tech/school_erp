import { useQuery } from "@tanstack/react-query";

export function useBranches() {
  return useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const r = await fetch("/api/branches", { credentials: "include" });
      return r.json();
    },
  });
}
