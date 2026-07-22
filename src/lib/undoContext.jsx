import { createContext, useCallback, useContext, useState } from "react";

const UndoContext = createContext(null);

// How long the person has to hit "Undo" before the action is actually sent
// to the server. The delete/change is applied optimistically in the UI right
// away, but the real API call is deferred until this window passes.
export const UNDO_WINDOW_MS = 6000;

export function UndoProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // label: text shown in the toast, e.g. `ลบ "DE Chai Colonial Hotel & Spa" แล้ว`
  // onConfirm: async fn that performs the real API call once the window expires
  // onUndo: fn that restores the UI state (usually just re-fetching the list)
  const scheduleAction = useCallback(
    (label, { onConfirm, onUndo }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timer = setTimeout(async () => {
        dismiss(id);
        try {
          await onConfirm();
        } catch (err) {
          console.error("Deferred action failed:", err);
        }
      }, UNDO_WINDOW_MS);
      setToasts((prev) => [...prev, { id, label, timer, onUndo }]);
      return id;
    },
    [dismiss]
  );

  function handleUndo(toast) {
    clearTimeout(toast.timer);
    dismiss(toast.id);
    toast.onUndo?.();
  }

  return (
    <UndoContext.Provider value={{ scheduleAction }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto relative w-full overflow-hidden rounded-lg bg-slate-800 text-white shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm">{t.label}</span>
              <button onClick={() => handleUndo(t)} className="shrink-0 text-sm font-semibold" style={{ color: "#93c5fd" }}>
                เลิกทำ (Undo)
              </button>
            </div>
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-blue-400"
              style={{ animation: `undo-shrink ${UNDO_WINDOW_MS}ms linear forwards` }}
            />
          </div>
        ))}
      </div>
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within an UndoProvider");
  return ctx;
}
