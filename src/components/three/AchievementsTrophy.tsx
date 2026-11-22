import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { nexusAudio } from '../../utils/audioEngine';

interface AchievementsTrophyProps {
  reducedMotion: boolean;
  onTrophyClick: () => void;
}

const TROPHY_CENTER_Z = -78;

export function AchievementsTrophy({
  reducedMotion,
  onTrophyClick,
}: AchievementsTrophyProps) {
  const trophyRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (trophyRef.current && !reducedMotion) {
      trophyRef.current.rotation.y += dt * (hovered ? 1.15 : 0.45);
      trophyRef.current.position.y = 1.15 + Math.sin(t * 1.4) * 0.08;
    }
    if (haloRef.current && !reducedMotion) {
      haloRef.current.rotation.z -= dt * 0.7;
      haloRef.current.rotation.x = Math.PI / 2.6 + Math.sin(t * 0.8) * 0.1;
    }
  });

  return (
    <group position={[0, 0, TROPHY_CENTER_Z]}>
      {/* Tiered Obsidian Podium */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.0, 2.35, 0.3, 8]} />
        <meshStandardMaterial color="#091228" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[1.45, 1.7, 0.22, 8]} />
        <meshStandardMaterial color="#142042" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.25, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Metallic Championship Trophy */}
      <group
        ref={trophyRef}
        position={[0, 1.15, 0]}
        onClick={(e) => {
          e.stopPropagation();
          nexusAudio.playChime(659.25);
          onTrophyClick();
        }}
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
        {/* Trophy Pedestal Foot */}
        <mesh position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.58, 0.36, 16]} />
          <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.28} />
        </mesh>
        {/* Brushed Gold Stem */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.34, 0.54, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.96} roughness={0.16} />
        </mesh>
        {/* Sculpted Championship Chalice Cup */}
        <mesh position={[0, 0.68, 0]} castShadow>
          <cylinderGeometry args={[0.66, 0.24, 0.82, 24, 1, false]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.96}
            roughness={0.14}
            emissive="#d97706"
            emissiveIntensity={hovered ? 0.35 : 0.1}
          />
        </mesh>
        {/* Rim Collar */}
        <mesh position={[0, 1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.66, 0.045, 12, 36]} />
          <meshStandardMaterial color="#fef3c7" metalness={0.98} roughness={0.1} />
        </mesh>
        {/* Swept Titanium Wings */}
        <mesh position={[-0.64, 0.68, 0]} rotation={[0, 0, 0.38]}>
          <torusGeometry args={[0.34, 0.045, 10, 28, Math.PI * 1.1]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0.64, 0.68, 0]} rotation={[0, Math.PI, 0.38]}>
          <torusGeometry args={[0.34, 0.045, 10, 28, Math.PI * 1.1]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Levitating Apex Prism */}
        <mesh position={[0, 1.38, 0]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.6}
            metalness={0.6}
            roughness={0.15}
          />
        </mesh>
        {/* Orbiting Quantum Halo */}
        <mesh ref={haloRef} position={[0, 0.82, 0]} rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[1.05, 0.025, 10, 48]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>
    </group>
  );
}
