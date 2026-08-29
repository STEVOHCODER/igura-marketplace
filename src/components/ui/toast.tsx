"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-right text-sm min-w-[300px]",
              {
                "bg-emerald-600 text-white": t.type === "success",
                "bg-red-600 text-white": t.type === "error",
                "bg-slate-800 text-white": t.type === "info",
              }
            )}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 flex-shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="flex-shrink-0 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
