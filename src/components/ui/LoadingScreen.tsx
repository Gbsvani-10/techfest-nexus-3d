import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  sceneReady: boolean;
  onComplete: () => void;
}

export function LoadingScreen({ sceneReady, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (sceneReady) {
          return Math.min(100, prev + 18);
        }
        return prev < 84 ? prev + 6 : prev;
      });
    }, 65);

    return () => window.clearInterval(interval);
  }, [sceneReady]);

  useEffect(() => {
    if (progress >= 100 && sceneReady) {
      setFading(true);
      const timer = window.setTimeout(() => {
        onComplete();
      }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [progress, sceneReady, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040714] px-6 transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-sm space-y-5 text-center">
        <p className="font-display text-xl font-bold tracking-[0.18em] text-slate-100">
          TECHFEST NEXUS
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Initializing 3D environment</span>
          <span className="font-mono tabular-nums text-cyan-300">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
