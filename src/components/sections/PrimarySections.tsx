import { useState } from 'react';
import {
  ArrowRight,
  Box,
  Calendar,
  CheckCircle2,
  Compass,
  Crosshair,
  Footprints,
  Globe,
  Map,
  MapPin,
  Orbit,
  RotateCcw,
  Sparkles,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  EVENT_TRACKS,
  LAB_HOTSPOTS,
  MULTIVERSE_ISLANDS,
  PORTALS,
} from '../../data/festivalData';
import type {
  EventTrack,
  IslandId,
  IslandInteractionState,
  LabHotspot,
  MultiverseIsland,
  PortalDef,
  SectionId,
} from '../../types/festival';
import type { ArmPoseMode } from '../three/RoboticArmLab';
import { nexusAudio } from '../../utils/audioEngine';

interface PrimarySectionsProps {
  onNavigate: (id: SectionId) => void;
  selectedIsland: MultiverseIsland | null;
  onSelectIsland: (island: MultiverseIsland | null) => void;
  overviewActive: boolean;
  onToggleOverview: () => void;
  onOpenMap: () => void;
  onWarpToIsland: (targetId: IslandId) => void;
  onWalkToIsland: (islandId: IslandId) => void;
  onInteractIsland: (islandId: IslandId) => void;
  islandInteractions: IslandInteractionState;
  selectedEvent: EventTrack | null;
  onSelectEvent: (ev: EventTrack | null) => void;
  selectedHotspot: LabHotspot | null;
  onSelectHotspot: (hs: LabHotspot | null) => void;
  armPose: ArmPoseMode;
  onChangeArmPose: (pose: ArmPoseMode) => void;
  onAdjustZoom: (delta: number) => void;
  onResetOrbit: () => void;
  inspectZoomActive: boolean;
  onToggleInspectZoom: () => void;
  corePulses: number;
  onEnterWalkMode: () => void;
  onActivatePortal: (portal: PortalDef) => void;
  onOpenInspector: () => void;
  onOpenPuzzle: () => void;
}

function getIslandTelemetryStatus(
  islandId: IslandId,
  interactions: IslandInteractionState
): string {
  switch (islandId) {
    case 'robotics':
      return `Actuator Mode: ${interactions.roboticsMode.toUpperCase()}`;
    case 'ai':
      return `Inference Pulses Dispatched: ${interactions.aiPulseCount}`;
    case 'gaming':
      return `Arena Shader: ${interactions.gamingMode.toUpperCase()} · Combo x${interactions.gamingCombo}`;
    case 'space':
      return interactions.spaceThrusterActive
        ? 'Plasma Thrusters: STATIC FIRE ACTIVE'
        : 'Plasma Thrusters: STANDBY';
    case 'innovation':
      return `Holo-CAD Scans Run: ${interactions.innovationScanCount}`;
  }
}

