import { apiFetch } from "@/lib/queryClient";
// client/src/pages/inventory.tsx
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package, Edit2 } from "lucide-react";


export default function InventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ quantity: 1, branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: items = [], isLoading } = useQuery({ queryKey: ["/api/inventory", selectedBranchId], queryFn: () => apiFetch(`/api/inventory${branchQuery}`) });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/inventory", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, quantity: Number(data.quantity || 0), purchasePrice: Number(data.purchasePrice || 0) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/inventory"] }); toast({ title: "Item added" }); setAddOpen(false); setForm({ quantity: 1 }); },
  });
  const updateQty = useMutation({
    mutationFn: ({ id, quantity }: any) => fetch(`/api/inventory/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/inventory"] }); },
  });

  const filtered = items.filter((i: any) => !search || i.itemName?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-primary" />Inventory</h1><p className="text-sm text-muted-foreground mt-0.5">{items.length} items</p></div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Item</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-9 rounded-xl" />
      </div>
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Item Name","Category","Quantity","Unit","Purchase Price","Location","Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No items found</td></tr>
            : filtered.map((item: any) => (
              <tr key={item.id} className="border-t border-border/40 hover:bg-accent/20">
                <td className="px-4 py-2.5 font-medium">{item.itemName}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{item.category || "General"}</Badge></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateQty.mutate({ id: item.id, quantity: Math.max(0, (item.quantity || 0) - 1) })}>-</Button>
                    <span className={`font-semibold w-8 text-center ${(item.quantity || 0) < 5 ? "text-red-600" : ""}`}>{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => updateQty.mutate({ id: item.id, quantity: (item.quantity || 0) + 1 })}>+</Button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.unit || "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.purchasePrice ? `₹${item.purchasePrice}` : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.location || "—"}</td>
                <td className="px-4 py-2.5">{(item.quantity || 0) < 5 && <Badge className="text-xs bg-red-500 hover:bg-red-500">Low Stock</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Item Name *</Label><Input value={form.itemName || ""} onChange={e => set("itemName", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Category</Label><Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Stationery, Furniture..." className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Quantity *</Label><Input type="number" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Unit</Label><Input value={form.unit || ""} onChange={e => set("unit", e.target.value)} placeholder="Pcs, Box, Kg..." className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Purchase Price (₹)</Label><Input type="number" value={form.purchasePrice || ""} onChange={e => set("purchasePrice", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Location/Vendor</Label><Input value={form.location || ""} onChange={e => set("location", e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.itemName}>{createMutation.isPending ? "Saving..." : "Add Item"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
