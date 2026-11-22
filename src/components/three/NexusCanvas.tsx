import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  DeviceCapabilities,
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
  WeatherMode,
} from '../../types/festival';
import { SceneEnvironment } from './SceneEnvironment';
import { WeatherSystem } from './WeatherSystem';
import { EnergyCore } from './EnergyCore';
import { MultiverseIslands } from './MultiverseIslands';
import { EventsArc } from './EventsArc';
import { RoboticArmLab, type ArmPoseMode } from './RoboticArmLab';
import { AchievementsTrophy } from './AchievementsTrophy';
import { GalleryWall } from './GalleryWall';
import { ContactBeacon } from './ContactBeacon';
import { CameraRig } from './CameraRig';
import { PortalSystem } from './PortalSystem';
import { CrystalPuzzle3D } from './CrystalPuzzle3D';
import { WalkableController } from './WalkableController';
import { PostProcessingBloom } from './PostProcessingBloom';
import { disposeSharedResources } from '../../utils/resourceCache';

function FpsTelemetrySampler({
  enabled,
  onSample,
}: {
  enabled: boolean;
  onSample: (metrics: PerformanceMetrics) => void;
}) {
  const { gl } = useThree();
  const framesRef = useRef(0);
  const accumRef = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;
    framesRef.current += 1;
    accumRef.current += delta;
    if (accumRef.current >= 0.5) {
      const fps = Math.round(framesRef.current / accumRef.current);
      const frameMs = Number(((accumRef.current / framesRef.current) * 1000).toFixed(1));
      onSample({
        fps,
        frameMs,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
      });
      framesRef.current = 0;
      accumRef.current = 0;
    }
  });

  return null;
}

interface NexusCanvasProps {
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
  navMode: NavigationMode;
  overviewActive: boolean;
  warpPulseRef: React.MutableRefObject<number>;
  touchMoveRef: React.MutableRefObject<{ x: number; y: number }>;
  walkTeleportRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
  } | null>;
  scrollProgressRef: React.MutableRefObject<number>;
  orbitOffsetRef: React.MutableRefObject<{ yaw: number; pitch: number; zoom: number }>;
  activeSectionIndex: number;
  selectedIsland: MultiverseIsland | null;
  onSelectIsland: (island: MultiverseIsland) => void;
  onWarpToIsland: (targetId: IslandId) => void;
  onInteractIsland: (islandId: IslandId) => void;
  islandInteractions: IslandInteractionState;
  selectedEvent: EventTrack | null;
  onSelectEvent: (ev: EventTrack) => void;
  selectedHotspot: LabHotspot | null;
  onSelectHotspot: (hs: LabHotspot) => void;
  armPose: ArmPoseMode;
  activeExhibit: GalleryExhibit;
  activeGalleryCategory: GalleryCategoryId;
  galleryFocusMode: 'overview' | 'center' | 'pedestal';
  selectedGalleryHotspot: GalleryHotspot | null;
  onSelectExhibit: (
    exhibit: GalleryExhibit,
    openLightbox: boolean,
    focusMode?: 'center' | 'pedestal'
  ) => void;
  onSelectGalleryHotspot: (hotspot: GalleryHotspot) => void;
  onCoreActivate: () => void;
  onTrophyClick: () => void;
  onActivatePortal: (portal: PortalDef) => void;
  collectedCrystalIds: string[];
  placedCrystalIds: string[];
  crystalSteps: Record<string, number>;
  puzzleSolved: boolean;
  onCollectCrystal: (id: string) => void;
  onPlaceOrRotateCrystal: (id: string) => void;
  playerTelemetry: PlayerTelemetry;
  onTelemetryUpdate: (telemetry: PlayerTelemetry) => void;
  onInteractNearby: () => void;
  showFps: boolean;
  onSampleFps: (metrics: PerformanceMetrics) => void;
  onSceneReady: () => void;
  onContextLost: () => void;
  inspectZoomActive: boolean;
  weather: WeatherMode;
}

