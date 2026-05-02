import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard } from "lucide-react";
import { useCurrency } from "@/contexts/currency";

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-red-100 text-red-700",
  Partial: "bg-yellow-100 text-yellow-700",
};

export default function ParentFeesPage() {
  const currency = useCurrency();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/parent/fees"],
    queryFn: async () => {
      const res = await fetch("/api/parent/fees", { credentials: "include" });
      return res.json();
    },
  });

  const payments: any[] = data?.payments ?? [];
  const structures: any[] = data?.structures ?? [];
  const totalPaid: number = data?.summary?.totalPaid ?? 0;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-blue-600" /> Fees
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {currency.format(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Payment Records</p>
            <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee structures (pending fees) */}
      {structures.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fee Structure</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {structures.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.frequency}</p>
                  </div>
                  <p className="font-semibold text-primary">{currency.format(s.amount ?? 0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment History</CardTitle>
        </CardHeader>
        {payments.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">No payments found</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {payments.map((p: any) => (
                <div key={p.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium">Receipt #{p.receiptNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.month && `${p.month} · `}{p.paymentMode ?? "Cash"}
                        {p.paymentDate && ` · ${new Date(p.paymentDate).toLocaleDateString("en-IN")}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{currency.format(p.netAmount ?? 0)}</p>
                      <Badge className={`text-[10px] ${STATUS_COLORS[p.status ?? "Paid"] ?? ""}`}>
                        {p.status ?? "Paid"}
                      </Badge>
                    </div>
                  </div>
                  {(p.discount > 0 || p.fine > 0) && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {p.discount > 0 && <span className="text-green-600">Discount: {currency.format(p.discount)}</span>}
                      {p.fine > 0 && <span className="text-red-500">Fine: {currency.format(p.fine)}</span>}
                    </div>
                  )}
                  {p.remark && <p className="text-xs text-muted-foreground mt-1">{p.remark}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
