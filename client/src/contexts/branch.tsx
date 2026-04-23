import { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface BranchContextType {
  branches: any[];
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number | null) => void;
  /** Append to URLs that already have query params: e.g. `/api/students?classId=1${branchParam}` */
  branchParam: string;
  /** Use for URLs with NO existing params: e.g. `/api/staff${branchQuery}` */
  branchQuery: string;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: null,
  setSelectedBranchId: () => {},
  branchParam: "",
  branchQuery: "",
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => { const r = await fetch("/api/branches", { credentials: "include" }); return r.json(); },
  });

  const branchParam = selectedBranchId ? `&branchId=${selectedBranchId}` : "";
  const branchQuery = selectedBranchId ? `?branchId=${selectedBranchId}` : "";

  return (
    <BranchContext.Provider value={{ branches, selectedBranchId, setSelectedBranchId, branchParam, branchQuery }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() { return useContext(BranchContext); }
