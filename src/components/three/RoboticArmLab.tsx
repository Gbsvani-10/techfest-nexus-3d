import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LAB_HOTSPOTS } from '../../data/festivalData';
import type { LabHotspot } from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';

export type ArmPoseMode = 'scan' | 'pick' | 'calibrate';

interface RoboticArmLabProps {
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: LabHotspot) => void;
  poseMode: ArmPoseMode;
  reducedMotion: boolean;
  showLabels: boolean;
}

const LAB_CENTER_Z = -58;

export function RoboticArmLab({
  selectedHotspotId,
  onSelectHotspot,
  poseMode,
  reducedMotion,
  showLabels,
}: RoboticArmLabProps) {
  const turretRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);
  const specimenRef = useRef<THREE.Mesh>(null);
  const sweepLightRef = useRef<THREE.PointLight>(null);

  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // Target joint angles based on kinematic pose mode
    let targetTurret = 0;
    let targetShoulder = 0.24;
    let targetElbow = -0.58;
    let targetWrist = 0.32;

    if (poseMode === 'scan') {
      targetTurret = reducedMotion ? 0.2 : Math.sin(t * 0.55) * 0.48;
      targetShoulder = reducedMotion ? 0.22 : 0.2 + Math.sin(t * 0.8) * 0.08;
      targetElbow = reducedMotion ? -0.55 : -0.55 + Math.cos(t * 0.8) * 0.1;
      targetWrist = reducedMotion ? 0.35 : 0.35 + Math.sin(t * 1.1) * 0.14;
    } else if (poseMode === 'pick') {
      targetTurret = -0.35;
      targetShoulder = 0.52;
      targetElbow = -0.95;
      targetWrist = 0.45;
    } else if (poseMode === 'calibrate') {
      targetTurret = reducedMotion ? 0 : t * 0.35;
      targetShoulder = 0.05;
      targetElbow = -0.25;
      targetWrist = 0.15;
    }

    if (turretRef.current) {
      turretRef.current.rotation.y =
        poseMode === 'calibrate' && !reducedMotion
          ? turretRef.current.rotation.y + dt * 0.4
          : THREE.MathUtils.damp(turretRef.current.rotation.y, targetTurret, 4, dt);
    }
    if (shoulderRef.current) {
      shoulderRef.current.rotation.z = THREE.MathUtils.damp(
        shoulderRef.current.rotation.z,
        targetShoulder,
        4.5,
        dt
      );
    }
    if (elbowRef.current) {
      elbowRef.current.rotation.z = THREE.MathUtils.damp(
        elbowRef.current.rotation.z,
        targetElbow,
        4.5,
        dt
      );
    }
    if (wristRef.current) {
      wristRef.current.rotation.z = THREE.MathUtils.damp(
        wristRef.current.rotation.z,
        targetWrist,
        5,
        dt
      );
      if (!reducedMotion) {
        wristRef.current.rotation.x += dt * 0.45;
      }
    }

    if (specimenRef.current && !reducedMotion) {
      specimenRef.current.rotation.y += dt * 0.9;
      specimenRef.current.rotation.x += dt * 0.5;
    }

    if (sweepLightRef.current && !reducedMotion) {
      sweepLightRef.current.position.x = Math.cos(t * 0.85) * 3.8;
      sweepLightRef.current.position.z = Math.sin(t * 0.85) * 3.8;
    }
  });

  return (
    <group position={[0, 0, LAB_CENTER_Z]}>
      {/* Animated Sweeping Lab Accent Light */}
      <pointLight
        ref={sweepLightRef}
        position={[3.2, 3.6, 2.2]}
        color="#22d3ee"
        intensity={16}
        distance={14}
        decay={2}
      />

      {/* Circular Calibration Turntable Platform */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <cylinderGeometry args={[3.4, 3.8, 0.2, 36]} />
          <meshStandardMaterial color="#0b132b" metalness={0.86} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[2.35, 2.5, 0.08, 36]} />
          <meshStandardMaterial color="#172342" metalness={0.92} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.1, 2.24, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 6-DOF Articulated Robotic Arm Hierarchy */}
      <group position={[0, 0.26, 0]}>
        {/* Static Bolted Pedestal */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.68, 0.82, 0.44, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.26} />
        </mesh>

        {/* Axis 1: Rotating Azimuth Turret */}
        <group ref={turretRef} position={[0, 0.44, 0]}>
          <mesh position={[0, 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.56, 0.64, 0.48, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
          </mesh>
          {/* Shoulder Clevis Yoke */}
          <mesh position={[0, 0.56, 0]} castShadow>
            <boxGeometry args={[0.72, 0.34, 0.58]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Servo Housing Cap */}
          <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.72, 20]} />
            <meshStandardMaterial color="#38bdf8" metalness={0.78} roughness={0.2} />
          </mesh>

          {/* Axis 2: Shoulder Pivot & Carbon-Titanium Lower Boom */}
          <group ref={shoulderRef} position={[0, 0.62, 0]}>
            {/* Main Boom Strut */}
            <mesh position={[0, 0.82, 0]} castShadow>
              <boxGeometry args={[0.32, 1.64, 0.3]} />
              <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.42} />
            </mesh>
            {/* Brushed Titanium Edge Spine */}
            <mesh position={[-0.18, 0.82, 0]} castShadow>
              <boxGeometry args={[0.08, 1.48, 0.34]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.16} />
            </mesh>
            {/* Hydraulic Piston Strut */}
            <mesh position={[0.24, 0.62, 0]} rotation={[0, 0, -0.08]}>
              <cylinderGeometry args={[0.06, 0.08, 1.1, 14]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.14} />
            </mesh>

            {/* Axis 3: Optical Servo Elbow */}
            <group ref={elbowRef} position={[0, 1.64, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.26, 0.26, 0.54, 22]} />
                <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.18} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.28]}>
                <torusGeometry args={[0.19, 0.024, 10, 28]} />
                <meshBasicMaterial color="#22d3ee" />
              </mesh>

              {/* Upper Forearm extending forward (+X) */}
              <mesh position={[0.72, 0.14, 0]} rotation={[0, 0, -1.38]} castShadow>
                <cylinderGeometry args={[0.14, 0.21, 1.48, 18]} />
                <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.22} />
              </mesh>
              {/* Forearm Conduit Pipe */}
              <mesh position={[0.72, 0.32, 0.14]} rotation={[0, 0, -1.38]}>
                <cylinderGeometry args={[0.032, 0.032, 1.25, 10]} />
                <meshStandardMaterial color="#a78bfa" metalness={0.75} roughness={0.25} />
              </mesh>

              {/* Axes 4–6: Tri-Axis Wrist Gimbal & Photonic End-Effector */}
              <group ref={wristRef} position={[1.42, 0.28, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.18, 18, 18]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Gripper Collar */}
                <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.14, 0.16, 0.2, 16]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.26} />
                </mesh>
                {/* Dual Titanium Gripper Jaws */}
                <mesh position={[0.42, 0.13, 0]} rotation={[0, 0, -0.22]}>
                  <boxGeometry args={[0.34, 0.055, 0.09]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.16} />
                </mesh>
                <mesh position={[0.42, -0.13, 0]} rotation={[0, 0, 0.22]}>
                  <boxGeometry args={[0.34, 0.055, 0.09]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.16} />
                </mesh>

                {/* Suspended Glowing Plasma Specimen */}
                <mesh ref={specimenRef} position={[0.56, 0, 0]}>
                  <octahedronGeometry args={[0.15, 0]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    emissive="#22d3ee"
                    emissiveIntensity={2.0}
                    metalness={0.4}
                    roughness={0.15}
                  />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* 5 Clickable 3D Component Hotspots */}
      {LAB_HOTSPOTS.map((hs, idx) => {
        const isSelected = selectedHotspotId === hs.id;
        const isHovered = hoveredHotspot === hs.id;
        const active = isSelected || isHovered;

        return (
          <group key={hs.id} position={hs.localPosition}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                nexusAudio.playChime(500 + idx * 60);
                onSelectHotspot(hs);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredHotspot(hs.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredHotspot((prev) => (prev === hs.id ? null : prev));
                document.body.style.cursor = 'default';
              }}
            >
              <sphereGeometry args={[active ? 0.14 : 0.1, 14, 14]} />
              <meshStandardMaterial
                color={active ? '#f8fafc' : '#38bdf8'}
                emissive={active ? '#22d3ee' : '#0ea5e9'}
                emissiveIntensity={active ? 2.4 : 1.4}
              />
            </mesh>
            {showLabels && (
              <Html position={[0, 0.22, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playChime(500 + idx * 60);
                    onSelectHotspot(hs);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums whitespace-nowrap border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950 border-white font-semibold'
                      : 'bg-[#060b1c]/90 text-cyan-200 border-cyan-400/50 hover:border-cyan-300'
                  }`}
                >
                  0{idx + 1} · {hs.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