export function PrimarySections({
  onNavigate,
  selectedIsland,
  onSelectIsland,
  overviewActive,
  onToggleOverview,
  onOpenMap,
  onWarpToIsland,
  onWalkToIsland,
  onInteractIsland,
  islandInteractions,
  selectedEvent,
  onSelectEvent,
  selectedHotspot,
  onSelectHotspot,
  armPose,
  onChangeArmPose,
  onAdjustZoom,
  onResetOrbit,
  inspectZoomActive,
  onToggleInspectZoom,
  corePulses,
  onEnterWalkMode,
  onActivatePortal,
  onOpenInspector,
  onOpenPuzzle,
}: PrimarySectionsProps) {
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);

  const toggleRegisterEvent = (id: string) => {
    nexusAudio.playChime(620);
    setRegisteredEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const portalTargetIsland = selectedIsland
    ? MULTIVERSE_ISLANDS.find((i) => i.id === selectedIsland.connectedPortalTargetId) ?? null
    : null;

  return (
    <>
      {/* SECTION 1: CINEMATIC 3D HERO */}
      <section
        id="hero"
        data-section="hero"
        className="pointer-events-none relative flex min-h-screen flex-col justify-end px-5 pb-20 pt-24 md:px-10 md:pb-20"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="pointer-events-auto max-w-xl space-y-4 rounded-xl bg-[#040714]/70 p-5 md:bg-transparent md:p-0">
            <p className="text-xs font-medium tracking-[0.2em] text-cyan-300 uppercase">
              Annual Technology Festival · Nov 28–30, 2026
            </p>
            <h1 className="hero-animate font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl text-balance">
              ENTER THE FUTURE
            </h1>
            <p className="hero-animate text-lg font-medium text-sky-200 md:text-xl">
              Innovate. Build. Inspire.
            </p>
            <p className="hero-animate max-w-md text-sm leading-relaxed text-slate-300">
              Explore a floating 3D multiverse of five interactive islands linked by luminous
              sky-bridges and portals. Move your pointer or drag to inspect the Nexus Core.
            </p>
            <div className="hero-animate flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onNavigate('world');
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
              >
                Explore 3D World
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onNavigate('events');
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-cyan-400/50 bg-[#060b1c]/85 px-5 py-2.5 text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-500/15 whitespace-nowrap cursor-pointer"
              >
                Discover Events
              </button>
              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onToggleOverview();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-700 bg-[#060b1c]/85 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400 whitespace-nowrap cursor-pointer"
              >
                <Globe className="h-4 w-4 text-cyan-300" />
                Multiverse Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onOpenPuzzle();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-700 bg-[#060b1c]/85 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Core Mini-Game
              </button>
            </div>
          </div>

          <div className="pointer-events-auto self-start lg:self-end text-xs text-slate-400">
            <span>Drag canvas to orbit</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>Click 3D core to pulse</span>
            {corePulses > 0 && (
              <>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-cyan-300">
                  Resonance {corePulses}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: 3D MULTIVERSE ARCHIPELAGO */}
      <section
        id="world"
        data-section="world"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between px-5 pb-20 pt-24 md:px-10"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="pointer-events-auto max-w-md space-y-2">
            <p className="text-xs font-medium text-cyan-300">
              01 · 3D Multiverse Archipelago & Portal Network
            </p>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl text-balance">
              3D Exploration Multiverse
            </h2>
            <p className="text-sm text-slate-300">
              Click any floating island to inspect its systems, launch the overview camera, warp
              between island portals, or walk across luminous sky-bridges.
            </p>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                onToggleOverview();
              }}
              aria-pressed={overviewActive}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3.5 py-2.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                overviewActive
                  ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200'
                  : 'border-cyan-400/45 bg-[#060b1c]/90 text-cyan-200 hover:border-cyan-300'
              }`}
            >
              <Globe className="h-4 w-4 text-cyan-300" />
              <span>{overviewActive ? 'Exit Overview' : 'Multiverse Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                onOpenMap();
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-700 bg-[#060b1c]/90 px-3.5 py-2.5 text-xs font-medium text-slate-100 hover:border-cyan-400 whitespace-nowrap cursor-pointer"
            >
              <Map className="h-4 w-4 text-cyan-300" />
              <span>Navigation Map</span>
            </button>

            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                onEnterWalkMode();
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
            >
              <Footprints className="h-4 w-4" />
              <span>Walk Multiverse</span>
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Island Selector Menu & Hub Portals */}
          <div className="pointer-events-auto nexus-panel max-w-xl rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                Floating Islands & Hub Portals
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAdjustZoom(-1.2)}
                  aria-label="Zoom in multiverse"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustZoom(1.2)}
                  aria-label="Zoom out multiverse"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectIsland(null);
                    onResetOrbit();
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded border border-slate-700 px-2.5 text-xs text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Center
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MULTIVERSE_ISLANDS.map((island) => {
                const active = selectedIsland?.id === island.id;
                return (
                  <button
                    key={island.id}
                    type="button"
                    onClick={() => {
                      nexusAudio.playClick();
                      onSelectIsland(active ? null : island);
                    }}
                    className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:border-cyan-400/60'
                    }`}
                  >
                    {island.shortName} Island
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800/80 pt-2.5">
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Orbit className="h-3 w-3 text-cyan-300" />
                Central Hub Portals
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PORTALS.map((portal) => (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => {
                      nexusAudio.playPortalWarp();
                      onActivatePortal(portal);
                    }}
                    className="rounded border border-cyan-400/35 bg-[#040714] px-2.5 py-1 text-[11px] text-cyan-200 hover:border-cyan-300 hover:bg-cyan-500/15 whitespace-nowrap cursor-pointer"
                  >
                    {portal.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Floating Island Command Panel */}
          {selectedIsland && (
            <div className="pointer-events-auto nexus-panel w-full max-w-md rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium" style={{ color: selectedIsland.accentColor }}>
                    {selectedIsland.sector}
                  </p>
                  <h3 className="font-display text-lg font-bold text-white">
                    {selectedIsland.name}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close island details"
                  onClick={() => onSelectIsland(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm leading-relaxed text-slate-300">{selectedIsland.summary}</p>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
                <span>{selectedIsland.capacity}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedIsland.schedule}</span>
              </div>

              <p className="text-xs text-cyan-300">
                Featured System:{' '}
                <span className="text-slate-100">{selectedIsland.featuredDemo}</span>
              </p>

              <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 font-mono text-xs text-cyan-300">
                {getIslandTelemetryStatus(selectedIsland.id, islandInteractions)}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onInteractIsland(selectedIsland.id)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{selectedIsland.actionLabel}</span>
                </button>

                {portalTargetIsland && (
                  <button
                    type="button"
                    onClick={() => {
                      nexusAudio.playPortalWarp();
                      onWarpToIsland(portalTargetIsland.id);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-cyan-400/50 bg-slate-900 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-300 whitespace-nowrap cursor-pointer"
                  >
                    <Orbit className="h-3.5 w-3.5" />
                    <span>Portal → {portalTargetIsland.shortName}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playPortalWarp();
                    onWalkToIsland(selectedIsland.id);
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 whitespace-nowrap cursor-pointer"
                >
                  <Footprints className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Walk Deck</span>
                </button>

                {(selectedIsland.id === 'innovation' || selectedIsland.id === 'robotics') && (
                  <button
                    type="button"
                    onClick={() => {
                      nexusAudio.playClick();
                      onOpenInspector();
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 whitespace-nowrap cursor-pointer"
                  >
                    <Box className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Inspect GLB</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE 3D EVENTS */}
      <section
        id="events"
        data-section="events"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between px-5 pb-20 pt-24 md:px-10"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="pointer-events-auto max-w-md space-y-2">
            <p className="text-xs font-medium text-cyan-300">
              02 · Six Flagship Competition Tracks
            </p>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl text-balance">
              Interactive 3D Events
            </h2>
            <p className="text-sm text-slate-300">
              Hover or click any floating 3D event monolith in the arc—or choose a track below—to
              inspect schedules and reserve a pass.
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto nexus-panel rounded-xl p-3">
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TRACKS.map((ev) => {
                const active = selectedEvent?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      nexusAudio.playChime(460);
                      onSelectEvent(active ? null : ev);
                    }}
                    className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:border-cyan-400/60'
                    }`}
                  >
                    {ev.title}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedEvent && (
            <div className="pointer-events-auto nexus-panel w-full max-w-md rounded-xl p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-cyan-300">
                    {selectedEvent.category} · {selectedEvent.prizeOrFormat}
                  </p>
                  <h3 className="font-display text-xl font-bold text-white">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close event panel"
                  onClick={() => onSelectEvent(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm leading-relaxed text-slate-300">{selectedEvent.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedEvent.dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedEvent.venue}
                </span>
              </div>

              <ul className="space-y-1.5 border-t border-slate-800 pt-3 text-xs text-slate-200">
                {selectedEvent.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-cyan-400" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => toggleRegisterEvent(selectedEvent.id)}
                className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  registeredEventIds.includes(selectedEvent.id)
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                    : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                }`}
              >
                {registeredEventIds.includes(selectedEvent.id) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Track Pass Saved
                  </>
                ) : (
                  'Reserve Track Pass'
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: 3D INNOVATION LAB */}
      <section
        id="lab"
        data-section="lab"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between px-5 pb-20 pt-24 md:px-10"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="pointer-events-auto max-w-md space-y-2">
            <p className="text-xs font-medium text-cyan-300">
              03 · Precision Mechatronics Bay
            </p>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl text-balance">
              3D Innovation Lab
            </h2>
            <p className="text-sm text-slate-300">
              Drag to orbit and zoom the 6-DOF robotic arm. Select any numbered 3D hotspot on the
              manipulator or launch the GLTF/GLB Model Inspector.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              nexusAudio.playClick();
              onOpenInspector();
            }}
            className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 self-start rounded-md bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
          >
            <Box className="h-4 w-4" />
            Open GLTF Model Inspector
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Lab Kinematics & Camera Controls */}
          <div className="pointer-events-auto nexus-panel max-w-lg rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-md bg-slate-900 p-1">
                {(['scan', 'pick', 'calibrate'] as ArmPoseMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      nexusAudio.playClick();
                      onChangeArmPose(mode);
                    }}
                    className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                      armPose === mode
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleInspectZoom}
                  className={`inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs transition-colors cursor-pointer ${
                    inspectZoomActive
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-700 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {inspectZoomActive ? 'Wheel Zoom On' : 'Wheel Zoom'}
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustZoom(-1.1)}
                  aria-label="Zoom in robotic arm"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-cyan-400 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustZoom(1.1)}
                  aria-label="Zoom out robotic arm"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-cyan-400 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectHotspot(null);
                    onResetOrbit();
                  }}
                  aria-label="Reset lab camera"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-300 hover:border-cyan-400 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {LAB_HOTSPOTS.map((hs, idx) => {
                const active = selectedHotspot?.id === hs.id;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => {
                      nexusAudio.playChime(500 + idx * 55);
                      onSelectHotspot(active ? null : hs);
                    }}
                    className={`rounded px-2.5 py-1 text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400/60'
                    }`}
                  >
                    0{idx + 1} · {hs.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hotspot Engineering Inspector */}
          {selectedHotspot && (
            <div className="pointer-events-auto nexus-panel w-full max-w-md rounded-xl p-5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-cyan-300">{selectedHotspot.subsystem}</p>
                  <h3 className="font-display text-lg font-bold text-white">
                    {selectedHotspot.name}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close hotspot inspector"
                  onClick={() => onSelectHotspot(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="font-mono text-xs tabular-nums text-sky-200">
                {selectedHotspot.specs}
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                {selectedHotspot.description}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
