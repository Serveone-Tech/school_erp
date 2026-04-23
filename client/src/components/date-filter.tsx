import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const PERIOD_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "15 Days", value: "15days" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "custom" },
];

export interface DateFilterValue {
  period: string;
  from: string;
  to: string;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const selectValue = value.period || "all";

  const handlePeriodChange = (period: string) => {
    if (period === "all") {
      onChange({ period: "", from: "", to: "" });
    } else if (period !== "custom") {
      onChange({ period, from: "", to: "" });
    } else {
      onChange({ period: "custom", from: value.from, to: value.to });
    }
  };

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className || ""}`}>
      <Select value={selectValue} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-8 text-xs w-44 rounded-xl gap-1" data-testid="select-period-filter">
          <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.period === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={value.from}
              onChange={e => onChange({ ...value, from: e.target.value })}
              className="h-8 text-xs w-36 rounded-xl"
              data-testid="input-filter-from"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={value.to}
              onChange={e => onChange({ ...value, to: e.target.value })}
              className="h-8 text-xs w-36 rounded-xl"
              data-testid="input-filter-to"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function buildApiParams(filter: DateFilterValue, extra?: Record<string, string>): string {
  const p: Record<string, string> = {};
  if (filter.period && filter.period !== "all") {
    p.period = filter.period;
    if (filter.period === "custom") {
      if (filter.from) p.from = filter.from;
      if (filter.to) p.to = filter.to;
    }
  }
  if (extra) Object.assign(p, extra);
  const qs = new URLSearchParams(p).toString();
  return qs ? `?${qs}` : "";
}

export function filterFromSearch(searchString: string): DateFilterValue {
  const params = new URLSearchParams(searchString.startsWith("?") ? searchString.slice(1) : searchString);
  return {
    period: params.get("period") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export function filterToNavQuery(filter: DateFilterValue): string {
  const p: Record<string, string> = {};
  if (filter.period && filter.period !== "all") {
    p.period = filter.period;
    if (filter.period === "custom") {
      if (filter.from) p.from = filter.from;
      if (filter.to) p.to = filter.to;
    }
  }
  const qs = new URLSearchParams(p).toString();
  return qs ? `?${qs}` : "";
}
