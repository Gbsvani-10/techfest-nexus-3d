import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GALLERY_EXHIBITS } from '../../data/festivalData';
import type {
  GalleryCategoryId,
  GalleryExhibit,
  GalleryHotspot,
} from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';
import { GalleryExhibitModel } from './GalleryExhibitModels';

interface GalleryWallProps {
  activeExhibit: GalleryExhibit;
  activeCategory: GalleryCategoryId;
  selectedHotspotId: string | null;
  onSelectExhibit: (
    exhibit: GalleryExhibit,
    openLightbox: boolean,
    focusMode?: 'center' | 'pedestal'
  ) => void;
  onSelectHotspot: (hotspot: GalleryHotspot) => void;
  isGalleryActive: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

const GALLERY_CENTER_Z = -98;

export function GalleryWall({
  activeExhibit,
  activeCategory,
  selectedHotspotId,
  onSelectExhibit,
  onSelectHotspot,
  isGalleryActive,
  isSoftwareGl,
  reducedMotion,
}: GalleryWallProps) {
  const { gl } = useThree();
  const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const centralTurntableRef = useRef<THREE.Group>(null);
  const centralHoloRingARef = useRef<THREE.Mesh>(null);
  const centralHoloRingBRef = useRef<THREE.Mesh>(null);
  const crownRingRef = useRef<THREE.Mesh>(null);
  const galleryDustRef = useRef<THREE.Points>(null);
  const entranceScaleRef = useRef(0.72);
  const pedestalRefs = useRef<(THREE.Group | null)[]>([]);
  const prevExhibitIdRef = useRef(activeExhibit.id);

  // Trigger smooth 3D entrance pulse whenever entering gallery or switching active exhibit
  useEffect(() => {
    if (prevExhibitIdRef.current !== activeExhibit.id) {
      prevExhibitIdRef.current = activeExhibit.id;
      if (!reducedMotion) {
        entranceScaleRef.current = 0.62;
      }
    }
  }, [activeExhibit.id, reducedMotion]);

  useEffect(() => {
    if (isGalleryActive && !reducedMotion) {
      entranceScaleRef.current = 0.68;
    }
  }, [isGalleryActive, reducedMotion]);

  // Load exhibition reference textures for the curved holographic backdrops
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let mounted = true;
    const loaded: THREE.Texture[] = [];
    const maxAniso = isSoftwareGl ? 1 : Math.min(gl.capabilities.getMaxAnisotropy(), 8);

    GALLERY_EXHIBITS.forEach((exhibit) => {
      loader.load(
        exhibit.imageUrl,
        (tex) => {
          if (!mounted) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          tex.needsUpdate = true;
          loaded.push(tex);
          setTextures((prev) => ({ ...prev, [exhibit.id]: tex }));
        },
        undefined,
        () => {
          // Graceful fallback material used automatically when texture is unavailable
        }
      );
    });

    return () => {
      mounted = false;
      loaded.forEach((t) => t.dispose());
    };
  }, [gl, isSoftwareGl]);

  // Dedicated ambient particle field swirling within the 3D Gallery Rotunda
  const galleryParticlesGeo = useMemo(() => {
    const count = isSoftwareGl ? 70 : 180;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#38bdf8'),
      new THREE.Color('#22d3ee'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#60a5fa'),
    ];
    for (let i = 0; i < count; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const r = 1.6 + ((i * 29) % 100) * 0.085;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.6 + ((i * 17) % 100) * 0.048;
      pos[i * 3 + 2] = GALLERY_CENTER_Z + Math.sin(a) * r;
      const c = palette[i % palette.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, [isSoftwareGl]);

  useEffect(() => {
    return () => {
      galleryParticlesGeo.dispose();
    };
  }, [galleryParticlesGeo]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // Smooth 3D entrance scale damping for Central Holographic Platform
    const targetScale = 1;
    entranceScaleRef.current = THREE.MathUtils.damp(
      entranceScaleRef.current,
      targetScale,
      reducedMotion ? 16 : 5.5,
      dt
    );

    if (centralTurntableRef.current) {
      centralTurntableRef.current.scale.setScalar(entranceScaleRef.current);
      if (!reducedMotion) {
        centralTurntableRef.current.rotation.y += dt * 0.28;
      }
    }

    if (!reducedMotion) {
      if (centralHoloRingARef.current) {
        centralHoloRingARef.current.rotation.z = t * 0.45;
      }
      if (centralHoloRingBRef.current) {
        centralHoloRingBRef.current.rotation.z = -t * 0.35;
      }
      if (crownRingRef.current) {
        crownRingRef.current.rotation.z = t * 0.14;
      }
      if (galleryDustRef.current) {
        galleryDustRef.current.rotation.y = t * 0.04;
      }

      // Gentle levitation for the 6 outer exhibition pedestals
      pedestalRefs.current.forEach((grp, idx) => {
        if (!grp) return;
        const exhibit = GALLERY_EXHIBITS[idx];
        if (!exhibit) return;
        grp.position.y = exhibit.position[1] + Math.sin(t * 1.15 + idx * 0.9) * 0.08;
      });
    }
  });

  return (
    <group>
      {/* Exhibition Rotunda Deck & Concentric Neon Rings */}
      <mesh
        position={[0, 0.02, GALLERY_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={!isSoftwareGl}
      >
        <circleGeometry args={[10.8, 48]} />
        <meshStandardMaterial
          color="#060c1f"
          metalness={0.86}
          roughness={0.22}
          envMapIntensity={0.85}
        />
      </mesh>

      <mesh position={[0, 0.032, GALLERY_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.7, 64]} />
        <meshBasicMaterial
          color={activeExhibit.accentColor}
          transparent
          opacity={0.78}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh position={[0, 0.032, GALLERY_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.4, 5.5, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.38}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh position={[0, 0.032, GALLERY_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.8, 8.95, 64]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.44}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* Architectural Light Pylons & Overhead Museum Crown */}
      {[-3, -2, -1, 1, 2, 3].map((slot, idx) => {
        const angle = slot * 0.42;
        const px = Math.sin(angle) * 9.6;
        const pz = GALLERY_CENTER_Z - Math.cos(angle) * 9.6 + 1.5;
        return (
          <group key={idx} position={[px, 0, pz]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 2.9, 0]}>
              <boxGeometry args={[0.24, 5.8, 0.34]} />
              <meshStandardMaterial color="#0b132b" metalness={0.9} roughness={0.22} />
            </mesh>
            <mesh position={[0, 2.9, 0.18]}>
              <boxGeometry args={[0.06, 5.1, 0.03]} />
              <meshBasicMaterial color={idx % 2 === 0 ? '#38bdf8' : '#a78bfa'} />
            </mesh>
          </group>
        );
      })}

      <mesh
        ref={crownRingRef}
        position={[0, 6.2, GALLERY_CENTER_Z - 0.5]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[7.2, 0.05, 12, 72]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.25}
        />
      </mesh>

      {/* Subtle Swirling Exhibition Dust */}
      <points ref={galleryDustRef} geometry={galleryParticlesGeo} frustumCulled={false}>
        <pointsMaterial
          size={0.095}
          vertexColors
          transparent
          opacity={0.78}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* CENTRAL HOLOGRAPHIC EXHIBITION PLATFORM */}
      <group position={[0, 0.04, GALLERY_CENTER_Z + 0.6]}>
        {/* Stepped Metallic Turntable Base */}
        <mesh position={[0, 0.14, 0]} receiveShadow={!isSoftwareGl} castShadow={!isSoftwareGl}>
          <cylinderGeometry args={[2.15, 2.45, 0.28, 32]} />
          <meshStandardMaterial color="#0b132b" metalness={0.9} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.34, 0]} receiveShadow={!isSoftwareGl}>
          <cylinderGeometry args={[1.65, 1.85, 0.14, 32]} />
          <meshStandardMaterial color="#16213e" metalness={0.92} roughness={0.18} />
        </mesh>

        {/* Counter-Rotating Holographic Projection Emitter Rings */}
        <mesh ref={centralHoloRingARef} position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.58, 48]} />
          <meshBasicMaterial color={activeExhibit.accentColor} transparent opacity={0.9} />
        </mesh>
        <mesh ref={centralHoloRingBRef} position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.12, 32, 1, 0, Math.PI * 1.4]} />
          <meshBasicMaterial color={activeExhibit.secondaryColor} transparent opacity={0.78} />
        </mesh>

        {/* Translucent Volumetric Projection Cone */}
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[2.1, 1.4, 2.1, 32, 1, true]} />
          <meshBasicMaterial
            color={activeExhibit.accentColor}
            transparent
            opacity={0.055}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Studio Overhead Accent Light on Centerpiece */}
        <pointLight
          position={[0, 3.6, 0.6]}
          intensity={14}
          distance={12}
          decay={2}
          color={activeExhibit.accentColor}
        />

        {/* Selected Hero 3D Model on Central Holographic Turntable */}
        <group
          ref={centralTurntableRef}
          position={[0, 0.45, 0]}
          onClick={(e) => {
            e.stopPropagation();
            nexusAudio.playClick();
            onSelectExhibit(activeExhibit, false, 'center');
          }}
        >
          <group scale={1.38}>
            <GalleryExhibitModel
              category={activeExhibit.category}
              accentColor={activeExhibit.accentColor}
              secondaryColor={activeExhibit.secondaryColor}
              reducedMotion={reducedMotion}
              hotspots={activeExhibit.hotspots}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={onSelectHotspot}
              showHotspots={isGalleryActive}
              showHotspotLabels={isGalleryActive}
              isSoftwareGl={isSoftwareGl}
            />
          </group>
        </group>

        {/* Centerpiece Museum Placard */}
        {isGalleryActive && (
          <Html position={[0, 0.14, 2.38]} center distanceFactor={8}>
            <button
              type="button"
              onClick={() => {
                nexusAudio.playClick();
                onSelectExhibit(activeExhibit, true, 'center');
              }}
              className="rounded-lg border border-cyan-400/55 bg-[#040714]/92 px-3 py-1 text-center shadow-lg transition-colors hover:border-white cursor-pointer whitespace-nowrap"
            >
              <span className="block font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                {activeExhibit.categoryLabel}
              </span>
              <span className="block font-display text-[11px] font-bold text-white">
                {activeExhibit.title}
              </span>
            </button>
          </Html>
        )}
      </group>

      {/* 6 FLOATING EXHIBITION DISPLAYS (ONE PER CATEGORY) */}
      {GALLERY_EXHIBITS.map((exhibit, idx) => {
        const isActive = activeExhibit.id === exhibit.id;
        const isHovered = hoveredId === exhibit.id;
        const matchesFilter =
          activeCategory === 'all' || activeCategory === exhibit.category;
        const tex = textures[exhibit.id];

        return (
          <group
            key={exhibit.id}
            ref={(el) => {
              pedestalRefs.current[idx] = el;
            }}
            position={exhibit.position}
            rotation={[0, exhibit.rotationY, 0]}
            scale={isActive ? 1.08 : isHovered ? 1.05 : matchesFilter ? 1 : 0.88}
            onClick={(e) => {
              e.stopPropagation();
              nexusAudio.playClick();
              onSelectExhibit(exhibit, isActive, 'pedestal');
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(exhibit.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredId((prev) => (prev === exhibit.id ? null : prev));
              document.body.style.cursor = 'default';
            }}
          >
            {/* Floating Anti-Gravity Pedestal Disk */}
            <mesh position={[0, -0.14, 0]} castShadow={!isSoftwareGl}>
              <cylinderGeometry args={[0.98, 0.72, 0.22, 24]} />
              <meshStandardMaterial color="#0b132b" metalness={0.9} roughness={0.24} />
            </mesh>
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.88, 0.98, 32]} />
              <meshBasicMaterial
                color={isActive || isHovered ? exhibit.accentColor : '#475569'}
                transparent
                opacity={matchesFilter ? 0.92 : 0.35}
              />
            </mesh>

            {/* Under-Pedestal Thruster Ring Glow */}
            <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.54, 0.03, 10, 28]} />
              <meshStandardMaterial
                color={exhibit.accentColor}
                emissive={exhibit.accentColor}
                emissiveIntensity={isActive || isHovered ? 1.8 : 0.75}
              />
            </mesh>

            {/* Miniature 3D Exhibition Object Mounted on Pedestal */}
            <group position={[0, 0.02, 0.14]} scale={0.78}>
              <GalleryExhibitModel
                category={exhibit.category}
                accentColor={exhibit.accentColor}
                secondaryColor={exhibit.secondaryColor}
                reducedMotion={reducedMotion}
                dimmed={!matchesFilter}
                isSoftwareGl={isSoftwareGl}
              />
            </group>

            {/* Curved Holographic Visual Backdrop Plaque Behind Pedestal */}
            <group position={[0, 0.95, -0.82]}>
              <mesh>
                <boxGeometry args={[1.92, 1.12, 0.05]} />
                <meshStandardMaterial color="#090f24" metalness={0.9} roughness={0.22} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <boxGeometry args={[1.98, 1.18, 0.025]} />
                <meshStandardMaterial
                  color={isActive || isHovered ? exhibit.accentColor : '#334155'}
                  emissive={isActive || isHovered ? exhibit.accentColor : '#1e293b'}
                  emissiveIntensity={isActive || isHovered ? 1.35 : 0.35}
                />
              </mesh>
              <mesh position={[0, 0, 0.032]}>
                <planeGeometry args={[1.82, 1.02]} />
                {tex ? (
                  <meshStandardMaterial
                    map={tex}
                    emissive="#ffffff"
                    emissiveMap={tex}
                    emissiveIntensity={matchesFilter ? (isActive || isHovered ? 0.62 : 0.4) : 0.16}
                    roughness={0.28}
                    metalness={0.1}
                  />
                ) : (
                  <meshStandardMaterial
                    color="#0f1d3d"
                    emissive={exhibit.accentColor}
                    emissiveIntensity={0.22}
                    roughness={0.35}
                    metalness={0.3}
                  />
                )}
              </mesh>
            </group>

            {/* Clean Museum Display Label */}
            {isGalleryActive && (
              <Html position={[0, -0.52, 0.9]} center distanceFactor={9.5}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nexusAudio.playClick();
                    onSelectExhibit(exhibit, false, 'pedestal');
                  }}
                  className={`rounded-md border px-2.5 py-1 text-center transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-cyan-300 bg-cyan-400 text-slate-950 font-semibold'
                      : matchesFilter
                        ? 'border-slate-700 bg-[#040714]/90 text-slate-200 hover:border-cyan-400'
                        : 'border-slate-800 bg-[#040714]/70 text-slate-500'
                  }`}
                >
                  <span className="font-mono text-[10px]">
                    0{idx + 1} · {exhibit.shortCategory}
                  </span>
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
