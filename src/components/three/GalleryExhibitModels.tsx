import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GalleryCategoryId, GalleryHotspot } from '../../types/festival';

interface GalleryExhibitModelProps {
  category: Exclude<GalleryCategoryId, 'all'>;
  accentColor: string;
  secondaryColor: string;
  reducedMotion: boolean;
  explodeAmount?: number;
  hotspots?: GalleryHotspot[];
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspot: GalleryHotspot) => void;
  showHotspots?: boolean;
  showHotspotLabels?: boolean;
  dimmed?: boolean;
  isSoftwareGl?: boolean;
}

const CAR_PROFILE_SHAPE = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-1.12, 0.08);
  shape.lineTo(-1.05, 0.28);
  shape.quadraticCurveTo(-0.72, 0.44, -0.34, 0.48);
  shape.quadraticCurveTo(0.05, 0.64, 0.54, 0.48);
  shape.quadraticCurveTo(0.92, 0.36, 1.14, 0.16);
  shape.lineTo(1.12, 0.06);
  shape.lineTo(-1.12, 0.08);
  return shape;
})();

export function GalleryExhibitModel({
  category,
  accentColor,
  secondaryColor,
  reducedMotion,
  explodeAmount = 0,
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot,
  showHotspots = false,
  showHotspotLabels = true,
  dimmed = false,
  isSoftwareGl = false,
}: GalleryExhibitModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const subGroupARef = useRef<THREE.Group>(null);
  const subGroupBRef = useRef<THREE.Group>(null);
  const subGroupCRef = useRef<THREE.Group>(null);
  const explodeRef = useRef(0);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);

  const carExtrudeGeo = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(CAR_PROFILE_SHAPE, {
      depth: 0.78,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
    geo.center();
    geo.rotateY(Math.PI / 2);
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      carExtrudeGeo.dispose();
    };
  }, [carExtrudeGeo]);

  const opacityScale = dimmed ? 0.42 : 1;
  const emissiveBoost = dimmed ? 0.35 : 1.35;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    explodeRef.current = THREE.MathUtils.damp(explodeRef.current, explodeAmount, 6, dt);
    const exp = explodeRef.current;

    if (reducedMotion) return;
    const t = state.clock.elapsedTime;

    if (category === 'robotics') {
      if (subGroupARef.current) {
        subGroupARef.current.rotation.y = Math.sin(t * 0.9) * 0.25;
        subGroupARef.current.position.y = 1.0 + exp * 0.35;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.rotation.z = Math.sin(t * 1.4) * 0.14;
        subGroupBRef.current.position.x = 0.48 + exp * 0.38;
      }
      if (subGroupCRef.current) {
        subGroupCRef.current.rotation.z = -Math.sin(t * 1.4) * 0.14;
        subGroupCRef.current.position.x = -0.48 - exp * 0.38;
      }
    } else if (category === 'ai') {
      if (subGroupARef.current) {
        subGroupARef.current.rotation.y = t * 0.55;
        subGroupARef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.rotation.z = t * 0.48;
        subGroupBRef.current.rotation.x = Math.PI / 3 + t * 0.2;
        subGroupBRef.current.scale.setScalar(1 + exp * 0.25);
      }
      if (subGroupCRef.current) {
        subGroupCRef.current.rotation.y = -t * 0.65;
        subGroupCRef.current.scale.setScalar(1 + exp * 0.32);
      }
    } else if (category === 'space') {
      if (subGroupARef.current) {
        subGroupARef.current.position.y = 0.72 + Math.sin(t * 1.3) * 0.05 + exp * 0.3;
        subGroupARef.current.rotation.z = Math.sin(t * 0.7) * 0.06;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.rotation.y = t * 0.38;
        subGroupBRef.current.position.y = 0.12 - exp * 0.18;
      }
    } else if (category === 'automotive') {
      if (subGroupARef.current) {
        subGroupARef.current.position.y = 0.22 + exp * 0.28;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.position.y = 0.48 + exp * 0.45;
      }
    } else if (category === 'gaming') {
      if (subGroupARef.current) {
        subGroupARef.current.position.y = 0.72 + Math.sin(t * 1.6) * 0.06 + exp * 0.36;
        subGroupARef.current.rotation.y = Math.sin(t * 0.75) * 0.18;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.rotation.y = -t * 0.25;
      }
    } else if (category === 'future') {
      if (subGroupARef.current) {
        subGroupARef.current.rotation.y = t * 0.9;
        subGroupARef.current.position.y = 0.64 + Math.sin(t * 2.0) * 0.06 + exp * 0.28;
      }
      if (subGroupBRef.current) {
        subGroupBRef.current.rotation.x = t * 0.7;
        subGroupBRef.current.rotation.z = t * 0.45;
        subGroupBRef.current.scale.setScalar(1 + exp * 0.24);
      }
      if (subGroupCRef.current) {
        subGroupCRef.current.rotation.y = -t * 0.85;
        subGroupCRef.current.rotation.x = Math.PI / 2.6;
        subGroupCRef.current.scale.setScalar(1 + exp * 0.34);
      }
    }
  });

  return (
    <group ref={rootRef}>
      {/* 1. ROBOTICS: Atlas-X9 Humanoid & 6-Axis Manipulators */}
      {category === 'robotics' && (
        <group>
          {/* Base Servo Pelvis & Spine */}
          <mesh position={[0, 0.14, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.34, 0.42, 0.24, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.86} roughness={0.28} />
          </mesh>
          {/* Armored Chest Monocoque */}
          <mesh position={[0, 0.48, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.38, 0.26, 0.5, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Chest Gyro-Reactor */}
          <mesh position={[0, 0.5, 0.26]}>
            <torusGeometry args={[0.14, 0.032, 12, 24]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={1.6 * emissiveBoost}
              transparent={dimmed}
              opacity={opacityScale}
            />
          </mesh>
          {/* Shoulder Pauldrons */}
          <mesh position={[0, 0.72, 0]} castShadow={!isSoftwareGl}>
            <boxGeometry args={[0.98, 0.16, 0.34]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.32} />
          </mesh>
          {/* Articulated Sensor Cranium */}
          <group ref={subGroupARef} position={[0, 1.0, 0]}>
            <mesh castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.3, 0.28, 0.32]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.22} />
            </mesh>
            <mesh position={[0, 0.02, 0.16]}>
              <boxGeometry args={[0.26, 0.08, 0.04]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.8 * emissiveBoost}
              />
            </mesh>
            <mesh position={[0.17, 0.08, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
              <meshStandardMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={1.2} />
            </mesh>
          </group>
          {/* Right Dexterous Arm */}
          <group ref={subGroupBRef} position={[0.48, 0.64, 0]}>
            <mesh>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.25} />
            </mesh>
            <mesh position={[0.12, -0.22, 0.06]} rotation={[0, 0, 0.26]}>
              <cylinderGeometry args={[0.065, 0.055, 0.44, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
            </mesh>
            <mesh position={[0.22, -0.44, 0.14]} rotation={[0.4, 0, 0.1]}>
              <boxGeometry args={[0.12, 0.14, 0.16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.35} />
            </mesh>
          </group>
          {/* Left Dexterous Arm */}
          <group ref={subGroupCRef} position={[-0.48, 0.64, 0]}>
            <mesh>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.25} />
            </mesh>
            <mesh position={[-0.12, -0.22, 0.06]} rotation={[0, 0, -0.26]}>
              <cylinderGeometry args={[0.065, 0.055, 0.44, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
            </mesh>
            <mesh position={[-0.22, -0.44, 0.14]} rotation={[0.4, 0, -0.1]}>
              <boxGeometry args={[0.12, 0.14, 0.16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.35} />
            </mesh>
          </group>
        </group>
      )}

      {/* 2. ARTIFICIAL INTELLIGENCE: Synapse-Q Volumetric Neural Matrix */}
      {category === 'ai' && (
        <group>
          {/* Cryo-Backplane Spire Base */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.48, 0.56, 0.14, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.96, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
          </mesh>
          {/* Central Photonic Tensor Core */}
          <group ref={subGroupARef} position={[0, 0.58, 0]}>
            <mesh>
              <icosahedronGeometry args={[0.3, 1]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.65 * emissiveBoost}
                metalness={0.3}
                roughness={0.15}
              />
            </mesh>
            <mesh>
              <icosahedronGeometry args={[0.44, 0]} />
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryColor}
                emissiveIntensity={0.85 * emissiveBoost}
                wireframe
              />
            </mesh>
          </group>
          {/* Synaptic Node Ring A */}
          <group ref={subGroupBRef} position={[0, 0.58, 0]}>
            <mesh>
              <torusGeometry args={[0.66, 0.022, 10, 48]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.3 * emissiveBoost}
              />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.66, Math.sin(a) * 0.66, 0]}>
                  <sphereGeometry args={[0.068, 12, 12]} />
                  <meshStandardMaterial
                    color="#f8fafc"
                    emissive={accentColor}
                    emissiveIntensity={1.6 * emissiveBoost}
                  />
                </mesh>
              );
            })}
          </group>
          {/* Synaptic Node Ring B */}
          <group ref={subGroupCRef} position={[0, 0.58, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.56, 0.018, 10, 48]} />
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryColor}
                emissiveIntensity={1.35 * emissiveBoost}
              />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.56, 0, Math.sin(a) * 0.56]}>
                  <octahedronGeometry args={[0.065, 0]} />
                  <meshStandardMaterial
                    color={secondaryColor}
                    emissive={secondaryColor}
                    emissiveIntensity={1.5 * emissiveBoost}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      )}

      {/* 3. SPACE EXPLORATION: Helios Orbital Craft & Planetary Hologram */}
      {category === 'space' && (
        <group>
          {/* Holographic Planetary Orb beneath Craft */}
          <group ref={subGroupBRef} position={[0, 0.14, 0]}>
            <mesh>
              <sphereGeometry args={[0.24, 20, 20]} />
              <meshStandardMaterial
                color="#1d4ed8"
                emissive={accentColor}
                emissiveIntensity={0.8 * emissiveBoost}
                metalness={0.35}
                roughness={0.3}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
              <ringGeometry args={[0.32, 0.42, 32]} />
              <meshBasicMaterial
                color={accentColor}
                side={THREE.DoubleSide}
                transparent
                opacity={0.65 * opacityScale}
              />
            </mesh>
          </group>
          {/* Orbital Spacecraft + Telemetry Satellite */}
          <group ref={subGroupARef} position={[0, 0.72, 0]} rotation={[0.12, 0.25, 0]}>
            {/* Main Avionics Fuselage */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={!isSoftwareGl}>
              <cylinderGeometry args={[0.2, 0.26, 0.95, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
            </mesh>
            {/* Nose Telemetry Cone */}
            <mesh position={[0, 0, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.2, 0.34, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
            </mesh>
            {/* Hall Ion Thruster Nozzle + Plasma Ring */}
            <mesh position={[0, 0, -0.58]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.22, 0.24, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.24} />
            </mesh>
            <mesh position={[0, 0, -0.7]}>
              <torusGeometry args={[0.14, 0.03, 10, 24]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.9 * emissiveBoost}
              />
            </mesh>
            {/* Twin Photovoltaic Solar Array Wings */}
            <mesh position={[-0.78, 0, -0.05]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[1.05, 0.025, 0.44]} />
              <meshStandardMaterial
                color="#0c4a6e"
                emissive={secondaryColor}
                emissiveIntensity={0.75 * emissiveBoost}
                metalness={0.75}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0.78, 0, -0.05]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[1.05, 0.025, 0.44]} />
              <meshStandardMaterial
                color="#0c4a6e"
                emissive={secondaryColor}
                emissiveIntensity={0.75 * emissiveBoost}
                metalness={0.75}
                roughness={0.2}
              />
            </mesh>
            {/* Optical Relay Parabolic Dish */}
            <mesh position={[0, 0.28, 0.22]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.24, 0.05, 0.14, 20]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.14} />
            </mesh>
            <mesh position={[0, 0.38, 0.28]}>
              <sphereGeometry args={[0.045, 10, 10]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.8} />
            </mesh>
          </group>
        </group>
      )}

      {/* 4. AUTOMOTIVE INNOVATION: Aether-X Autonomous Hypercar */}
      {category === 'automotive' && (
        <group>
          {/* Sculpted Aerodynamic Carbon Body */}
          <group ref={subGroupARef} position={[0, 0.22, 0]}>
            <mesh geometry={carExtrudeGeo} castShadow={!isSoftwareGl}>
              <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.22} />
            </mesh>
            {/* Front & Rear Cyan LED Light Blades */}
            <mesh position={[0, -0.05, 1.12]}>
              <boxGeometry args={[0.76, 0.04, 0.06]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.9 * emissiveBoost}
              />
            </mesh>
            <mesh position={[0, 0.06, -1.08]}>
              <boxGeometry args={[0.78, 0.038, 0.06]} />
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryColor}
                emissiveIntensity={1.8 * emissiveBoost}
              />
            </mesh>
            {/* Active Rear Aero Wing */}
            <mesh position={[0, 0.26, -0.96]} rotation={[-0.12, 0, 0]}>
              <boxGeometry args={[0.88, 0.035, 0.22]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
          {/* Smoked Glass Canopy & Rooftop Autonomous LiDAR Pod */}
          <group ref={subGroupBRef} position={[0, 0.48, 0]}>
            <mesh position={[0, -0.04, -0.05]} scale={[0.72, 0.42, 1.05]}>
              <sphereGeometry args={[0.48, 20, 14]} />
              <meshStandardMaterial
                color="#020617"
                metalness={0.95}
                roughness={0.08}
                emissive="#1e1b4b"
                emissiveIntensity={0.35}
              />
            </mesh>
            <mesh position={[0, 0.16, 0.05]}>
              <cylinderGeometry args={[0.1, 0.13, 0.08, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.17, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.11, 0.015, 8, 24]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.7} />
            </mesh>
          </group>
          {/* Four Turbine-Spoke Wheels with Glowing Brake Calipers */}
          {[
            [-0.48, 0.16, 0.66],
            [0.48, 0.16, 0.66],
            [-0.48, 0.16, -0.66],
            [0.48, 0.16, -0.66],
          ].map((pos, idx) => (
            <group key={idx} position={pos as [number, number, number]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isSoftwareGl}>
                <cylinderGeometry args={[0.2, 0.2, 0.14, 20]} />
                <meshStandardMaterial color="#090d16" metalness={0.35} roughness={0.72} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]} position={[pos[0] > 0 ? 0.075 : -0.075, 0, 0]}>
                <torusGeometry args={[0.12, 0.02, 8, 20]} />
                <meshStandardMaterial
                  color={accentColor}
                  emissive={accentColor}
                  emissiveIntensity={1.3 * emissiveBoost}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 5. GAMING & VR: Parallax-VR Spatial Headset & Volumetric Arena Grid */}
      {category === 'gaming' && (
        <group>
          {/* Volumetric Isometric Arena Pedestal */}
          <group ref={subGroupBRef} position={[0, 0.14, 0]}>
            <mesh>
              <boxGeometry args={[1.15, 0.07, 1.15]} />
              <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.26} />
            </mesh>
            {[
              [-0.3, 0.14, -0.3, 0.24],
              [0.25, 0.18, -0.22, 0.32],
              [-0.18, 0.11, 0.28, 0.18],
              [0.32, 0.15, 0.28, 0.26],
            ].map(([vx, vy, vz, vh], idx) => (
              <mesh key={idx} position={[vx, vy, vz]}>
                <boxGeometry args={[0.18, vh, 0.18]} />
                <meshStandardMaterial
                  color={idx % 2 === 0 ? accentColor : secondaryColor}
                  emissive={idx % 2 === 0 ? accentColor : secondaryColor}
                  emissiveIntensity={1.15 * emissiveBoost}
                  transparent
                  opacity={0.85 * opacityScale}
                />
              </mesh>
            ))}
          </group>
          {/* Floating Spatial VR Headset */}
          <group ref={subGroupARef} position={[0, 0.72, 0]}>
            {/* Contoured Visor Shell */}
            <mesh position={[0, 0, 0.24]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.72, 0.26, 0.26]} />
              <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.2} />
            </mesh>
            {/* Iridescent Optical Front Visor */}
            <mesh position={[0, 0, 0.38]}>
              <boxGeometry args={[0.64, 0.18, 0.04]} />
              <meshStandardMaterial
                color="#090d24"
                emissive={accentColor}
                emissiveIntensity={0.75 * emissiveBoost}
                metalness={0.95}
                roughness={0.08}
              />
            </mesh>
            {/* Dual Glowing Tracking Camera Lenses */}
            {[-0.22, 0.22].map((lx, idx) => (
              <mesh key={idx} position={[lx, 0, 0.405]}>
                <torusGeometry args={[0.052, 0.014, 10, 20]} />
                <meshStandardMaterial
                  color={accentColor}
                  emissive={accentColor}
                  emissiveIntensity={1.7 * emissiveBoost}
                />
              </mesh>
            ))}
            {/* Ergonomic Halo Head Strap */}
            <mesh position={[0, 0.02, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.36, 0.045, 12, 32, Math.PI * 1.35]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Twin Haptic Audio Pods */}
            {[-0.39, 0.39].map((px, idx) => (
              <mesh key={idx} position={[px, -0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
                <meshStandardMaterial
                  color={secondaryColor}
                  emissive={secondaryColor}
                  emissiveIntensity={0.85 * emissiveBoost}
                />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* 6. FUTURE TECHNOLOGY: Chronos Holographic Prism & Cybernetic Gimbals */}
      {category === 'future' && (
        <group>
          {/* Waveguide Emitter Dish */}
          <mesh position={[0, 0.1, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.48, 0.62, 0.16, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.42, 0.025, 10, 32]} />
            <meshStandardMaterial
              color={secondaryColor}
              emissive={secondaryColor}
              emissiveIntensity={1.5 * emissiveBoost}
            />
          </mesh>
          {/* Twin Cybernetic Waveguide Pylons */}
          {[-0.64, 0.64].map((px, idx) => (
            <group key={idx} position={[px, 0.42, 0]} rotation={[0, 0, idx === 0 ? -0.22 : 0.22]}>
              <mesh>
                <boxGeometry args={[0.1, 0.68, 0.16]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
              </mesh>
              <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.055, 12, 12]} />
                <meshStandardMaterial
                  color={accentColor}
                  emissive={accentColor}
                  emissiveIntensity={1.6 * emissiveBoost}
                />
              </mesh>
            </group>
          ))}
          {/* Levitating Photonic Crystal Prism */}
          <group ref={subGroupARef} position={[0, 0.64, 0]}>
            <mesh>
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.7 * emissiveBoost}
                metalness={0.25}
                roughness={0.1}
              />
            </mesh>
            <mesh scale={1.35}>
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryColor}
                emissiveIntensity={0.85 * emissiveBoost}
                wireframe
              />
            </mesh>
          </group>
          {/* Counter-Rotating Magnetic Containment Gimbals */}
          <group ref={subGroupBRef} position={[0, 0.64, 0]}>
            <mesh>
              <torusGeometry args={[0.52, 0.024, 12, 48]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.4 * emissiveBoost}
              />
            </mesh>
          </group>
          <group ref={subGroupCRef} position={[0, 0.64, 0]}>
            <mesh>
              <torusGeometry args={[0.66, 0.02, 12, 48]} />
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryColor}
                emissiveIntensity={1.3 * emissiveBoost}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* Interactive 3D Hotspots */}
      {showHotspots &&
        hotspots.map((hs, idx) => {
          const isSelected = selectedHotspotId === hs.id;
          const isHovered = hoveredHotspotId === hs.id;
          return (
            <group key={hs.id} position={hs.localPosition}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHotspot?.(hs);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredHotspotId(hs.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredHotspotId((prev) => (prev === hs.id ? null : prev));
                  document.body.style.cursor = 'default';
                }}
              >
                <sphereGeometry args={[isSelected || isHovered ? 0.085 : 0.065, 14, 14]} />
                <meshBasicMaterial color={isSelected ? '#34d399' : '#38bdf8'} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.095, 0.125, 24]} />
                <meshBasicMaterial
                  color={isSelected ? '#34d399' : accentColor}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={isSelected || isHovered ? 0.95 : 0.65}
                />
              </mesh>
              {showHotspotLabels && (
                <Html position={[0, 0.16, 0]} center distanceFactor={6.5}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHotspot?.(hs);
                    }}
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-400 font-semibold text-slate-950'
                        : 'border-cyan-400/50 bg-[#040714]/92 text-cyan-200 hover:border-white'
                    }`}
                  >
                    0{idx + 1} · {hs.label}
                  </button>
                </Html>
              )}
            </group>
          );
        })}
    </group>
  );
}
