import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ContactBeaconProps {
  reducedMotion: boolean;
}

const CONTACT_CENTER_Z = -116;

export function ContactBeacon({ reducedMotion }: ContactBeaconProps) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerPrismRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!reducedMotion) {
      if (outerRingRef.current) outerRingRef.current.rotation.z += dt * 0.35;
      if (innerPrismRef.current) {
        innerPrismRef.current.rotation.y += dt * 0.55;
        innerPrismRef.current.rotation.x += dt * 0.25;
      }
    }
  });

  return (
    <group position={[0, 0, CONTACT_CENTER_Z]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 3.0, 0.24, 8]} />
        <meshStandardMaterial color="#0b132b" metalness={0.86} roughness={0.32} />
      </mesh>
      <mesh ref={outerRingRef} position={[0, 2.2, 0]}>
        <torusGeometry args={[1.65, 0.05, 14, 64]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.94}
          roughness={0.18}
          emissive="#38bdf8"
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.35, 0.035, 12, 56]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#a78bfa"
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={innerPrismRef} position={[0, 2.2, 0]}>
        <octahedronGeometry args={[0.52, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.6}
          metalness={0.5}
          roughness={0.16}
        />
      </mesh>
    </group>
  );
}
