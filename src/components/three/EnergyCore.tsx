import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { nexusAudio } from '../../utils/audioEngine';

interface EnergyCoreProps {
  reducedMotion: boolean;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  onCoreActivate: () => void;
  overdriveActive?: boolean;
}

export function EnergyCore({
  reducedMotion,
  pointerRef,
  onCoreActivate,
  overdriveActive = false,
}: EnergyCoreProps) {
  const rootRef = useRef<THREE.Group>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const cageRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);

  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef(0);

  // Build beveled octagonal plinth profile via Cylinder + Ring
  const satelliteOffsets = useMemo(() => {
    return [0, 1, 2, 3].map((idx) => {
      const a = (idx / 4) * Math.PI * 2;
      return [Math.cos(a) * 2.55, 0, Math.sin(a) * 2.55] as [number, number, number];
    });
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // Smooth decay of click pulse
    if (pulseRef.current > 0.001) {
      pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 4.5, dt);
    }

    // Smooth mouse-responsive parallax tilt on the core assembly
    if (rootRef.current) {
      const targetRotY = pointerRef.current.x * 0.38;
      const targetRotX = -pointerRef.current.y * 0.24;
      rootRef.current.rotation.y = THREE.MathUtils.damp(
        rootRef.current.rotation.y,
        targetRotY,
        4.5,
        dt
      );
      rootRef.current.rotation.x = THREE.MathUtils.damp(
        rootRef.current.rotation.x,
        targetRotX,
        4.5,
        dt
      );
      if (!reducedMotion) {
        rootRef.current.position.y = 2.0 + Math.sin(t * 1.1) * 0.14;
      }
    }

    if (!reducedMotion) {
      const boost = 1 + pulseRef.current * 2.8 + (hovered ? 0.5 : 0) + (overdriveActive ? 1.15 : 0);
      if (coreSphereRef.current) {
        coreSphereRef.current.rotation.y += dt * 0.45 * boost;
        const s = 1 + pulseRef.current * 0.14 + (hovered ? 0.04 : 0) + (overdriveActive ? 0.08 : 0);
        coreSphereRef.current.scale.setScalar(
          THREE.MathUtils.damp(coreSphereRef.current.scale.x, s, 8, dt)
        );
      }
      if (cageRef.current) {
        cageRef.current.rotation.x -= dt * 0.25 * boost;
        cageRef.current.rotation.y += dt * 0.35 * boost;
      }
      if (ring1Ref.current) {
        ring1Ref.current.rotation.z += dt * 0.42 * boost;
        ring1Ref.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.4) * 0.08;
      }
      if (ring2Ref.current) {
        ring2Ref.current.rotation.y -= dt * 0.55 * boost;
        ring2Ref.current.rotation.z = -Math.PI / 4;
      }
      if (ring3Ref.current) {
        ring3Ref.current.rotation.x += dt * 0.32 * boost;
        ring3Ref.current.rotation.y += dt * 0.28 * boost;
      }
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    pulseRef.current = 1.0;
    nexusAudio.playChime(587.33);
    onCoreActivate();
  };

  return (
    <group position={[0, 0, 0]}>
      {/* Grounded Reactor Plinth (bottom-center at y=0) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.14, 0]} receiveShadow>
          <cylinderGeometry args={[2.8, 3.3, 0.28, 8]} />
          <meshStandardMaterial color="#0b132b" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[2.2, 2.55, 0.1, 8]} />
          <meshStandardMaterial color="#162244" metalness={0.9} roughness={0.22} />
        </mesh>
        {/* Glowing emitter ring on plinth */}
        <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 1.85, 32]} />
          <meshBasicMaterial
            color={overdriveActive ? '#34d399' : '#38bdf8'}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Floating Interactive Metallic Energy Core */}
      <group
        ref={rootRef}
        position={[0, 2.0, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        {/* Inner Plasma Core */}
        <mesh ref={coreSphereRef}>
          <icosahedronGeometry args={[0.78, 2]} />
          <meshStandardMaterial
            color={overdriveActive ? '#34d399' : '#38bdf8'}
            emissive={overdriveActive ? '#10b981' : '#0ea5e9'}
            emissiveIntensity={overdriveActive ? 2.6 : hovered ? 2.4 : 1.7}
            metalness={0.35}
            roughness={0.18}
          />
        </mesh>

        {/* Metallic Containment Geodesic Cage */}
        <mesh ref={cageRef}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial
            color="#cbd5e1"
            metalness={0.95}
            roughness={0.16}
            wireframe
          />
        </mesh>

        {/* Equator Titanium Collar */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.28, 0.055, 16, 64]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.94} roughness={0.18} />
        </mesh>

        {/* Orbital Ring 1 (Primary Brushed Titanium + Cyan Inlay + Satellites) */}
        <group ref={ring1Ref} rotation={[Math.PI / 3, 0.2, 0]}>
          <mesh>
            <torusGeometry args={[1.85, 0.045, 16, 72]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh>
            <torusGeometry args={[1.91, 0.016, 12, 72]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          {satelliteOffsets.map((pos, i) => (
            <mesh key={i} position={[pos[0] * 0.725, pos[2] * 0.725, 0]}>
              <octahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#38bdf8"
                emissiveIntensity={1.6}
                metalness={0.7}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>

        {/* Orbital Ring 2 (Violet Harmonic Gyro) */}
        <group ref={ring2Ref} rotation={[-Math.PI / 4, 0.6, 0]}>
          <mesh>
            <torusGeometry args={[2.25, 0.04, 16, 72]} />
            <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.24} />
          </mesh>
          <mesh>
            <torusGeometry args={[2.25, 0.015, 12, 72]} />
            <meshBasicMaterial color="#a78bfa" />
          </mesh>
        </group>

        {/* Orbital Ring 3 (Outer Precision Stator) */}
        <group ref={ring3Ref} rotation={[0.15, -0.4, Math.PI / 5]}>
          <mesh>
            <torusGeometry args={[2.62, 0.032, 14, 80]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.22} />
          </mesh>
          <mesh position={[2.62, 0, 0]}>
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[-2.62, 0, 0]}>
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshStandardMaterial
              color="#a78bfa"
              emissive="#a78bfa"
              emissiveIntensity={1.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* Core Point Light */}
        <pointLight
          color={hovered ? '#22d3ee' : '#38bdf8'}
          intensity={hovered ? 12 : 8}
          distance={12}
          decay={2}
        />
      </group>
    </group>
  );
}