export function NexusCanvas({
  capabilities,
  reducedMotion,
  navMode,
  overviewActive,
  warpPulseRef,
  touchMoveRef,
  walkTeleportRef,
  scrollProgressRef,
  orbitOffsetRef,
  activeSectionIndex,
  selectedIsland,
  onSelectIsland,
  onWarpToIsland,
  onInteractIsland,
  islandInteractions,
  selectedEvent,
  onSelectEvent,
  selectedHotspot,
  onSelectHotspot,
  armPose,
  activeExhibit,
  activeGalleryCategory,
  galleryFocusMode,
  selectedGalleryHotspot,
  onSelectExhibit,
  onSelectGalleryHotspot,
  onCoreActivate,
  onTrophyClick,
  onActivatePortal,
  collectedCrystalIds,
  placedCrystalIds,
  crystalSteps,
  puzzleSolved,
  onCollectCrystal,
  onPlaceOrRotateCrystal,
  playerTelemetry,
  onTelemetryUpdate,
  onInteractNearby,
  showFps,
  onSampleFps,
  onSceneReady,
  onContextLost,
  inspectZoomActive,
  weather,
}: NexusCanvasProps) {
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const intenseFactor = useMemo(() => {
    let intensity = 0.08;
    if (puzzleSolved) intensity += 0.38;
    if (activeSectionIndex === 1 || overviewActive) intensity += 0.24;
    if (islandInteractions.spaceThrusterActive) intensity += 0.26;
    if (islandInteractions.roboticsMode === 'overdrive') intensity += 0.2;
    if (islandInteractions.gamingMode === 'pulse') intensity += 0.16;
    if (weather === 'rain') intensity += 0.14;
    if (playerTelemetry.nearbyPortalId || playerTelemetry.nearbyIslandPortalTarget) {
      intensity += 0.24;
    }
    if (selectedEvent || selectedHotspot || selectedGalleryHotspot) intensity += 0.14;
    if (activeSectionIndex === 5) intensity += 0.12;
    return Math.min(1, intensity);
  }, [
    puzzleSolved,
    activeSectionIndex,
    overviewActive,
    islandInteractions.spaceThrusterActive,
    islandInteractions.roboticsMode,
    islandInteractions.gamingMode,
    weather,
    playerTelemetry.nearbyPortalId,
    playerTelemetry.nearbyIslandPortalTarget,
    selectedEvent,
    selectedHotspot,
    selectedGalleryHotspot,
  ]);

  // Dispose cached geometries/materials when the entire canvas unmounts
  useEffect(() => {
    return () => {
      disposeSharedResources();
    };
  }, []);

  // Global mouse parallax & browse-mode drag orbit tracking
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (navMode === 'browse' && dragStateRef.current.active) {
        const dx = e.clientX - dragStateRef.current.lastX;
        const dy = e.clientY - dragStateRef.current.lastY;
        dragStateRef.current.lastX = e.clientX;
        dragStateRef.current.lastY = e.clientY;

        orbitOffsetRef.current.yaw -= dx * 0.0065;
        orbitOffsetRef.current.pitch = THREE.MathUtils.clamp(
          orbitOffsetRef.current.pitch - dy * 0.005,
          -0.65,
          0.65
        );
      }
    };

    const onPointerUp = () => {
      if (dragStateRef.current.active) {
        dragStateRef.current.active = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [orbitOffsetRef, navMode]);

  return (
    <div
      className={`fixed inset-0 z-0 select-none ${
        navMode === 'walk' ? 'touch-none' : 'touch-pan-y'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={(e) => {
        if (navMode === 'browse') {
          dragStateRef.current.active = true;
          dragStateRef.current.lastX = e.clientX;
          dragStateRef.current.lastY = e.clientY;
          setIsDragging(true);
        }
      }}
      onWheel={(e) => {
        if (navMode === 'browse' && (inspectZoomActive || activeSectionIndex === 5)) {
          orbitOffsetRef.current.zoom = THREE.MathUtils.clamp(
            orbitOffsetRef.current.zoom + e.deltaY * 0.005,
            -4.5,
            6.5
          );
        }
      }}
    >
      <Canvas
        dpr={capabilities.dpr}
        shadows={!capabilities.isSoftwareGl}
        camera={{ fov: 48, near: 0.1, far: 180, position: [0, 2.25, 8.8] }}
        gl={{
          antialias: !capabilities.isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const canvasEl = gl.domElement;
          canvasEl.addEventListener('webglcontextlost', (ev) => {
            ev.preventDefault();
            onContextLost();
          });
          onSceneReady();
        }}
      >
        <Suspense fallback={null}>
          <FpsTelemetrySampler enabled={showFps} onSample={onSampleFps} />

          <SceneEnvironment
            weather={weather}
            particleCount={capabilities.particleCount}
            isSoftwareGl={capabilities.isSoftwareGl}
            reducedMotion={reducedMotion}
            scrollProgressRef={scrollProgressRef}
          />

          <WeatherSystem
            weather={weather}
            isLowPower={capabilities.isLowPower}
            isSoftwareGl={capabilities.isSoftwareGl}
            reducedMotion={reducedMotion}
          />

          <CameraRig
            navMode={navMode}
            overviewActive={overviewActive}
            warpPulseRef={warpPulseRef}
            scrollProgressRef={scrollProgressRef}
            pointerRef={pointerRef}
            orbitOffsetRef={orbitOffsetRef}
            selectedIsland={selectedIsland}
            selectedHotspot={selectedHotspot}
            focusedExhibit={activeExhibit}
            galleryFocusMode={galleryFocusMode}
            selectedGalleryHotspot={selectedGalleryHotspot}
            activeSectionIndex={activeSectionIndex}
            reducedMotion={reducedMotion}
          />

          <WalkableController
            active={navMode === 'walk'}
            touchMoveRef={touchMoveRef}
            walkTeleportRef={walkTeleportRef}
            collectedCrystalIds={collectedCrystalIds}
            onTelemetryUpdate={onTelemetryUpdate}
            onInteractNearby={onInteractNearby}
          />

          {/* Section 1: Hero Core + Crystal Alignment Receptacles */}
          <EnergyCore
            reducedMotion={reducedMotion}
            pointerRef={pointerRef}
            onCoreActivate={onCoreActivate}
            overdriveActive={puzzleSolved}
          />

          {/* Collectible Energy Crystals & Socket Alignment Mini-Game */}
          <CrystalPuzzle3D
            collectedIds={collectedCrystalIds}
            placedIds={placedCrystalIds}
            crystalSteps={crystalSteps}
            puzzleSolved={puzzleSolved}
            onCollectCrystal={onCollectCrystal}
            onPlaceOrRotateCrystal={onPlaceOrRotateCrystal}
            navMode={navMode}
            activeSectionIndex={activeSectionIndex}
            nearbyCrystalId={playerTelemetry.nearbyCrystalId}
            reducedMotion={reducedMotion}
          />

          {/* 5 Interactive 3D Hub Portals */}
          <PortalSystem
            onActivatePortal={onActivatePortal}
            navMode={navMode}
            activeSectionIndex={activeSectionIndex}
            nearbyPortalId={playerTelemetry.nearbyPortalId}
            reducedMotion={reducedMotion}
            intenseFactor={intenseFactor}
            warpPulseRef={warpPulseRef}
          />

          {/* Section 2: 3D Multiverse Archipelago (5 Floating Islands + Sky-Bridges + Portals) */}
          <MultiverseIslands
            selectedIslandId={selectedIsland?.id ?? null}
            onSelectIsland={onSelectIsland}
            onWarpToIsland={onWarpToIsland}
            onInteractIsland={onInteractIsland}
            interactions={islandInteractions}
            reducedMotion={reducedMotion}
            showLabels={activeSectionIndex === 1}
            navMode={navMode}
            nearbyIslandId={playerTelemetry.nearbyIslandId}
            nearbyIslandPortalTarget={playerTelemetry.nearbyIslandPortalTarget}
            intenseFactor={intenseFactor}
            warpPulseRef={warpPulseRef}
          />

          {/* Section 3: Interactive 3D Events Arc */}
          <EventsArc
            selectedEventId={selectedEvent?.id ?? null}
            onSelectEvent={onSelectEvent}
            reducedMotion={reducedMotion}
            isSoftwareGl={capabilities.isSoftwareGl}
            pointerRef={pointerRef}
          />

          {/* Section 4: 3D Innovation Lab Robotic Arm */}
          <RoboticArmLab
            selectedHotspotId={selectedHotspot?.id ?? null}
            onSelectHotspot={onSelectHotspot}
            poseMode={armPose}
            reducedMotion={reducedMotion}
            showLabels={activeSectionIndex === 3}
          />

          {/* Section 5: 3D Achievements Trophy */}
          <AchievementsTrophy
            reducedMotion={reducedMotion}
            onTrophyClick={onTrophyClick}
          />

          {/* Section 6: 3D Technology Exhibition Gallery */}
          <GalleryWall
            activeExhibit={activeExhibit}
            activeCategory={activeGalleryCategory}
            selectedHotspotId={selectedGalleryHotspot?.id ?? null}
            onSelectExhibit={onSelectExhibit}
            onSelectHotspot={onSelectGalleryHotspot}
            isGalleryActive={activeSectionIndex === 5}
            isSoftwareGl={capabilities.isSoftwareGl}
            reducedMotion={reducedMotion}
          />

          {/* Section 7: Contact Beacon */}
          <ContactBeacon reducedMotion={reducedMotion} />

          {/* Post-Processing HDR Bloom Pipeline (disabled on Software WebGL) */}
          <PostProcessingBloom
            isLowPower={capabilities.isLowPower}
            isSoftwareGl={capabilities.isSoftwareGl}
            reducedMotion={reducedMotion}
            warpPulseRef={warpPulseRef}
            intenseFactor={intenseFactor}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
