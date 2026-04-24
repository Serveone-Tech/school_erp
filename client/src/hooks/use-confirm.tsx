import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { description: options } : options;
    return new Promise(resolve => {
      setState({ open: true, options: opts, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const ConfirmDialog = state ? (
    <AlertDialog open={state.open} onOpenChange={open => { if (!open) handleCancel(); }}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{state.options.title ?? "Are you sure?"}</AlertDialogTitle>
          <AlertDialogDescription>{state.options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} className="rounded-xl">
            {state.options.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`rounded-xl ${state.options.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
          >
            {state.options.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirm, ConfirmDialog };
}
