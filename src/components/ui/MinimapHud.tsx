import { useRef, useState } from 'react';
import { Compass, Footprints, LogOut, Map, Sparkles } from 'lucide-react';
import {
  CITY_CENTER_Z,
  HUB_PLAZA_RADIUS,
  MULTIVERSE_ISLANDS,
  NEXUS_CRYSTALS,
  PORTALS,
} from '../../data/festivalData';
import type { PlayerTelemetry } from '../../types/festival';
import { SKY_BRIDGES } from '../../utils/multiverseTerrain';
import { nexusAudio } from '../../utils/audioEngine';

interface MinimapHudProps {
  telemetry: PlayerTelemetry;
  collectedCrystalIds: string[];
  touchMoveRef: React.MutableRefObject<{ x: number; y: number }>;
  onInteractNearby: () => void;
  onOpenMap: () => void;
  onExitWalkMode: () => void;
}

// Map world coords x in [-20, 20], z in [-34, 6] to 0..160 SVG space
function toMapX(x: number): number {
  return ((x + 20) / 40) * 160;
}
function toMapY(z: number): number {
  return ((z + 34) / 40) * 160;
}

export function MinimapHud({
  telemetry,
  collectedCrystalIds,
  touchMoveRef,
  onInteractNearby,
  onOpenMap,
  onExitWalkMode,
}: MinimapHudProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeTouchRef = useRef(false);

  const currentIsland = MULTIVERSE_ISLANDS.find((i) => i.id === telemetry.currentIslandId);
  const nearbyIsland = MULTIVERSE_ISLANDS.find((i) => i.id === telemetry.nearbyIslandId);
  const portalTargetIsland = MULTIVERSE_ISLANDS.find(
    (i) => i.id === telemetry.nearbyIslandPortalTarget
  );
  const nearbyPortal = PORTALS.find((p) => p.id === telemetry.nearbyPortalId);
  const nearbyCrystal = NEXUS_CRYSTALS.find((c) => c.id === telemetry.nearbyCrystalId);

  const interactLabel = nearbyCrystal
    ? `Collect ${nearbyCrystal.name}`
    : portalTargetIsland
      ? `Portal → ${portalTargetIsland.shortName} Island`
      : nearbyPortal
        ? `Enter ${nearbyPortal.name}`
        : nearbyIsland
          ? nearbyIsland.actionLabel
          : null;

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR && dist > 0) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    // Forward is negative screen Y
    touchMoveRef.current.x = dx / maxR;
    touchMoveRef.current.y = -dy / maxR;
  };

  const resetStick = () => {
    activeTouchRef.current = false;
    setKnob({ x: 0, y: 0 });
    touchMoveRef.current.x = 0;
    touchMoveRef.current.y = 0;
  };

  const px = toMapX(telemetry.x);
  const py = toMapY(telemetry.z);
  const rotDeg = (-telemetry.yaw * 180) / Math.PI;

  return (
    <div
      data-hud
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 pt-20 pb-20 md:p-6 md:pt-20 md:pb-24"
    >
      {/* Top Row: Multiverse Radar + Map & Exit Walk Mode */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto nexus-panel rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300">
              <Compass className="h-3.5 w-3.5" />
              {currentIsland ? `${currentIsland.shortName} Island` : 'Multiverse Hub'}
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {telemetry.x.toFixed(0)}, {telemetry.z.toFixed(0)} · +{telemetry.y.toFixed(1)}m
            </span>
          </div>

          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="rounded-lg border border-slate-800 bg-[#030612]"
          >
            {/* Core Causeway */}
            <line
              x1={toMapX(0)}
              y1={toMapY(0)}
              x2={toMapX(0)}
              y2={toMapY(CITY_CENTER_Z)}
              stroke="rgba(56,189,248,0.28)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Sky-Bridges */}
            {SKY_BRIDGES.map((b) => (
              <line
                key={b.islandId}
                x1={toMapX(b.startX)}
                y1={toMapY(b.startZ)}
                x2={toMapX(b.endX)}
                y2={toMapY(b.endZ)}
                stroke={b.accentColor}
                strokeOpacity="0.55"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
            {/* Central Energy Core Plinth */}
            <circle
              cx={toMapX(0)}
              cy={toMapY(0)}
              r="7.5"
              fill="rgba(56,189,248,0.2)"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            {/* Central Hub Plaza */}
            <circle
              cx={toMapX(0)}
              cy={toMapY(CITY_CENTER_Z)}
              r={(HUB_PLAZA_RADIUS / 40) * 160}
              fill="rgba(15,23,42,0.75)"
              stroke="rgba(56,189,248,0.5)"
              strokeWidth="1"
            />
            {/* 5 Floating Islands */}
            {MULTIVERSE_ISLANDS.map((isl) => (
              <circle
                key={isl.id}
                cx={toMapX(isl.worldPosition[0])}
                cy={toMapY(isl.worldPosition[2])}
                r={(isl.deckRadius / 40) * 160}
                fill={
                  telemetry.currentIslandId === isl.id
                    ? 'rgba(56,189,248,0.22)'
                    : 'rgba(15,23,42,0.85)'
                }
                stroke={isl.accentColor}
                strokeWidth={telemetry.currentIslandId === isl.id ? '1.8' : '1.1'}
              />
            ))}
            {/* 5 Hub Portals */}
            {PORTALS.map((p) => (
              <rect
                key={p.id}
                x={toMapX(p.worldPosition[0]) - 2.5}
                y={toMapY(p.worldPosition[2]) - 2.5}
                width="5"
                height="5"
                rx="1"
                fill={p.accentColor}
              />
            ))}
            {/* Uncollected Crystals */}
            {NEXUS_CRYSTALS.filter((c) => !collectedCrystalIds.includes(c.id)).map((c) => (
              <polygon
                key={c.id}
                points={`${toMapX(c.worldPosition[0])},${toMapY(c.worldPosition[2]) - 4} ${toMapX(c.worldPosition[0]) + 3.5},${toMapY(c.worldPosition[2])} ${toMapX(c.worldPosition[0])},${toMapY(c.worldPosition[2]) + 4} ${toMapX(c.worldPosition[0]) - 3.5},${toMapY(c.worldPosition[2])}`}
                fill={c.color}
              />
            ))}
            {/* Player Position + Facing Cone */}
            <g transform={`translate(${px}, ${py}) rotate(${rotDeg})`}>
              <polygon points="0,-13 -6,0 6,0" fill="rgba(56,189,248,0.34)" />
              <circle cx="0" cy="0" r="3.2" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.5" />
            </g>
          </svg>

          <p className="text-[11px] text-slate-400 leading-tight max-w-[164px]">
            WASD / Stick across sky-bridges · Drag to look · E to interact
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              nexusAudio.playClick();
              onOpenMap();
            }}
            className="nexus-panel inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-400 cursor-pointer"
          >
            <Map className="h-4 w-4 text-cyan-300" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={onExitWalkMode}
            className="nexus-panel inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:border-cyan-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-cyan-300" />
            <span>Exit Walk Mode</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Touch Thumbstick + Proximity Interact Prompt */}
      <div className="flex items-end justify-between gap-4">
        <div
          ref={padRef}
          onPointerDown={(e) => {
            e.stopPropagation();
            activeTouchRef.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            updateStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!activeTouchRef.current) return;
            e.stopPropagation();
            updateStick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            resetStick();
          }}
          onPointerCancel={resetStick}
          aria-label="Touch movement stick"
          className="pointer-events-auto relative flex h-28 w-28 touch-none items-center justify-center rounded-full border border-cyan-400/35 bg-[#060b1c]/80"
        >
          <div className="pointer-events-none absolute inset-3 rounded-full border border-slate-700/70" />
          <div
            className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/90 text-slate-950 shadow-lg"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          >
            <Footprints className="h-4 w-4" />
          </div>
        </div>

        {interactLabel && (
          <button
            type="button"
            onClick={onInteractNearby}
            className="pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-xs font-bold text-slate-950 shadow-xl hover:bg-cyan-300 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{interactLabel}</span>
            <span className="hidden sm:inline font-mono text-[11px] opacity-75">[E]</span>
          </button>
        )}
      </div>
    </div>
  );
}
