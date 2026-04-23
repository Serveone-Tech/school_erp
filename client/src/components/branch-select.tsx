import { useBranches } from "@/hooks/use-branches";
import { useAuth } from "@/contexts/auth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BranchSelectProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export function BranchSelect({ value, onChange, required }: BranchSelectProps) {
  const { user } = useAuth();
  const { data: branches = [] } = useBranches();
  const isAdmin = user?.role === "admin";

  if (!isAdmin && user?.branchId) {
    const myBranch = branches.find((b: any) => b.id === user.branchId);
    if (myBranch && !value) {
      setTimeout(() => onChange(String(user.branchId)), 0);
    }
    return (
      <div className="space-y-2">
        <Label>Branch</Label>
        <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {myBranch?.name || "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Branch {required && isAdmin ? "*" : ""}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-xl" data-testid="select-branch">
          <SelectValue placeholder="Select branch..." />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="none">No Specific Branch</SelectItem>}
          {branches.map((branch: any) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function parseBranchId(val: string): number | null {
  if (!val || val === "none") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}
