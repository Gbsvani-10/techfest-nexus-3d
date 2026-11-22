import {
  Compass,
  Footprints,
  Globe,
  Orbit,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  CITY_CENTER_Z,
  HUB_PLAZA_RADIUS,
  MULTIVERSE_ISLANDS,
  NEXUS_CRYSTALS,
  PORTALS,
} from '../../data/festivalData';
import type {
  IslandId,
  IslandInteractionState,
  MultiverseIsland,
  NavigationMode,
  PlayerTelemetry,
} from '../../types/festival';
import { SKY_BRIDGES } from '../../utils/multiverseTerrain';
import { nexusAudio } from '../../utils/audioEngine';

interface MultiverseMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIsland: MultiverseIsland | null;
  overviewActive: boolean;
  navMode: NavigationMode;
  playerTelemetry: PlayerTelemetry;
  collectedCrystalIds: string[];
  interactions: IslandInteractionState;
  onSelectIsland: (island: MultiverseIsland) => void;
  onToggleOverview: () => void;
  onWalkToIsland: (islandId: IslandId) => void;
  onInteractIsland: (islandId: IslandId) => void;
}

// Map multiverse coordinates x in [-20, 20], z in [-34, 6] to 320x320 SVG space
function toSvgX(x: number): number {
  return ((x + 20) / 40) * 320;
}
function toSvgY(z: number): number {
  return ((z + 34) / 40) * 320;
}

function getIslandStatusText(islandId: IslandId, interactions: IslandInteractionState): string {
  switch (islandId) {
    case 'robotics':
      return `Actuator: ${interactions.roboticsMode.toUpperCase()}`;
    case 'ai':
      return `Inference Pulses: ${interactions.aiPulseCount}`;
    case 'gaming':
      return `Arena Mode: ${interactions.gamingMode.toUpperCase()}`;
    case 'space':
      return interactions.spaceThrusterActive ? 'Thrusters: FIRING' : 'Thrusters: STANDBY';
    case 'innovation':
      return `CAD Scans: ${interactions.innovationScanCount}`;
  }
}

