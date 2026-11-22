import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { GALLERY_CATEGORIES, GALLERY_EXHIBITS } from '../../data/festivalData';
import type {
  GalleryCategoryId,
  GalleryExhibit,
  GalleryHotspot,
} from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';
import { GalleryExhibitModel } from './GalleryExhibitModels';

interface GalleryFullscreenModalProps {
  exhibit: GalleryExhibit;
  activeCategory: GalleryCategoryId;
  onChangeCategory: (cat: GalleryCategoryId) => void;
  onSelectExhibit: (exhibit: GalleryExhibit) => void;
  onClose: () => void;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

const DEFAULT_CAM_POS: [number, number, number] = [2.45, 1.55, 3.25];
const DEFAULT_CAM_TARGET: [number, number, number] = [0, 0.58, 0];

const _goalPos = new THREE.Vector3(...DEFAULT_CAM_POS);
const _goalTarget = new THREE.Vector3(...DEFAULT_CAM_TARGET);

function ExhibitionStudioScene({
  exhibit,
  selectedHotspot,
  onSelectHotspot,
  autoRotate,
  exploded,
  resetSignal,
  isSoftwareGl,
  reducedMotion,
  onCanvasReady,
}: {
  exhibit: GalleryExhibit;
  selectedHotspot: GalleryHotspot | null;
  onSelectHotspot: (hs: GalleryHotspot) => void;
  autoRotate: boolean;
  exploded: boolean;
  resetSignal: number;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  onCanvasReady: () => void;
}) {
  const { scene, gl, camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const transitionActiveRef = useRef(false);
  const turntableRef = useRef<THREE.Group>(null);
  const entranceScaleRef = useRef(0.75);
  const dustRef = useRef<THREE.Points>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.88;
    room.dispose();
    pmrem.dispose();
    onCanvasReady();

    return () => {
      env.dispose();
      scene.environment = null;
    };
  }, [gl, scene, onCanvasReady]);

  // Trigger smooth camera move when hotspot or reset signal changes
  useEffect(() => {
    if (selectedHotspot) {
      const [hx, hy, hz] = selectedHotspot.localPosition;
      const [ox, oy, oz] = selectedHotspot.cameraOffset;
      _goalTarget.set(hx, hy, hz);
      _goalPos.set(hx + ox * 0.85, hy + oy * 0.72, hz + oz * 0.85);
    } else {
      _goalTarget.set(...DEFAULT_CAM_TARGET);
      _goalPos.set(...DEFAULT_CAM_POS);
    }
    transitionActiveRef.current = true;
  }, [selectedHotspot, resetSignal, exhibit.id]);

  // Trigger subtle entrance scale whenever switching exhibits
  useEffect(() => {
    if (!reducedMotion) {
      entranceScaleRef.current = 0.72;
    }
  }, [exhibit.id, reducedMotion]);

