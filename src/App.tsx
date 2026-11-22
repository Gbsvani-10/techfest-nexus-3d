import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  CITY_CENTER_Z,
  GALLERY_EXHIBITS,
  MULTIVERSE_ISLANDS,
  NEXUS_CRYSTALS,
  PORTALS,
  SECTION_ORDER,
  WEATHER_ORDER,
} from './data/festivalData';
import type {
  EventTrack,
  GalleryCategoryId,
  GalleryExhibit,
  GalleryHotspot,
  IslandId,
  IslandInteractionState,
  LabHotspot,
  MultiverseIsland,
  NavigationMode,
  PerformanceMetrics,
  PlayerTelemetry,
  PortalDef,
  SectionId,
  ToastNotification,
  WeatherMode,
} from './types/festival';
import { detectDeviceCapabilities, prefersReducedMotion } from './utils/webglDetect';
import { nexusAudio } from './utils/audioEngine';
import { NexusCanvas } from './components/three/NexusCanvas';
import type { ArmPoseMode } from './components/three/RoboticArmLab';
import { Navbar } from './components/ui/Navbar';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { FloatingControls } from './components/ui/FloatingControls';
import { WebGLFallback } from './components/ui/WebGLFallback';
import { PrimarySections } from './components/sections/PrimarySections';
import { ShowcaseSections } from './components/sections/ShowcaseSections';
import { MinimapHud } from './components/ui/MinimapHud';
import { ModelInspectorPanel } from './components/ui/ModelInspectorPanel';
import { CrystalPuzzleHud } from './components/ui/CrystalPuzzleHud';
import { FpsMonitor } from './components/ui/FpsMonitor';
import { MultiverseMapPanel } from './components/ui/MultiverseMapPanel';
import { NotificationToast } from './components/ui/NotificationToast';

gsap.registerPlugin(ScrollTrigger);

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function computeIslandSpawnPoint(island: MultiverseIsland) {
  const [wx, wy, wz] = island.worldPosition;
  // Unit vector pointing from island center toward Central Hub [0, 0, -18]
  const toHubX = 0 - wx;
  const toHubZ = CITY_CENTER_Z - wz;
  const len = Math.hypot(toHubX, toHubZ) || 1;
  const ux = toHubX / len;
  const uz = toHubZ / len;
  // Spawn 2.85m from island center along Hub side (clear of center obstacle & deck rim)
  const spawnX = wx + ux * 2.85;
  const spawnZ = wz + uz * 2.85;
  // Face inward toward the island's center landmark: forward = (-sin(yaw), 0, -cos(yaw)) = (-ux, 0, -uz)
  const yaw = Math.atan2(ux, uz);
  return { x: spawnX, y: wy, z: spawnZ, yaw };
}

