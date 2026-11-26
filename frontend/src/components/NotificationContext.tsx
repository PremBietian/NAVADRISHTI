import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
}

interface NotificationContextValue {
  notify: (payload: Omit<NotificationItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, tone }: Omit<NotificationItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-3), { id, title, message, tone }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 5000);
    },
    [dismiss]
  );

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0 pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const Icon =
              item.tone === 'success'
                ? CheckCircle2
                : item.tone === 'error'
                ? AlertCircle
                : item.tone === 'warning'
                ? AlertCircle
                : Info;

            const iconTone =
              item.tone === 'success'
                ? 'text-[#A6FF78]'
                : item.tone === 'error'
                ? 'text-rose-400'
                : item.tone === 'warning'
                ? 'text-amber-400'
                : 'text-[#60A5FA]';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#26342C] bg-[#121916]/95 p-4 shadow-2xl backdrop-blur-md"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#F5F7F5]">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#9AA69E]">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-[#9AA69E] transition-colors hover:bg-[#18211C] hover:text-[#F5F7F5]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used inside NotificationProvider');
  }
  return ctx;
}
