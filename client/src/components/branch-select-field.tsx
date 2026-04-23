import { useBranch } from "@/contexts/branch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  className?: string;
}

export function BranchSelectField({ value, onChange, className }: Props) {
  const { branches } = useBranch();
  if (!branches || branches.length === 0) return null;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">Branch</Label>
      <Select
        value={value ? String(value) : "_none"}
        onValueChange={v => onChange(v === "_none" ? null : Number(v))}
      >
        <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Branch" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">No Branch</SelectItem>
          {branches.map((b: any) => (
            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
