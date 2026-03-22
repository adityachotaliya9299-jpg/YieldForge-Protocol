"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";

type ToastType = "success" | "error" | "pending" | "info";
interface Toast { id: string; message: string; type: ToastType; }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const styles: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
    success: { bg:"rgba(0,200,100,0.12)",  border:"rgba(0,200,100,0.3)",  color:"var(--green)",  icon:"✅" },
    error:   { bg:"rgba(248,113,113,0.12)",border:"rgba(248,113,113,0.3)",color:"var(--red)",    icon:"❌" },
    pending: { bg:"rgba(251,191,36,0.12)", border:"rgba(251,191,36,0.3)", color:"var(--yellow)", icon:"⏳" },
    info:    { bg:"rgba(0,201,255,0.12)",  border:"rgba(0,201,255,0.3)",  color:"var(--blue)",   icon:"ℹ" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999, display:"flex", flexDirection:"column", gap:"0.5rem", maxWidth:"340px", width:"calc(100vw - 3rem)" }}>
        {toasts.map(t => {
          const s = styles[t.type];
          return (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:"0.65rem", padding:"0.8rem 1rem", background:s.bg, border:`1px solid ${s.border}`, borderRadius:"12px", backdropFilter:"blur(16px)", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", animation:"slideIn 0.3s ease" }}>
              <span style={{ flexShrink:0 }}>{s.icon}</span>
              <span style={{ flex:1, fontSize:"0.83rem", color:"var(--t1)", lineHeight:1.4 }}>{t.message}</span>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                style={{ background:"none", border:"none", color:"var(--t4)", cursor:"pointer", fontSize:"1rem", padding:0, flexShrink:0 }}>×</button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }`}</style>
    </ToastContext.Provider>
  );
}