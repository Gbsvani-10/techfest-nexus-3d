import { Award, CheckCircle2, RotateCw, Sparkles, X } from 'lucide-react';
import { NEXUS_CRYSTALS } from '../../data/festivalData';
import type { SectionId } from '../../types/festival';

interface CrystalPuzzleHudProps {
  isOpen: boolean;
  onClose: () => void;
  collectedIds: string[];
  placedIds: string[];
  crystalSteps: Record<string, number>;
  puzzleSolved: boolean;
  onPlaceOrRotate: (id: string) => void;
  onNavigate: (id: SectionId) => void;
  onEnterWalkMode: () => void;
}

export function CrystalPuzzleHud({
  isOpen,
  onClose,
  collectedIds,
  placedIds,
  crystalSteps,
  puzzleSolved,
  onPlaceOrRotate,
  onNavigate,
  onEnterWalkMode,
}: CrystalPuzzleHudProps) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto fixed right-4 top-20 z-30 w-[calc(100vw-2rem)] max-w-sm nexus-panel rounded-xl p-4 space-y-3.5 md:right-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-cyan-300">Nexus Core Mini-Game</p>
          <h3 className="font-display text-base font-bold text-white">
            Crystal Phase Alignment
          </h3>
        </div>
        <button
          type="button"
          aria-label="Close crystal puzzle panel"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Collect all 3 energy crystals stationed on the Floating Islands, place them in the Core
        sockets, and rotate each crystal until its phase angle matches its target frequency.
      </p>

      <div className="space-y-2">
        {NEXUS_CRYSTALS.map((crystal) => {
          const collected = collectedIds.includes(crystal.id);
          const placed = placedIds.includes(crystal.id);
          const step = crystalSteps[crystal.id] ?? crystal.initialStep;
          const aligned = placed && step === crystal.targetStep;
          const currentDeg = step * 45;
          const targetDeg = crystal.targetStep * 45;

          return (
            <div
              key={crystal.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#040714]/80 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: crystal.color }}
                  />
                  <span className="truncate font-medium text-white">{crystal.name}</span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
                  {!collected
                    ? 'On Floating Island'
                    : !placed
                      ? 'Collected · Ready to place'
                      : `Phase ${currentDeg}° / Target ${targetDeg}°`}
                </p>
              </div>

              {!collected ? (
                <button
                  type="button"
                  onClick={() => onNavigate('world')}
                  className="shrink-0 rounded border border-slate-700 px-2.5 py-1 text-[11px] text-cyan-300 hover:border-cyan-400 cursor-pointer"
                >
                  Find
                </button>
              ) : aligned ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onPlaceOrRotate(crystal.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-cyan-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
                >
                  {placed ? (
                    <>
                      <RotateCw className="h-3 w-3" />
                      +45°
                    </>
                  ) : (
                    'Place'
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {puzzleSolved ? (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 p-3 space-y-1">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
            <Award className="h-4 w-4" />
            <span>Badge Unlocked: Nexus Core Architect</span>
          </div>
          <p className="text-[11px] text-emerald-100/90">
            All three energy crystals are harmonized. Central Energy Core overdrive is active.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => onNavigate('hero')}
            className="text-xs text-cyan-300 hover:underline cursor-pointer"
          >
            View Core Sockets
          </button>
          <button
            type="button"
            onClick={onEnterWalkMode}
            className="inline-flex items-center gap-1.5 rounded border border-cyan-400/40 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-500/10 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            Walk to Collect
          </button>
        </div>
      )}
    </div>
  );
}
