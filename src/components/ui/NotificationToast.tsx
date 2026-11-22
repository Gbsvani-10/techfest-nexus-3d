import { AnimatePresence, motion } from 'motion/react';
import { Award, CheckCircle2, Sparkles, X } from 'lucide-react';
import type { NavigationMode, ToastNotification } from '../../types/festival';

interface NotificationToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  navMode: NavigationMode;
  reducedMotion: boolean;
}

function ToastIcon({ kind, color }: { kind: ToastNotification['kind']; color: string }) {
  if (kind === 'crystal') {
    return <Sparkles className="h-4 w-4 shrink-0" style={{ color }} />;
  }
  if (kind === 'overdrive') {
    return <Award className="h-4 w-4 shrink-0" style={{ color }} />;
  }
  return <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color }} />;
}

export function NotificationToast({
  toasts,
  onDismiss,
  navMode,
  reducedMotion,
}: NotificationToastProps) {
  return (
    <div
      data-hud
      aria-live="polite"
      aria-atomic="false"
      className={`pointer-events-none fixed right-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 md:right-6 ${
        navMode === 'walk' ? 'bottom-36 md:bottom-36' : 'bottom-20 md:bottom-20'
      }`}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role="status"
            layout={!reducedMotion}
            initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 56 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 56 }}
            transition={{
              duration: reducedMotion ? 0.05 : 0.26,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="pointer-events-auto nexus-panel rounded-xl px-3.5 py-3 shadow-2xl"
            style={{ borderColor: `${toast.accentColor}66` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-[#040714]"
                style={{ borderColor: `${toast.accentColor}55` }}
              >
                <ToastIcon kind={toast.kind} color={toast.accentColor} />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className="font-mono text-[10px] font-semibold tracking-wider uppercase"
                  style={{ color: toast.accentColor }}
                >
                  {toast.meta}
                </p>
                <p className="font-display text-xs font-bold text-white leading-snug">
                  {toast.title}
                </p>
                <p className="text-xs leading-relaxed text-slate-300">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
