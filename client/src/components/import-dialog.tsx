import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { createWorker } from "tesseract.js";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, Image as ImageIcon, Download,
  CheckCircle2, AlertCircle, Loader2, X, ChevronRight
} from "lucide-react";

export interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  sample?: string;
}

interface ImportDialogProps {
  entityName: string;
  fields: FieldDef[];
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; failed: number }>;
  trigger?: React.ReactNode;
}

type Tab = "excel" | "image";

export function ImportDialog({ entityName, fields, onImport, trigger }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("excel");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="rounded-xl gap-2" data-testid="button-import">
            <Upload className="w-4 h-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Import {entityName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setTab("excel")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "excel"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            data-testid="tab-excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel / CSV
          </button>
          <button
            onClick={() => setTab("image")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "image"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            data-testid="tab-image"
          >
            <ImageIcon className="w-4 h-4" />
            Image / Photo
          </button>
        </div>

        {tab === "excel" ? (
          <ExcelImport fields={fields} entityName={entityName} onImport={onImport} onClose={() => setOpen(false)} />
        ) : (
          <ImageImport entityName={entityName} fields={fields} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function downloadTemplate(entityName: string, fields: FieldDef[]) {
  const headers = fields.map(f => f.label);
  const sample = fields.map(f => f.sample ?? "");
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entityName);
  XLSX.writeFile(wb, `${entityName}_template.xlsx`);
}

function autoMap(excelHeaders: string[], fields: FieldDef[]): Record<string, string> {
  const map: Record<string, string> = {};
  fields.forEach(f => {
    const labelLower = f.label.toLowerCase().replace(/[\s*]/g, "");
    const keyLower = f.key.toLowerCase();
    const match = excelHeaders.find(h => {
      const hl = h.toLowerCase().replace(/[\s*]/g, "");
      return hl === labelLower || hl === keyLower || hl.includes(keyLower) || keyLower.includes(hl);
    });
    if (match) map[f.key] = match;
  });
  return map;
}

function ExcelImport({ fields, entityName, onImport, onClose }: {
  fields: FieldDef[];
  entityName: string;
  onImport: ImportDialogProps["onImport"];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) {
          toast({ title: "File is empty", variant: "destructive" });
          return;
        }
        const headers = Object.keys(json[0]);
        setExcelHeaders(headers);
        setRawRows(json);
        setMapping(autoMap(headers, fields));
        setStep("map");
      } catch {
        toast({ title: "Could not read file. Please use .xlsx or .csv format.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const mappedRows = rawRows.map(row => {
    const out: Record<string, string> = {};
    fields.forEach(f => {
      if (mapping[f.key]) out[f.key] = String(row[mapping[f.key]] ?? "");
    });
    return out;
  });

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await onImport(mappedRows);
      setResult(res);
      setStep("done");
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  if (step === "upload") {
    return (
      <div className="space-y-4 py-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
          data-testid="dropzone-excel"
        >
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">Drag & drop your Excel / CSV file here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-3">Supports: .xlsx, .xls, .csv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            data-testid="input-excelFile"
            onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])}
          />
        </div>
        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
          <div>
            <p className="text-sm font-medium">Don't have a template?</p>
            <p className="text-xs text-muted-foreground">Download a pre-formatted Excel template</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => downloadTemplate(entityName, fields)} data-testid="button-downloadTemplate">
            <Download className="w-4 h-4" />
            Template
          </Button>
        </div>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{rawRows.length} rows found in file</p>
            <p className="text-xs text-muted-foreground">Map your Excel columns to the correct fields</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="rounded-xl">
            <X className="w-4 h-4 mr-1" /> Change file
          </Button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {fields.map(field => (
            <div key={field.key} className="flex items-center gap-3">
              <div className="w-36 shrink-0">
                <span className="text-sm font-medium">{field.label}</span>
                {field.required && <span className="text-destructive ml-1 text-xs">*</span>}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select
                value={mapping[field.key] ?? "__none"}
                onValueChange={val => setMapping(prev => ({ ...prev, [field.key]: val === "__none" ? "" : val }))}
              >
                <SelectTrigger className="rounded-xl text-sm flex-1" data-testid={`map-${field.key}`}>
                  <SelectValue placeholder="— skip —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— skip —</SelectItem>
                  {excelHeaders.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setStep("preview")}
          className="w-full rounded-xl"
          data-testid="button-previewImport"
        >
          Preview {rawRows.length} Records
        </Button>
      </div>
    );
  }

  if (step === "preview") {
    const previewRows = mappedRows.slice(0, 5);
    const mappedFields = fields.filter(f => mapping[f.key]);
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Preview (first {previewRows.length} of {rawRows.length} rows)</p>
            <p className="text-xs text-muted-foreground">Review before importing</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("map")} className="rounded-xl">Back</Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                {mappedFields.map(f => (
                  <th key={f.key} className="text-left px-3 py-2 font-semibold text-muted-foreground">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-border/30 hover:bg-accent/20">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  {mappedFields.map(f => (
                    <td key={f.key} className="px-3 py-2 truncate max-w-[120px]">{row[f.key] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rawRows.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">… and {rawRows.length - 5} more rows</p>
        )}

        <Button
          onClick={handleImport}
          className="w-full rounded-xl"
          disabled={isImporting}
          data-testid="button-confirmImport"
        >
          {isImporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
          ) : (
            `Import ${rawRows.length} Records`
          )}
        </Button>
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <div className="py-8 text-center space-y-4">
        {result.success > 0 ? (
          <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
        ) : (
          <AlertCircle className="w-14 h-14 mx-auto text-destructive" />
        )}
        <div>
          <p className="font-display font-bold text-lg">Import Complete</p>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="text-emerald-600 font-semibold">{result.success} records imported</span>
            {result.failed > 0 && <span className="text-destructive font-semibold ml-2">{result.failed} failed</span>}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setStep("upload"); setResult(null); }} className="rounded-xl">Import More</Button>
          <Button onClick={onClose} className="rounded-xl">Done</Button>
        </div>
      </div>
    );
  }

  return null;
}

