import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";

export const CURRENCIES: Record<string, { symbol: string; locale: string; name: string }> = {
  USD: { symbol: "$",    locale: "en-US", name: "US Dollar" },
  INR: { symbol: "₹",   locale: "en-IN", name: "Indian Rupee" },
  EUR: { symbol: "€",   locale: "de-DE", name: "Euro" },
  GBP: { symbol: "£",   locale: "en-GB", name: "British Pound" },
  AED: { symbol: "د.إ", locale: "ar-AE", name: "UAE Dirham" },
  SAR: { symbol: "﷼",   locale: "ar-SA", name: "Saudi Riyal" },
  SGD: { symbol: "S$",  locale: "en-SG", name: "Singapore Dollar" },
  CAD: { symbol: "CA$", locale: "en-CA", name: "Canadian Dollar" },
  AUD: { symbol: "A$",  locale: "en-AU", name: "Australian Dollar" },
  NPR: { symbol: "रू",  locale: "ne-NP", name: "Nepalese Rupee" },
  BDT: { symbol: "৳",   locale: "bn-BD", name: "Bangladeshi Taka" },
};

export function useCurrency() {
  const { data } = useQuery<{ currency: string }>({
    queryKey: ["/api/settings"],
    queryFn: () => apiFetch("/api/settings"),
    staleTime: 5 * 60 * 1000,
  });

  const code = data?.currency || "USD";
  const info = CURRENCIES[code] || CURRENCIES.USD;

  return {
    code,
    symbol: info.symbol,
    name: info.name,
    format: (amount: number) =>
      `${info.symbol}${amount.toLocaleString(info.locale)}`,
  };
}

// Fetches live exchange rate from frankfurter.app (free, no API key needed).
// `from` = the currency prices are stored in (plan prices are stored in INR).
// `to`   = the currency the admin wants to display.
export function useExchangeRate(from: string, to: string) {
  return useQuery<number>({
    queryKey: ["exchange-rate", from, to],
    queryFn: async () => {
      if (from === to) return 1;
      const res = await fetch(
        `/api/settings/exchange-rate?from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!res.ok) return 1;
      const data = await res.json();
      return data.rate ?? 1;
    },
    staleTime: 60 * 60 * 1000,
    placeholderData: 1,
  });
}