  // Ambient dust particles
  const dustGeo = useMemo(() => {
    const count = isSoftwareGl ? 60 : 160;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const r = 1.1 + ((i * 37) % 100) * 0.045;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.1 + ((i * 19) % 100) * 0.035;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [isSoftwareGl]);

  useEffect(() => {
    return () => {
      dustGeo.dispose();
    };
  }, [dustGeo]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    entranceScaleRef.current = THREE.MathUtils.damp(
      entranceScaleRef.current,
      1,
      reducedMotion ? 16 : 6,
      dt
    );
    if (turntableRef.current) {
      turntableRef.current.scale.setScalar(entranceScaleRef.current);
    }

    if (dustRef.current && !reducedMotion) {
      dustRef.current.rotation.y += dt * 0.06;
    }

    if (transitionActiveRef.current && controlsRef.current) {
      const speed = reducedMotion ? 18 : 5.5;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _goalPos.x, speed, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _goalPos.y, speed, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _goalPos.z, speed, dt);

      controlsRef.current.target.x = THREE.MathUtils.damp(
        controlsRef.current.target.x,
        _goalTarget.x,
        speed,
        dt
      );
      controlsRef.current.target.y = THREE.MathUtils.damp(
        controlsRef.current.target.y,
        _goalTarget.y,
        speed,
        dt
      );
      controlsRef.current.target.z = THREE.MathUtils.damp(
        controlsRef.current.target.z,
        _goalTarget.z,
        speed,
        dt
      );
      controlsRef.current.update();

      if (
        camera.position.distanceTo(_goalPos) < 0.04 &&
        controlsRef.current.target.distanceTo(_goalTarget) < 0.04
      ) {
        transitionActiveRef.current = false;
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#040714']} />
      <fogExp2 attach="fog" args={['#040714', 0.055]} />

      <hemisphereLight args={[exhibit.accentColor, '#090d24', 0.95]} />
      <directionalLight
        position={[4.5, 7.5, 5.0]}
        intensity={1.95}
        color="#f8fafc"
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={[-5, 3, -4]}
        intensity={1.05}
        color={exhibit.secondaryColor}
      />
      <pointLight
        position={[0, 3.2, 0]}
        intensity={10}
        distance={9}
        decay={2}
        color={exhibit.accentColor}
      />

      {/* Holographic Museum Platform */}
      <group position={[0, -0.18, 0]}>
        <mesh receiveShadow={!isSoftwareGl}>
          <cylinderGeometry args={[1.6, 1.85, 0.22, 48]} />
          <meshStandardMaterial color="#0b132b" metalness={0.92} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.38, 1.48, 64]} />
          <meshBasicMaterial color={exhibit.accentColor} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 0.98, 48]} />
          <meshBasicMaterial color={exhibit.secondaryColor} transparent opacity={0.68} />
        </mesh>
      </group>

      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!isSoftwareGl}>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#050a18" metalness={0.82} roughness={0.28} />
      </mesh>
      <gridHelper args={[18, 24, '#1e3a5f', '#0d152a']} position={[0, -0.29, 0]} />

      <points ref={dustRef} geometry={dustGeo} frustumCulled={false}>
        <pointsMaterial
          size={0.055}
          color={exhibit.accentColor}
          transparent
          opacity={0.68}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Main Exhibition 3D Object */}
      <group ref={turntableRef}>
        <GalleryExhibitModel
          category={exhibit.category}
          accentColor={exhibit.accentColor}
          secondaryColor={exhibit.secondaryColor}
          reducedMotion={reducedMotion}
          explodeAmount={exploded ? 1 : 0}
          hotspots={exhibit.hotspots}
          selectedHotspotId={selectedHotspot?.id ?? null}
          onSelectHotspot={(hs) => {
            nexusAudio.playClick();
            onSelectHotspot(hs);
          }}
          showHotspots
          showHotspotLabels
          isSoftwareGl={isSoftwareGl}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        enableDamping={!isSoftwareGl}
        dampingFactor={0.07}
        enablePan={false}
        autoRotate={autoRotate && !reducedMotion && !selectedHotspot}
        autoRotateSpeed={1.35}
        minDistance={1.7}
        maxDistance={7.5}
        maxPolarAngle={Math.PI / 2 - 0.04}
        onStart={() => {
          transitionActiveRef.current = false;
        }}
      />
    </>
  );
}