export function MultiverseMapPanel({
  isOpen,
  onClose,
  selectedIsland,
  overviewActive,
  navMode,
  playerTelemetry,
  collectedCrystalIds,
  interactions,
  onSelectIsland,
  onToggleOverview,
  onWalkToIsland,
  onInteractIsland,
}: MultiverseMapPanelProps) {
  if (!isOpen) return null;

  const px = toSvgX(playerTelemetry.x);
  const py = toSvgY(playerTelemetry.z);
  const rotDeg = (-playerTelemetry.yaw * 180) / Math.PI;

  return (
    <div
      data-hud
      role="dialog"
      aria-modal="true"
      aria-label="3D Multiverse Navigation Map"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:p-6"
    >
      <div className="nexus-panel flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Compass className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Multiverse Navigation Map
              </h2>
              <p className="text-xs text-slate-400">
                Select any floating island to focus camera, teleport in first-person, or trigger live island systems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                onToggleOverview();
                onClose();
              }}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                overviewActive
                  ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-semibold'
                  : 'border-cyan-400/50 bg-slate-900 text-cyan-200 hover:border-cyan-300'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Multiverse Overview</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close multiverse map"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Split: Interactive SVG Map + Island Selection Directory */}
        <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[340px_1fr]">
          {/* Left: Spatial SVG Map */}
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-[#030612] p-2.5">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-auto rounded-lg"
                role="img"
                aria-label="Interactive spatial chart of the 5 floating multiverse islands"
              >
                {/* Core Causeway */}
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(0)}
                  x2={toSvgX(0)}
                  y2={toSvgY(CITY_CENTER_Z)}
                  stroke="rgba(56,189,248,0.28)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Inter-Island Portal Tether Loop */}
                {MULTIVERSE_ISLANDS.map((isl) => {
                  const dest = MULTIVERSE_ISLANDS.find(
                    (i) => i.id === isl.connectedPortalTargetId
                  )!;
                  return (
                    <line
                      key={`tether-${isl.id}`}
                      x1={toSvgX(isl.worldPosition[0])}
                      y1={toSvgY(isl.worldPosition[2])}
                      x2={toSvgX(dest.worldPosition[0])}
                      y2={toSvgY(dest.worldPosition[2])}
                      stroke="rgba(148,163,184,0.22)"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* 5 Walkable Sky-Bridges */}
                {SKY_BRIDGES.map((b) => (
                  <line
                    key={`bridge-${b.islandId}`}
                    x1={toSvgX(b.startX)}
                    y1={toSvgY(b.startZ)}
                    x2={toSvgX(b.endX)}
                    y2={toSvgY(b.endZ)}
                    stroke={b.accentColor}
                    strokeOpacity="0.65"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                ))}

                {/* Central Energy Core */}
                <circle
                  cx={toSvgX(0)}
                  cy={toSvgY(0)}
                  r="14"
                  fill="rgba(56,189,248,0.2)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={toSvgX(0)}
                  y={toSvgY(0) + 24}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  NEXUS CORE
                </text>

                {/* Central Multiverse Hub Plaza */}
                <circle
                  cx={toSvgX(0)}
                  cy={toSvgY(CITY_CENTER_Z)}
                  r={(HUB_PLAZA_RADIUS / 40) * 320}
                  fill="rgba(15,23,42,0.85)"
                  stroke="rgba(56,189,248,0.65)"
                  strokeWidth="1.5"
                />
                <text
                  x={toSvgX(0)}
                  y={toSvgY(CITY_CENTER_Z) + 3}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  HUB PLAZA
                </text>

                {/* Hub Portals */}
                {PORTALS.map((p) => (
                  <rect
                    key={p.id}
                    x={toSvgX(p.worldPosition[0]) - 3.5}
                    y={toSvgY(p.worldPosition[2]) - 3.5}
                    width="7"
                    height="7"
                    rx="1.5"
                    fill={p.accentColor}
                  />
                ))}

                {/* Clickable Floating Islands */}
                {MULTIVERSE_ISLANDS.map((isl) => {
                  const cx = toSvgX(isl.worldPosition[0]);
                  const cy = toSvgY(isl.worldPosition[2]);
                  const r = (isl.deckRadius / 40) * 320;
                  const isSel = selectedIsland?.id === isl.id;
                  const isPlayerHere = playerTelemetry.currentIslandId === isl.id;
                  return (
                    <g
                      key={isl.id}
                      className="cursor-pointer"
                      onClick={() => {
                        nexusAudio.playClick();
                        onSelectIsland(isl);
                        onClose();
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={isSel ? 'rgba(34,211,238,0.22)' : 'rgba(15,23,42,0.9)'}
                        stroke={isl.accentColor}
                        strokeWidth={isSel || isPlayerHere ? '2.5' : '1.5'}
                      />
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="600"
                      >
                        {isl.shortName}
                      </text>
                      <text
                        x={cx}
                        y={cy + 14}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        +{isl.worldPosition[1].toFixed(1)}m
                      </text>
                    </g>
                  );
                })}

                {/* Uncollected Energy Crystals */}
                {NEXUS_CRYSTALS.filter((c) => !collectedCrystalIds.includes(c.id)).map((c) => {
                  const cx = toSvgX(c.worldPosition[0]);
                  const cy = toSvgY(c.worldPosition[2]);
                  return (
                    <polygon
                      key={c.id}
                      points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}`}
                      fill={c.color}
                      stroke="#040714"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Player Position in Walk Mode */}
                {navMode === 'walk' && (
                  <g transform={`translate(${px}, ${py}) rotate(${rotDeg})`}>
                    <polygon points="0,-16 -7,0 7,0" fill="rgba(56,189,248,0.38)" />
                    <circle cx="0" cy="0" r="4.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                  </g>
                )}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Floating Island
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
                Hub Portal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rotate-45 bg-amber-400" />
                Crystal Shard
              </span>
            </div>
          </div>

          {/* Right: 5 Island Directory Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {MULTIVERSE_ISLANDS.map((island) => {
              const isSelected = selectedIsland?.id === island.id;
              const destIsland = MULTIVERSE_ISLANDS.find(
                (i) => i.id === island.connectedPortalTargetId
              )!;

              return (
                <div
                  key={island.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 space-y-3 transition-colors ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: island.accentColor }}
                      >
                        {island.sector}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-slate-400">
                        Elev +{island.worldPosition[1].toFixed(1)}m
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-white">
                      {island.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-300">{island.summary}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-cyan-300">
                        {getIslandStatusText(island.id, interactions)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Orbit className="h-3 w-3 text-cyan-400" />
                        Portal → {destIsland.shortName}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          nexusAudio.playClick();
                          onSelectIsland(island);
                          onClose();
                        }}
                        className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded bg-cyan-400 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Focus Island</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          nexusAudio.playPortalWarp();
                          onWalkToIsland(island.id);
                          onClose();
                        }}
                        className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded border border-cyan-400/45 bg-slate-900 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:border-cyan-300 whitespace-nowrap cursor-pointer"
                      >
                        <Footprints className="h-3.5 w-3.5" />
                        <span>Walk Here</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInteractIsland(island.id)}
                        className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-400 whitespace-nowrap cursor-pointer"
                        title={island.actionLabel}
                      >
                        <Zap className="h-3.5 w-3.5 text-cyan-300" />
                        <span>{island.actionLabel}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
