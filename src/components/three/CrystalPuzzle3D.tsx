import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NEXUS_CRYSTALS } from '../../data/festivalData';
import type { NavigationMode } from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';

interface CrystalPuzzle3DProps {
  collectedIds: string[];
  placedIds: string[];
  crystalSteps: Record<string, number>;
  puzzleSolved: boolean;
  onCollectCrystal: (id: string) => void;
  onPlaceOrRotateCrystal: (id: string) => void;
  navMode: NavigationMode;
  activeSectionIndex: number;
  nearbyCrystalId: string | null;
  reducedMotion: boolean;
}

export function CrystalPuzzle3D({
  collectedIds,
  placedIds,
  crystalSteps,
  puzzleSolved,
  onCollectCrystal,
  onPlaceOrRotateCrystal,
  navMode,
  activeSectionIndex,
  nearbyCrystalId,
  reducedMotion,
}: CrystalPuzzle3DProps) {
  const worldCrystalRefs = useRef<(THREE.Mesh | null)[]>([]);
  const slotCrystalRefs = useRef<(THREE.Group | null)[]>([]);
  const burstRef = useRef<THREE.Mesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const shardGeo = useMemo(() => new THREE.OctahedronGeometry(0.32, 0), []);

  useEffect(() => {
    return () => {
      shardGeo.dispose();
    };
  }, [shardGeo]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    NEXUS_CRYSTALS.forEach((crystal, idx) => {
      const worldMesh = worldCrystalRefs.current[idx];
      if (worldMesh && !reducedMotion) {
        worldMesh.rotation.y += dt * 1.1;
        worldMesh.position.y = 1.15 + Math.sin(t * 2 + idx) * 0.12;
      }

      const slotGroup = slotCrystalRefs.current[idx];
      if (slotGroup) {
        const step = crystalSteps[crystal.id] ?? crystal.initialStep;
        const targetYaw = (step * Math.PI) / 4;
        slotGroup.rotation.y = THREE.MathUtils.damp(
          slotGroup.rotation.y,
          targetYaw,
          8,
          dt
        );
      }
    });

    if (burstRef.current) {
      if (puzzleSolved && !reducedMotion) {
        burstRef.current.rotation.z += dt * 0.8;
        const pulseScale = 1 + Math.sin(t * 2.5) * 0.08;
        burstRef.current.scale.setScalar(pulseScale);
      }
    }
  });

  const showWorldLabels = navMode === 'walk' || activeSectionIndex === 1;
  const showCoreLabels = activeSectionIndex === 0;

  return (
    <group>
      {/* Collectible Crystals stationed on Floating Islands */}
      {NEXUS_CRYSTALS.map((crystal, idx) => {
        const isCollected = collectedIds.includes(crystal.id);
        if (isCollected) return null;

        const boosted = hoveredId === crystal.id || nearbyCrystalId === crystal.id;
        const baseDeckY = crystal.worldPosition[1] - 1.15;

        return (
          <group
            key={crystal.id}
            position={[crystal.worldPosition[0], baseDeckY, crystal.worldPosition[2]]}
          >
            {/* Crystal Pedestal */}
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.5, 0.56, 6]} />
              <meshStandardMaterial color="#162244" metalness={0.88} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.57, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.26, 0.34, 24]} />
              <meshBasicMaterial color={crystal.color} side={THREE.DoubleSide} />
            </mesh>

            {/* Floating Collectible Crystal */}
            <mesh
              ref={(el) => {
                worldCrystalRefs.current[idx] = el;
              }}
              geometry={shardGeo}
              position={[0, 1.15, 0]}
              scale={boosted ? 1.24 : 1.0}
              onClick={(e) => {
                e.stopPropagation();
                nexusAudio.playChime(660 + idx * 80);
                onCollectCrystal(crystal.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(crystal.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredId((prev) => (prev === crystal.id ? null : prev));
                document.body.style.cursor = 'default';
              }}
            >
              <meshStandardMaterial
                color={crystal.color}
                emissive={crystal.color}
                emissiveIntensity={boosted ? 2.0 : 1.25}
                metalness={0.35}
                roughness={0.14}
              />
            </mesh>

            {showWorldLabels && (
              <Html position={[0, 1.95, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playChime(660 + idx * 80);
                    onCollectCrystal(crystal.id);
                  }}
                  className="px-2 py-0.5 rounded bg-[#060b1c]/90 border border-cyan-400/50 text-[11px] font-medium text-cyan-200 whitespace-nowrap cursor-pointer hover:border-white"
                >
                  Collect {crystal.name.split(' ')[0]} Crystal
                </button>
              </Html>
            )}
          </group>
        );
      })}

      {/* 3 Crystal Alignment Sockets Around Central Energy Core (z = 0) */}
      {NEXUS_CRYSTALS.map((crystal) => {
        const isCollected = collectedIds.includes(crystal.id);
        const isPlaced = placedIds.includes(crystal.id);
        const currentStep = crystalSteps[crystal.id] ?? crystal.initialStep;
        const isAligned = isPlaced && currentStep === crystal.targetStep;
        const targetAngle = (crystal.targetStep * Math.PI) / 4;

        return (
          <group key={`${crystal.id}-slot`} position={crystal.slotPosition}>
            {/* Socket Base */}
            <mesh position={[0, -0.35, 0]} receiveShadow>
              <cylinderGeometry args={[0.38, 0.46, 0.38, 8]} />
              <meshStandardMaterial color="#111b36" metalness={0.9} roughness={0.26} />
            </mesh>

            {/* Target Alignment Notch Indicator */}
            <mesh
              position={[Math.sin(targetAngle) * 0.48, -0.14, Math.cos(targetAngle) * 0.48]}
            >
              <boxGeometry args={[0.12, 0.08, 0.12]} />
              <meshBasicMaterial color={isAligned ? '#34d399' : crystal.color} />
            </mesh>

            {/* Socket Status Ring */}
            <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.32, 0.42, 24]} />
              <meshBasicMaterial
                color={isAligned ? '#34d399' : isPlaced ? crystal.color : '#475569'}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Placed Crystal + Directional Alignment Fin */}
            {isPlaced && (
              <group
                ref={(el) => {
                  const index = NEXUS_CRYSTALS.findIndex((c) => c.id === crystal.id);
                  if (index >= 0) slotCrystalRefs.current[index] = el;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  nexusAudio.playClick();
                  onPlaceOrRotateCrystal(crystal.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default';
                }}
              >
                <mesh position={[0, 0.22, 0]}>
                  <octahedronGeometry args={[0.26, 0]} />
                  <meshStandardMaterial
                    color={crystal.color}
                    emissive={isAligned ? '#34d399' : crystal.color}
                    emissiveIntensity={isAligned ? 2.2 : 1.1}
                    metalness={0.35}
                    roughness={0.15}
                  />
                </mesh>
                {/* Directional Phase Pointer Needle */}
                <mesh position={[0, 0.22, 0.32]}>
                  <boxGeometry args={[0.07, 0.07, 0.34]} />
                  <meshBasicMaterial color={isAligned ? '#34d399' : '#f8fafc'} />
                </mesh>
              </group>
            )}

            {showCoreLabels && isCollected && !isPlaced && (
              <Html position={[0, 0.55, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playChime(540);
                    onPlaceOrRotateCrystal(crystal.id);
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                >
                  Place {crystal.name.split(' ')[0]}
                </button>
              </Html>
            )}
          </group>
        );
      })}

      {/* Core Overdrive Harmonic Ring when Solved */}
      {puzzleSolved && (
        <mesh
          ref={burstRef}
          position={[0, 0.45, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[2.5, 3.35, 48]} />
          <meshBasicMaterial
            color="#34d399"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