export default function GalleryFullscreenModal({
  exhibit,
  activeCategory,
  onChangeCategory,
  onSelectExhibit,
  onClose,
  isSoftwareGl,
  reducedMotion,
}: GalleryFullscreenModalProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<GalleryHotspot | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [showVisualFallback, setShowVisualFallback] = useState(false);
  const [visualError, setVisualError] = useState(false);
  const [studioReady, setStudioReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const filteredExhibits = useMemo(() => {
    if (activeCategory === 'all') return GALLERY_EXHIBITS;
    return GALLERY_EXHIBITS.filter((e) => e.category === activeCategory);
  }, [activeCategory]);

  const activeIdx = Math.max(
    0,
    filteredExhibits.findIndex((e) => e.id === exhibit.id)
  );

  // Reset hotspot & visual error when exhibit changes
  useEffect(() => {
    setSelectedHotspot(null);
    setVisualError(false);
  }, [exhibit.id]);

  const handleStep = useCallback(
    (dir: -1 | 1) => {
      if (filteredExhibits.length === 0) return;
      const next =
        filteredExhibits[
          (activeIdx + dir + filteredExhibits.length) % filteredExhibits.length
        ];
      nexusAudio.playClick();
      onSelectExhibit(next);
    },
    [activeIdx, filteredExhibits, onSelectExhibit]
  );

  const handleResetCamera = useCallback(() => {
    nexusAudio.playClick();
    setSelectedHotspot(null);
    setResetSignal((n) => n + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleStep(1);
      if (e.key === 'ArrowLeft') handleStep(-1);
      if (e.key === 'r' || e.key === 'R') handleResetCamera();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, handleStep, handleResetCamera]);

  return (
    <div
      data-hud
      role="dialog"
      aria-modal="true"
      aria-label={`${exhibit.title} Full-Screen 3D Exhibition`}
      className="fixed inset-0 z-50 flex flex-col bg-[#040714] text-slate-100"
    >
      {/* 3D Viewport or High-Resolution Concept Reference View */}
      <div className="relative flex-1 overflow-hidden">
        {!studioReady && !showVisualFallback && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#040714]">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700"
              style={{ borderTopColor: exhibit.accentColor }}
            />
            <p className="font-mono text-xs tracking-wider text-cyan-300 uppercase">
              Initializing Exhibition Chamber
            </p>
          </div>
        )}

        {showVisualFallback ? (
          <div className="flex h-full w-full items-center justify-center bg-[#030612] p-6 pt-24 pb-28">
            {visualError ? (
              <div className="nexus-panel flex max-w-lg flex-col items-center gap-3 rounded-xl p-8 text-center">
                <ImageIcon className="h-10 w-10 text-cyan-300" />
                <p className="font-display text-lg font-bold text-white">{exhibit.title}</p>
                <p className="text-sm text-slate-300">{exhibit.curatorNote}</p>
              </div>
            ) : (
              <img
                src={exhibit.imageUrl}
                alt={exhibit.title}
                referrerPolicy="no-referrer"
                onError={() => setVisualError(true)}
                className="max-h-full max-w-5xl rounded-xl border border-cyan-400/30 object-contain shadow-2xl"
              />
            )}
          </div>
        ) : (
          <Canvas
            dpr={isSoftwareGl ? 1 : [1, 1.8]}
            shadows={!isSoftwareGl}
            camera={{ position: DEFAULT_CAM_POS, fov: 44 }}
            gl={{
              antialias: !isSoftwareGl,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
            }}
          >
            <ExhibitionStudioScene
              exhibit={exhibit}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={(hs) => {
                setSelectedHotspot(hs);
                setInfoOpen(true);
              }}
              autoRotate={autoRotate}
              exploded={exploded}
              resetSignal={resetSignal}
              isSoftwareGl={isSoftwareGl}
              reducedMotion={reducedMotion}
              onCanvasReady={() => setStudioReady(true)}
            />
          </Canvas>
        )}

        {/* Top Bar: Category Filter Tabs + Exit Full-Screen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-3 p-4 md:px-6">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-cyan-500/25 bg-[#060b1c]/90 p-1">
            {GALLERY_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    nexusAudio.playClick();
                    onChangeCategory(cat.id);
                    if (cat.id !== 'all') {
                      const match = GALLERY_EXHIBITS.find((e) => e.category === cat.id);
                      if (match) onSelectExhibit(match);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-400 font-semibold text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  {cat.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            {!infoOpen && (
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-cyan-400/45 bg-[#060b1c]/92 px-3.5 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-300 cursor-pointer whitespace-nowrap"
              >
                <Eye className="h-3.5 w-3.5" />
                Show Details
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close full-screen exhibition"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 bg-[#060b1c]/92 px-3.5 py-2 text-xs font-semibold text-white hover:border-cyan-400 cursor-pointer whitespace-nowrap"
            >
              <X className="h-4 w-4" />
              Exit Full-Screen
            </button>
          </div>
        </div>

        {/* Left/Bottom Info Panel with Visible Close Button */}
        {infoOpen && (
          <aside className="pointer-events-auto nexus-panel absolute left-4 bottom-24 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-xl p-5 space-y-4 md:left-6 md:top-20 md:bottom-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p
                  className="font-mono text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: exhibit.accentColor }}
                >
                  {exhibit.categoryLabel} · {exhibit.year}
                </p>
                <h3 className="font-display text-lg font-bold text-white leading-snug">
                  {exhibit.title}
                </h3>
                <p className="text-xs text-slate-400">{exhibit.subtitle}</p>
              </div>
              <button
                type="button"
                aria-label="Close exhibition details panel"
                onClick={() => setInfoOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-300">{exhibit.curatorNote}</p>

            {/* Technical Specs */}
            <div className="grid grid-cols-3 gap-2 border-y border-slate-800 py-3">
              {exhibit.specs.map((spec) => (
                <div key={spec.label} className="min-w-0">
                  <p className="text-[10px] text-slate-400 truncate">{spec.label}</p>
                  <p className="font-mono text-[11px] font-semibold text-white truncate tabular-nums">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive Hotspot Selector */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Interactive 3D Hotspots
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exhibit.hotspots.map((hs, idx) => {
                  const active = selectedHotspot?.id === hs.id;
                  return (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => {
                        nexusAudio.playClick();
                        setSelectedHotspot(active ? null : hs);
                      }}
                      className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-emerald-300 bg-emerald-400 font-semibold text-slate-950'
                          : 'border-slate-700 bg-[#040714] text-slate-200 hover:border-cyan-400'
                      }`}
                    >
                      0{idx + 1} · {hs.label}
                    </button>
                  );
                })}
              </div>

              {selectedHotspot && (
                <div className="rounded-lg border border-emerald-400/35 bg-[#040714]/90 p-3 space-y-1">
                  <p className="font-mono text-[10px] text-emerald-300">
                    {selectedHotspot.subsystem} · {selectedHotspot.specs}
                  </p>
                  <p className="text-xs text-slate-300">{selectedHotspot.description}</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Unified Bottom Dock Controls */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="pointer-events-auto nexus-panel flex flex-wrap items-center justify-center gap-2 rounded-xl px-3.5 py-2.5">
            <button
              type="button"
              aria-label="Previous exhibition"
              onClick={() => handleStep(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-400 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs tabular-nums text-slate-300 px-1.5">
              0{activeIdx + 1}/0{filteredExhibits.length}
            </span>
            <button
              type="button"
              aria-label="Next exhibition"
              onClick={() => handleStep(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-400 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="hidden h-5 w-px bg-slate-800 sm:block" />

            <button
              type="button"
              onClick={handleResetCamera}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Camera
            </button>

            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                setExploded((v) => !v);
              }}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                exploded
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950 font-semibold'
                  : 'border-slate-700 text-slate-200 hover:border-cyan-400'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {exploded ? 'Assembled' : 'Exploded'}
            </button>

            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer whitespace-nowrap"
            >
              {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {autoRotate ? 'Pause Spin' : 'Auto-Rotate'}
            </button>

            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                setShowVisualFallback((v) => !v);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer whitespace-nowrap"
            >
              {showVisualFallback ? <EyeOff className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {showVisualFallback ? '3D Model' : 'Concept Plate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