export default function App() {
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [webglFailed, setWebglFailed] = useState(!capabilities.webglSupported);
  const [sceneReady, setSceneReady] = useState(!capabilities.webglSupported);
  const [loaderDismissed, setLoaderDismissed] = useState(!capabilities.webglSupported);

  const [navMode, setNavMode] = useState<NavigationMode>('browse');
  const [overviewActive, setOverviewActive] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherMode>('clear');
  const [autoWeather, setAutoWeather] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Interactive 3D State across sections & islands
  const [corePulses, setCorePulses] = useState(0);
  const [selectedIsland, setSelectedIsland] = useState<MultiverseIsland | null>(null);
  const [islandInteractions, setIslandInteractions] = useState<IslandInteractionState>({
    roboticsMode: 'sweep',
    aiPulseCount: 0,
    gamingMode: 'tournament',
    gamingCombo: 1,
    spaceThrusterActive: false,
    innovationScanCount: 0,
  });
  const [selectedEvent, setSelectedEvent] = useState<EventTrack | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<LabHotspot | null>(null);
  const [armPose, setArmPose] = useState<ArmPoseMode>('scan');
  const [inspectZoomActive, setInspectZoomActive] = useState(false);
  const [activeExhibit, setActiveExhibit] = useState<GalleryExhibit>(GALLERY_EXHIBITS[0]);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState<GalleryCategoryId>('all');
  const [galleryFocusMode, setGalleryFocusMode] = useState<'overview' | 'center' | 'pedestal'>(
    'overview'
  );
  const [selectedGalleryHotspot, setSelectedGalleryHotspot] = useState<GalleryHotspot | null>(null);
  const [lightboxExhibit, setLightboxExhibit] = useState<GalleryExhibit | null>(null);

  // Inspector, Crystal Mini-Game, Walk Telemetry, FPS Monitor
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [puzzleHudOpen, setPuzzleHudOpen] = useState(false);
  const [collectedCrystalIds, setCollectedCrystalIds] = useState<string[]>([]);
  const [placedCrystalIds, setPlacedCrystalIds] = useState<string[]>([]);
  const [crystalSteps, setCrystalSteps] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    NEXUS_CRYSTALS.forEach((c) => {
      init[c.id] = c.initialStep;
    });
    return init;
  });
  const [puzzleSolved, setPuzzleSolved] = useState(false);

  const [playerTelemetry, setPlayerTelemetry] = useState<PlayerTelemetry>({
    x: 0,
    y: 0,
    z: -13.5,
    yaw: 0,
    currentIslandId: null,
    nearbyIslandId: null,
    nearbyIslandPortalTarget: null,
    nearbyPortalId: null,
    nearbyCrystalId: null,
  });

  const [showFps, setShowFps] = useState(false);
  const [fpsMetrics, setFpsMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameMs: 16.7,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
  });
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const mainRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  const orbitOffsetRef = useRef({ yaw: 0, pitch: 0, zoom: 0 });
  const warpPulseRef = useRef(0);
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const walkTeleportRef = useRef<{
    x: number;
    y: number;
    z: number;
    yaw: number;
  } | null>(null);
  const toastTimersRef = useRef<Record<string, number>>({});
  const solvedIslandIdsRef = useRef<Set<IslandId>>(new Set());
  const islandInteractionsRef = useRef<IslandInteractionState>(islandInteractions);
  islandInteractionsRef.current = islandInteractions;

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current[id];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (payload: Omit<ToastNotification, 'id'>) => {
      const id = `${payload.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { ...payload, id }]);
      toastTimersRef.current[id] = window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Cleanup audio and pending toast timers on unmount
  useEffect(() => {
    return () => {
      nexusAudio.dispose();
      Object.values(toastTimersRef.current).forEach((t) => window.clearTimeout(t));
      toastTimersRef.current = {};
    };
  }, []);

  // Optional dynamic weather auto-cycle every 14 seconds
  useEffect(() => {
    if (!autoWeather) return;
    const timer = window.setInterval(() => {
      setWeather((prev) => {
        const idx = WEATHER_ORDER.indexOf(prev);
        return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
      });
    }, 14000);
    return () => window.clearInterval(timer);
  }, [autoWeather]);

  // Check Crystal Mini-Game Solve Condition
  useEffect(() => {
    if (puzzleSolved) return;
    const allPlaced = NEXUS_CRYSTALS.every((c) => placedCrystalIds.includes(c.id));
    const allAligned = NEXUS_CRYSTALS.every(
      (c) => (crystalSteps[c.id] ?? c.initialStep) === c.targetStep
    );
    if (allPlaced && allAligned) {
      setPuzzleSolved(true);
      setCorePulses((p) => p + 3);
      nexusAudio.playVictoryChord();
      pushToast({
        kind: 'overdrive',
        meta: 'Core Puzzle Solved',
        title: 'Nexus Core Overdrive Active',
        message: 'All three energy crystals phase-locked. Architect badge unlocked.',
        accentColor: '#34d399',
      });
    }
  }, [placedCrystalIds, crystalSteps, puzzleSolved, pushToast]);

  // GSAP ScrollTrigger camera progress & section tracking
  useEffect(() => {
    if (webglFailed) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: mainRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          setShowBackToTop(self.progress > 0.12);
        },
      });

      const sectionEls = gsap.utils.toArray<HTMLElement>('[data-section]');
      sectionEls.forEach((el, idx) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 52%',
          end: 'bottom 52%',
          onEnter: () => setActiveSectionIndex(idx),
          onEnterBack: () => setActiveSectionIndex(idx),
        });
      });
    }, mainRef);

    return () => {
      ctx.revert();
    };
  }, [webglFailed]);

  // Smooth GSAP entrance animation for Hero after loader dismisses
  useEffect(() => {
    if (!loaderDismissed || reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-animate', {
        y: 18,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, mainRef);
    return () => ctx.revert();
  }, [loaderDismissed, reducedMotion]);

  // Refresh GSAP ScrollTrigger whenever returning to browse mode
  useEffect(() => {
    if (navMode === 'browse' && !webglFailed) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [navMode, webglFailed]);

  const handleNavigate = useCallback(
    (id: SectionId) => {
      setNavMode('browse');
      setOverviewActive(false);
      orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      });
    },
    [reducedMotion]
  );

  const handleToggleOverview = useCallback(() => {
    setNavMode('browse');
    setOverviewActive((prev) => {
      const next = !prev;
      if (next) {
        setSelectedIsland(null);
        orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
      }
      return next;
    });
  }, []);

  const handleSelectIsland = useCallback(
    (island: MultiverseIsland | null) => {
      setOverviewActive(false);
      setSelectedIsland(island);
      orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };

      if (island && navMode === 'browse' && activeSectionIndex !== 1) {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          document
            .getElementById('world')
            ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        });
      }
    },
    [navMode, activeSectionIndex, reducedMotion]
  );

  const handleWarpToIsland = useCallback(
    (targetId: IslandId) => {
      const dest = MULTIVERSE_ISLANDS.find((i) => i.id === targetId);
      if (!dest) return;
      warpPulseRef.current = 1.0;

      if (navMode === 'walk') {
        walkTeleportRef.current = computeIslandSpawnPoint(dest);
        setSelectedIsland(dest);
        return;
      }

      setOverviewActive(false);
      setSelectedIsland(dest);
      orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        document
          .getElementById('world')
          ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    },
    [navMode, reducedMotion]
  );

  const handleWalkToIsland = useCallback((islandId: IslandId) => {
    const dest = MULTIVERSE_ISLANDS.find((i) => i.id === islandId);
    if (!dest) return;
    warpPulseRef.current = 0.85;
    walkTeleportRef.current = computeIslandSpawnPoint(dest);
    setOverviewActive(false);
    setSelectedIsland(dest);
    setNavMode('walk');
  }, []);

  const handleInteractIsland = useCallback(
    (islandId: IslandId) => {
      nexusAudio.playChime(islandId === 'space' ? 580 : 660);
      const prev = islandInteractionsRef.current;
      const island = MULTIVERSE_ISLANDS.find((i) => i.id === islandId);
      const accentColor = island?.accentColor ?? '#38bdf8';
      const isFirstSolve = !solvedIslandIdsRef.current.has(islandId);
      if (isFirstSolve) {
        solvedIslandIdsRef.current.add(islandId);
      }
      const solvedCount = solvedIslandIdsRef.current.size;

      let nextState: IslandInteractionState;
      switch (islandId) {
        case 'robotics': {
          const order = ['sweep', 'precision', 'overdrive'] as const;
          const nextMode = order[(order.indexOf(prev.roboticsMode) + 1) % order.length];
          nextState = { ...prev, roboticsMode: nextMode };
          pushToast({
            kind: 'island',
            meta: isFirstSolve
              ? `Island Interaction Solved · ${solvedCount}/5`
              : 'Robotics Island',
            title:
              nextMode === 'overdrive'
                ? 'Actuator Overdrive Engaged'
                : `Actuator Profile: ${nextMode.toUpperCase()}`,
            message: `6-axis servo turret calibrated to ${nextMode} operating profile.`,
            accentColor,
          });
          break;
        }
        case 'ai': {
          const nextPulseCount = prev.aiPulseCount + 1;
          nextState = { ...prev, aiPulseCount: nextPulseCount };
          pushToast({
            kind: 'island',
            meta: isFirstSolve
              ? `Island Interaction Solved · ${solvedCount}/5`
              : 'AI Island',
            title: `Neural Inference Pulse #${nextPulseCount}`,
            message: '3-layer tensor matrix forward pass synchronized across compute nodes.',
            accentColor,
          });
          break;
        }
        case 'gaming': {
          const order = ['tournament', 'pulse', 'stealth'] as const;
          const nextMode = order[(order.indexOf(prev.gamingMode) + 1) % order.length];
          const nextCombo = prev.gamingCombo + 1;
          nextState = { ...prev, gamingMode: nextMode, gamingCombo: nextCombo };
          pushToast({
            kind: 'island',
            meta: isFirstSolve
              ? `Island Interaction Solved · ${solvedCount}/5`
              : 'Gaming Island',
            title: `${nextMode.toUpperCase()} Arena Shader · x${nextCombo}`,
            message: `Esports equalizer monoliths synced to ${nextMode} arena spectrum.`,
            accentColor,
          });
          break;
        }
        case 'space': {
          const nextThruster = !prev.spaceThrusterActive;
          nextState = { ...prev, spaceThrusterActive: nextThruster };
          pushToast({
            kind: 'island',
            meta: isFirstSolve
              ? `Island Interaction Solved · ${solvedCount}/5`
              : 'Space Exploration Island',
            title: nextThruster
              ? 'Cryo-Plasma Thrusters Ignited'
              : 'Launch Thrusters Standby',
            message: nextThruster
              ? 'Static-fire plasma plume and deep-space telemetry lock active.'
              : 'Rocket booster array cooled and returned to launch standby.',
            accentColor,
          });
          break;
        }
        case 'innovation': {
          const nextScanCount = prev.innovationScanCount + 1;
          nextState = { ...prev, innovationScanCount: nextScanCount };
          pushToast({
            kind: 'island',
            meta: isFirstSolve
              ? `Island Interaction Solved · ${solvedCount}/5`
              : 'Innovation Island',
            title: `Holo-CAD Laser Scan #${nextScanCount}`,
            message: 'Gyroscopic prototype prism scanned and structural tolerances verified.',
            accentColor,
          });
          break;
        }
      }

      islandInteractionsRef.current = nextState;
      setIslandInteractions(nextState);
    },
    [pushToast]
  );

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    const result = nexusAudio.setEnabled(next);
    setAudioEnabled(result);
  }, [audioEnabled]);

  const handleChangeWeather = useCallback((mode: WeatherMode) => {
    setAutoWeather(false);
    setWeather(mode);
    nexusAudio.playWeatherShift(mode);
  }, []);

  const handleToggleAutoWeather = useCallback(() => {
    setAutoWeather((prev) => {
      const next = !prev;
      if (next) {
        nexusAudio.playClick();
      }
      return next;
    });
  }, []);

  const handleAdjustZoom = useCallback((delta: number) => {
    orbitOffsetRef.current.zoom = Math.max(
      -4.5,
      Math.min(8.5, orbitOffsetRef.current.zoom + delta)
    );
  }, []);

  const handleResetOrbit = useCallback(() => {
    orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
  }, []);

  const handleSelectExhibit = useCallback(
    (
      exhibit: GalleryExhibit,
      openLightbox: boolean,
      focusMode: 'center' | 'pedestal' = 'center'
    ) => {
      setActiveExhibit(exhibit);
      setGalleryFocusMode(focusMode);
      setSelectedGalleryHotspot(null);
      orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
      if (openLightbox) {
        setLightboxExhibit(exhibit);
      }
    },
    []
  );

  const handleSelectGalleryHotspot = useCallback((hotspot: GalleryHotspot | null) => {
    setSelectedGalleryHotspot(hotspot);
    if (hotspot) {
      setGalleryFocusMode('center');
    }
    orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
  }, []);

  const handleResetGalleryCamera = useCallback(() => {
    setSelectedGalleryHotspot(null);
    setGalleryFocusMode('overview');
    orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
  }, []);

  // Hub Portal Activation with Cinematic Camera Warp
  const handleActivatePortal = useCallback(
    (portal: PortalDef) => {
      warpPulseRef.current = 1.0;
      setOverviewActive(false);
      setNavMode('browse');
      orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };

      if (portal.openInspector) {
        setInspectorOpen(true);
      }

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const target = document.getElementById(portal.targetSection);
        if (target) {
          target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      });
    },
    [reducedMotion]
  );

  // Crystal Mini-Game Interactions
  const handleCollectCrystal = useCallback(
    (id: string) => {
      if (!collectedCrystalIds.includes(id)) {
        const nextCount = collectedCrystalIds.length + 1;
        const crystal = NEXUS_CRYSTALS.find((c) => c.id === id);
        setCollectedCrystalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        if (crystal) {
          pushToast({
            kind: 'crystal',
            meta: `Crystal Collected · ${nextCount}/3`,
            title: crystal.name,
            message:
              nextCount >= 3
                ? 'All 3 crystals acquired! Align them in the Central Energy Core sockets.'
                : 'Socket and phase-align this crystal at the Central Energy Core.',
            accentColor: crystal.color,
          });
        }
      }
      setPuzzleHudOpen(true);
    },
    [collectedCrystalIds, pushToast]
  );

  const handlePlaceOrRotateCrystal = useCallback(
    (id: string) => {
      if (!collectedCrystalIds.includes(id)) return;
      if (!placedCrystalIds.includes(id)) {
        setPlacedCrystalIds((prev) => [...prev, id]);
        nexusAudio.playChime(520);
        return;
      }
      setCrystalSteps((prev) => {
        const nextStep = ((prev[id] ?? 0) + 1) % 8;
        const target = NEXUS_CRYSTALS.find((c) => c.id === id)?.targetStep;
        if (nextStep === target) {
          nexusAudio.playChime(784);
        } else {
          nexusAudio.playClick();
        }
        return { ...prev, [id]: nextStep };
      });
    },
    [collectedCrystalIds, placedCrystalIds]
  );

  // Proximity E / Tap Interact inside Walkable Multiverse
  const handleInteractNearby = useCallback(() => {
    if (playerTelemetry.nearbyCrystalId) {
      nexusAudio.playChime(680);
      handleCollectCrystal(playerTelemetry.nearbyCrystalId);
      return;
    }
    if (playerTelemetry.nearbyIslandPortalTarget) {
      nexusAudio.playPortalWarp();
      handleWarpToIsland(playerTelemetry.nearbyIslandPortalTarget);
      return;
    }
    if (playerTelemetry.nearbyPortalId) {
      const portal = PORTALS.find((p) => p.id === playerTelemetry.nearbyPortalId);
      if (portal) {
        nexusAudio.playPortalWarp();
        handleActivatePortal(portal);
      }
      return;
    }
    if (playerTelemetry.nearbyIslandId) {
      handleInteractIsland(playerTelemetry.nearbyIslandId);
    }
  }, [
    playerTelemetry,
    handleCollectCrystal,
    handleWarpToIsland,
    handleActivatePortal,
    handleInteractIsland,
  ]);

  const activeSectionId = SECTION_ORDER[activeSectionIndex]?.id ?? 'hero';
  const isIntenseScene =
    puzzleSolved ||
    islandInteractions.spaceThrusterActive ||
    islandInteractions.roboticsMode === 'overdrive' ||
    islandInteractions.gamingMode === 'pulse' ||
    Boolean(playerTelemetry.nearbyPortalId) ||
    Boolean(playerTelemetry.nearbyIslandPortalTarget);

  return (
    <div
      data-intense={isIntenseScene ? 'true' : 'false'}
      className="relative min-h-screen bg-[#040714] text-slate-100"
    >
      {!loaderDismissed && (
        <LoadingScreen
          sceneReady={sceneReady}
          onComplete={() => setLoaderDismissed(true)}
        />
      )}

      <Navbar activeSection={activeSectionId} onNavigate={handleNavigate} />

      {webglFailed ? (
        <WebGLFallback onNavigate={handleNavigate} />
      ) : (
        <>
          <CanvasErrorBoundary onError={() => setWebglFailed(true)}>
            <NexusCanvas
              capabilities={capabilities}
              reducedMotion={reducedMotion}
              navMode={navMode}
              overviewActive={overviewActive}
              warpPulseRef={warpPulseRef}
              touchMoveRef={touchMoveRef}
              walkTeleportRef={walkTeleportRef}
              scrollProgressRef={scrollProgressRef}
              orbitOffsetRef={orbitOffsetRef}
              activeSectionIndex={activeSectionIndex}
              selectedIsland={selectedIsland}
              onSelectIsland={handleSelectIsland}
              onWarpToIsland={handleWarpToIsland}
              onInteractIsland={handleInteractIsland}
              islandInteractions={islandInteractions}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={(hs) => setSelectedHotspot(hs)}
              armPose={armPose}
              activeExhibit={activeExhibit}
              activeGalleryCategory={activeGalleryCategory}
              galleryFocusMode={galleryFocusMode}
              selectedGalleryHotspot={selectedGalleryHotspot}
              onSelectExhibit={handleSelectExhibit}
              onSelectGalleryHotspot={(hs) => handleSelectGalleryHotspot(hs)}
              onCoreActivate={() => setCorePulses((p) => p + 1)}
              onTrophyClick={() => setActiveSectionIndex(4)}
              onActivatePortal={handleActivatePortal}
              collectedCrystalIds={collectedCrystalIds}
              placedCrystalIds={placedCrystalIds}
              crystalSteps={crystalSteps}
              puzzleSolved={puzzleSolved}
              onCollectCrystal={handleCollectCrystal}
              onPlaceOrRotateCrystal={handlePlaceOrRotateCrystal}
              playerTelemetry={playerTelemetry}
              onTelemetryUpdate={setPlayerTelemetry}
              onInteractNearby={handleInteractNearby}
              showFps={showFps}
              onSampleFps={setFpsMetrics}
              onSceneReady={() => setSceneReady(true)}
              onContextLost={() => setWebglFailed(true)}
              inspectZoomActive={inspectZoomActive}
              weather={weather}
            />
          </CanvasErrorBoundary>

          {navMode === 'walk' && (
            <MinimapHud
              telemetry={playerTelemetry}
              collectedCrystalIds={collectedCrystalIds}
              touchMoveRef={touchMoveRef}
              onInteractNearby={handleInteractNearby}
              onOpenMap={() => setMapOpen(true)}
              onExitWalkMode={() => setNavMode('browse')}
            />
          )}

          <main
            ref={mainRef}
            className={
              navMode === 'walk' ? 'hidden' : 'relative z-10 pointer-events-none'
            }
          >
            <PrimarySections
              onNavigate={handleNavigate}
              selectedIsland={selectedIsland}
              onSelectIsland={handleSelectIsland}
              overviewActive={overviewActive}
              onToggleOverview={handleToggleOverview}
              onOpenMap={() => setMapOpen(true)}
              onWarpToIsland={handleWarpToIsland}
              onWalkToIsland={handleWalkToIsland}
              onInteractIsland={handleInteractIsland}
              islandInteractions={islandInteractions}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={setSelectedHotspot}
              armPose={armPose}
              onChangeArmPose={setArmPose}
              onAdjustZoom={handleAdjustZoom}
              onResetOrbit={handleResetOrbit}
              inspectZoomActive={inspectZoomActive}
              onToggleInspectZoom={() => setInspectZoomActive((v) => !v)}
              corePulses={corePulses}
              onEnterWalkMode={() => {
                setOverviewActive(false);
                setNavMode('walk');
              }}
              onActivatePortal={handleActivatePortal}
              onOpenInspector={() => setInspectorOpen(true)}
              onOpenPuzzle={() => setPuzzleHudOpen(true)}
            />

            <ShowcaseSections
              activeSectionIndex={activeSectionIndex}
              activeExhibit={activeExhibit}
              activeCategory={activeGalleryCategory}
              onChangeCategory={setActiveGalleryCategory}
              galleryFocusMode={galleryFocusMode}
              onChangeGalleryFocusMode={(mode) => {
                setSelectedGalleryHotspot(null);
                setGalleryFocusMode(mode);
                orbitOffsetRef.current = { yaw: 0, pitch: 0, zoom: 0 };
              }}
              selectedGalleryHotspot={selectedGalleryHotspot}
              onSelectGalleryHotspot={handleSelectGalleryHotspot}
              onResetGalleryCamera={handleResetGalleryCamera}
              onSelectExhibit={handleSelectExhibit}
              lightboxExhibit={lightboxExhibit}
              onCloseLightbox={() => setLightboxExhibit(null)}
              onNavigate={handleNavigate}
              isSoftwareGl={capabilities.isSoftwareGl}
              reducedMotion={reducedMotion}
            />
          </main>

          <MultiverseMapPanel
            isOpen={mapOpen}
            onClose={() => setMapOpen(false)}
            selectedIsland={selectedIsland}
            overviewActive={overviewActive}
            navMode={navMode}
            playerTelemetry={playerTelemetry}
            collectedCrystalIds={collectedCrystalIds}
            interactions={islandInteractions}
            onSelectIsland={(island) => {
              setNavMode('browse');
              handleSelectIsland(island);
            }}
            onToggleOverview={handleToggleOverview}
            onWalkToIsland={handleWalkToIsland}
            onInteractIsland={handleInteractIsland}
          />

          <CrystalPuzzleHud
            isOpen={puzzleHudOpen}
            onClose={() => setPuzzleHudOpen(false)}
            collectedIds={collectedCrystalIds}
            placedIds={placedCrystalIds}
            crystalSteps={crystalSteps}
            puzzleSolved={puzzleSolved}
            onPlaceOrRotate={handlePlaceOrRotateCrystal}
            onNavigate={handleNavigate}
            onEnterWalkMode={() => {
              setPuzzleHudOpen(false);
              setOverviewActive(false);
              setNavMode('walk');
            }}
          />

          <FpsMonitor
            visible={showFps}
            metrics={fpsMetrics}
            isLowPower={capabilities.isLowPower}
            isSoftwareGl={capabilities.isSoftwareGl}
          />

          <ModelInspectorPanel
            isOpen={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            isSoftwareGl={capabilities.isSoftwareGl}
          />

          <FloatingControls
            activeSectionIndex={activeSectionIndex}
            navMode={navMode}
            onToggleNavMode={() => {
              setOverviewActive(false);
              setNavMode((m) => (m === 'browse' ? 'walk' : 'browse'));
            }}
            overviewActive={overviewActive}
            onToggleOverview={handleToggleOverview}
            mapOpen={mapOpen}
            onToggleMap={() => setMapOpen((o) => !o)}
            weather={weather}
            autoWeather={autoWeather}
            onChangeWeather={handleChangeWeather}
            onToggleAutoWeather={handleToggleAutoWeather}
            audioEnabled={audioEnabled}
            onToggleAudio={handleToggleAudio}
            puzzleOpen={puzzleHudOpen}
            onTogglePuzzle={() => setPuzzleHudOpen((o) => !o)}
            collectedCount={collectedCrystalIds.length}
            puzzleSolved={puzzleSolved}
            showFps={showFps}
            onToggleFps={() => setShowFps((f) => !f)}
            onNavigate={handleNavigate}
            showBackToTop={showBackToTop}
          />

          <NotificationToast
            toasts={toasts}
            onDismiss={dismissToast}
            navMode={navMode}
            reducedMotion={reducedMotion}
          />
        </>
      )}
    </div>
  );
}
