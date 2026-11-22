import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PORTALS } from '../../data/festivalData';
import type { NavigationMode, PortalDef } from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';

interface PortalSystemProps {
  onActivatePortal: (portal: PortalDef) => void;
  navMode: NavigationMode;
  activeSectionIndex: number;
  nearbyPortalId: string | null;
  reducedMotion: boolean;
  intenseFactor?: number;
  warpPulseRef?: React.MutableRefObject<number>;
}

const VORTEX_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VORTEX_FRAG = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uHover;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float angle = atan(p.y, p.x);
    float swirl = sin(angle * 4.0 + r * 9.0 - uTime * 3.2) * 0.5 + 0.5;
    float ripple = sin(r * 16.0 - uTime * 4.5) * 0.5 + 0.5;
    float coreMask = smoothstep(1.0, 0.15, r);
    float rimGlow = smoothstep(0.62, 0.98, r);

    vec3 col = mix(uColorB, uColorA, swirl * 0.65 + ripple * 0.35);
    col *= 1.15 + uIntensity * 0.6 + uHover * 0.5;
    col += uColorA * rimGlow * (1.0 + uHover * 1.1 + uIntensity * 0.8);
    float alpha = (0.38 + swirl * 0.4 + rimGlow * 0.35) * coreMask * (0.85 + uHover * 0.25);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
  }
`;

export function PortalSystem({
  onActivatePortal,
  navMode,
  activeSectionIndex,
  nearbyPortalId,
  reducedMotion,
  intenseFactor = 0,
  warpPulseRef,
}: PortalSystemProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  const portalMaterials = useMemo(() => {
    return PORTALS.map(
      (portal) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color(portal.accentColor) },
            uColorB: { value: new THREE.Color(portal.secondaryColor) },
            uHover: { value: 0 },
            uIntensity: { value: 0 },
          },
          vertexShader: VORTEX_VERT,
          fragmentShader: VORTEX_FRAG,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
    );
  }, []);

  useEffect(() => {
    return () => {
      portalMaterials.forEach((m) => m.dispose());
    };
  }, [portalMaterials]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const surge = Math.min(1.4, intenseFactor + (warpPulseRef?.current ?? 0) * 1.1);

    PORTALS.forEach((portal, idx) => {
      const mat = portalMaterials[idx];
      const isActive = hoveredId === portal.id || nearbyPortalId === portal.id;
      if (mat) {
        if (!reducedMotion) {
          mat.uniforms.uTime.value = t + idx * 1.3;
        }
        mat.uniforms.uHover.value = THREE.MathUtils.damp(
          mat.uniforms.uHover.value,
          isActive ? 1 : 0,
          6,
          dt
        );
        mat.uniforms.uIntensity.value = THREE.MathUtils.damp(
          mat.uniforms.uIntensity.value,
          surge,
          5,
          dt
        );
      }

      const ring = ringRefs.current[idx];
      if (ring && !reducedMotion) {
        ring.rotation.z += dt * (isActive ? 1.4 : 0.45 + surge * 0.4);
      }
    });
  });

  const showLabels = navMode === 'walk' || activeSectionIndex === 1;

  return (
    <group>
      {PORTALS.map((portal, idx) => {
        const isHovered = hoveredId === portal.id;
        const isNearby = nearbyPortalId === portal.id;
        const boosted = isHovered || isNearby;

        return (
          <group
            key={portal.id}
            position={portal.worldPosition}
            rotation={[0, portal.rotationY, 0]}
            scale={boosted ? 1.07 : 1}
            onClick={(e) => {
              e.stopPropagation();
              nexusAudio.playPortalWarp();
              onActivatePortal(portal);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(portal.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredId((prev) => (prev === portal.id ? null : prev));
              document.body.style.cursor = 'default';
            }}
          >
            {/* Portal Base Plinth */}
            <mesh position={[0, 0.14, 0]} receiveShadow>
              <boxGeometry args={[2.5, 0.28, 0.8]} />
              <meshStandardMaterial color="#0b132b" metalness={0.88} roughness={0.3} />
            </mesh>

            {/* Outer Machined Titanium Stargate Frame */}
            <mesh position={[0, 1.85, 0]} castShadow>
              <torusGeometry args={[1.45, 0.11, 16, 48]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.18} />
            </mesh>

            {/* Inner Accent Energy Ring */}
            <mesh
              ref={(el) => {
                ringRefs.current[idx] = el;
              }}
              position={[0, 1.85, 0]}
            >
              <torusGeometry args={[1.28, 0.045, 12, 42]} />
              <meshStandardMaterial
                color={portal.accentColor}
                emissive={portal.accentColor}
                emissiveIntensity={boosted ? 2.6 : 1.35 + intenseFactor * 0.85}
              />
            </mesh>

            {/* Swirling Shader Vortex Disc */}
            <mesh position={[0, 1.85, 0]} material={portalMaterials[idx]}>
              <circleGeometry args={[1.26, 36]} />
            </mesh>

            {/* Subtle Portal Illumination */}
            <pointLight
              position={[0, 1.85, 0.6]}
              color={portal.accentColor}
              intensity={boosted ? 11 : 5 + intenseFactor * 4}
              distance={8.5}
              decay={2}
            />

            {showLabels && (
              <Html position={[0, 3.65, 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playPortalWarp();
                    onActivatePortal(portal);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap border cursor-pointer transition-colors ${
                    boosted
                      ? 'bg-cyan-400 text-slate-950 border-white font-semibold'
                      : 'bg-[#060b1c]/90 text-cyan-200 border-cyan-400/45 hover:border-cyan-300'
                  }`}
                >
                  {portal.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