function ImageImport({ entityName, fields }: { entityName: string; fields: FieldDef[] }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setOcrStatus("loading");
    setOcrText("");
    setProgress(0);

    try {
      const worker = await createWorker("eng+hin", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setOcrText(data.text);
      setOcrStatus("done");
    } catch {
      setOcrStatus("error");
      toast({ title: "Could not read text from image", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        Upload a photo or scanned image of your register/list. We'll extract the text automatically so you can use it to fill in the records.
      </div>

      {!imageUrl ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer border-border hover:border-primary/50 hover:bg-accent/30 transition-colors"
          data-testid="dropzone-image"
        >
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Upload photo or scanned image</p>
          <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WEBP supported</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="input-imageFile"
            onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border/50 max-h-52">
            <img src={imageUrl} alt="Uploaded" className="w-full object-contain max-h-52 bg-muted" />
            <button
              onClick={() => { setImageUrl(null); setOcrStatus("idle"); setOcrText(""); }}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {ocrStatus === "loading" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading text from image... {progress}%
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {ocrStatus === "done" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Extracted Text
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-7 text-xs"
                  onClick={() => { navigator.clipboard.writeText(ocrText); toast({ title: "Copied to clipboard" }); }}
                  data-testid="button-copyOcr"
                >
                  Copy All
                </Button>
              </div>
              <textarea
                readOnly
                value={ocrText}
                className="w-full h-36 text-xs font-mono border border-border/50 rounded-xl p-3 bg-muted/30 resize-none focus:outline-none"
                data-testid="textarea-ocrResult"
              />
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Expected fields for {entityName}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {fields.map(f => (
                    <Badge key={f.key} variant="outline" className="text-xs">
                      {f.label}{f.required ? " *" : ""}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Use the extracted text above to manually fill the Add {entityName} form.</p>
              </div>
            </div>
          )}

          {ocrStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              Could not extract text. Try a clearer image.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
