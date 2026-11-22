import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  CITY_CENTER_Z,
  HUB_PLAZA_RADIUS,
  MULTIVERSE_ISLANDS,
} from '../../data/festivalData';
import type {
  IslandId,
  IslandInteractionState,
  MultiverseIsland,
  NavigationMode,
} from '../../types/festival';
import { SKY_BRIDGES } from '../../utils/multiverseTerrain';
import { nexusAudio } from '../../utils/audioEngine';

interface MultiverseIslandsProps {
  selectedIslandId: IslandId | null;
  onSelectIsland: (island: MultiverseIsland) => void;
  onWarpToIsland: (targetId: IslandId) => void;
  onInteractIsland: (islandId: IslandId) => void;
  interactions: IslandInteractionState;
  reducedMotion: boolean;
  showLabels: boolean;
  navMode: NavigationMode;
  nearbyIslandId: IslandId | null;
  nearbyIslandPortalTarget: IslandId | null;
  intenseFactor?: number;
  warpPulseRef?: React.MutableRefObject<number>;
}

const PORTAL_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PORTAL_FRAG = `
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
    float swirl = sin(angle * 5.0 + r * 10.0 - uTime * 3.6) * 0.5 + 0.5;
    float ripple = sin(r * 14.0 - uTime * 4.8) * 0.5 + 0.5;
    float mask = smoothstep(1.0, 0.14, r);
    float rim = smoothstep(0.62, 0.98, r);

    vec3 col = mix(uColorB, uColorA, swirl * 0.65 + ripple * 0.35);
    col *= 1.15 + uIntensity * 0.6 + uHover * 0.55;
    col += uColorA * rim * (1.0 + uHover * 1.1 + uIntensity * 0.8);
    float alpha = (0.38 + swirl * 0.38 + rim * 0.34) * mask * (0.85 + uHover * 0.25);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
  }
`;

const BRIDGE_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BRIDGE_FRAG = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
    float rails = smoothstep(0.16, 0.02, abs(vUv.x - 0.1)) + smoothstep(0.16, 0.02, abs(vUv.x - 0.9));
    float chevrons = sin((vUv.y * 14.0 - uTime * 2.6) * 3.14159 - abs(vUv.x - 0.5) * 8.0) * 0.5 + 0.5;
    chevrons = smoothstep(0.62, 0.95, chevrons) * smoothstep(0.45, 0.05, abs(vUv.x - 0.5));

    float alpha = (0.14 + rails * 0.55 + chevrons * 0.36) * edge;
    vec3 col = mix(vec3(0.08, 0.16, 0.32), uColor, clamp(rails * 0.8 + chevrons * 0.9, 0.0, 1.0));
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
  }
`;

// Generates a sculptural faceted inverted craggy rock underside for floating islands
function createProceduralIslandRockGeometry(topRadius = 4.15, depth = 4.35): THREE.BufferGeometry {
  const radialSegs = 16;
  const heightSegs = 7;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let yIdx = 0; yIdx <= heightSegs; yIdx++) {
    const v = yIdx / heightSegs; // 0 = top rim, 1 = bottom spire tip
    const y = -v * depth;
    const baseR = topRadius * Math.pow(1 - v, 0.72);

    for (let rIdx = 0; rIdx <= radialSegs; rIdx++) {
      const u = rIdx / radialSegs;
      const theta = u * Math.PI * 2;
      const ridge =
        Math.sin(theta * 3 + v * 4.2) * 0.34 +
        Math.cos(theta * 5 - v * 6.5) * 0.18 +
        Math.sin(theta * 7 + v * 2.1) * 0.11;
      const taperScale = v > 0.05 && v < 0.95 ? 1 + ridge * 0.24 : 1;
      const radius = Math.max(0.06, baseR * taperScale);

      positions.push(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    }
  }

  const rowLen = radialSegs + 1;
  for (let yIdx = 0; yIdx < heightSegs; yIdx++) {
    for (let rIdx = 0; rIdx < radialSegs; rIdx++) {
      const a = yIdx * rowLen + rIdx;
      const b = a + rowLen;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function MultiverseIslands({
  selectedIslandId,
  onSelectIsland,
  onWarpToIsland,
  onInteractIsland,
  interactions,
  reducedMotion,
  showLabels,
  navMode,
  nearbyIslandId,
  nearbyIslandPortalTarget,
  intenseFactor = 0,
  warpPulseRef,
}: MultiverseIslandsProps) {
  const [hoveredIslandId, setHoveredIslandId] = useState<IslandId | null>(null);
  const [hoveredPortalId, setHoveredPortalId] = useState<IslandId | null>(null);

  const islandGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const satelliteMeshRef = useRef<THREE.InstancedMesh>(null);

  // Island-specific interactive refs
  const roboticsTurretRef = useRef<THREE.Group>(null);
  const roboticsArmRef = useRef<THREE.Group>(null);
  const roboticsScannerRef = useRef<THREE.Mesh>(null);
  const aiCoreRef = useRef<THREE.Mesh>(null);
  const aiLayerRefs = useRef<(THREE.Group | null)[]>([]);
  const aiPulseTimestampRef = useRef(-10);
  const gamingPillarsRef = useRef<(THREE.Mesh | null)[]>([]);
  const gamingTrophyRef = useRef<THREE.Mesh>(null);
  const spaceDishRef = useRef<THREE.Group>(null);
  const spaceFlameRef = useRef<THREE.Mesh>(null);
  const spaceSatRef = useRef<THREE.Group>(null);
  const innovRingARef = useRef<THREE.Mesh>(null);
  const innovRingBRef = useRef<THREE.Mesh>(null);
  const innovPrismRef = useRef<THREE.Mesh>(null);
  const innovScanRingRef = useRef<THREE.Mesh>(null);
  const innovScanTimestampRef = useRef(-10);

  // Trigger transient animation waves when AI inference or Innovation CAD scan counters advance
  useEffect(() => {
    if (interactions.aiPulseCount > 0) {
      aiPulseTimestampRef.current = performance.now() * 0.001;
    }
  }, [interactions.aiPulseCount]);

  useEffect(() => {
    if (interactions.innovationScanCount > 0) {
      innovScanTimestampRef.current = performance.now() * 0.001;
    }
  }, [interactions.innovationScanCount]);

  // Shared procedural floating rock underside geometry
  const rockGeo = useMemo(() => createProceduralIslandRockGeometry(4.15, 4.35), []);

  // Curved glowing inter-island energy tether tubes
  const tetherGeometries = useMemo(() => {
    return MULTIVERSE_ISLANDS.map((isl) => {
      const target = MULTIVERSE_ISLANDS.find((t) => t.id === isl.connectedPortalTargetId)!;
      const start = new THREE.Vector3(
        isl.worldPosition[0] + isl.portalLocalPos[0],
        isl.worldPosition[1] + 1.55,
        isl.worldPosition[2] + isl.portalLocalPos[2]
      );
      const end = new THREE.Vector3(
        target.worldPosition[0],
        target.worldPosition[1] + 2.4,
        target.worldPosition[2]
      );
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 2.6;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      return new THREE.TubeGeometry(curve, 24, 0.032, 6, false);
    });
  }, []);

  // Custom GLSL materials for the 5 inter-island portals & 5 sky-bridges
  const portalMaterials = useMemo(() => {
    return MULTIVERSE_ISLANDS.map((isl) => {
      const dest = MULTIVERSE_ISLANDS.find((t) => t.id === isl.connectedPortalTargetId)!;
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(dest.accentColor) },
          uColorB: { value: new THREE.Color(isl.accentColor) },
          uHover: { value: 0 },
          uIntensity: { value: 0 },
        },
        vertexShader: PORTAL_VERT,
        fragmentShader: PORTAL_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    });
  }, []);

  const bridgeMaterials = useMemo(() => {
    return SKY_BRIDGES.map(
      (b) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(b.accentColor) },
          },
          vertexShader: BRIDGE_VERT,
          fragmentShader: BRIDGE_FRAG,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
    );
  }, []);

  useEffect(() => {
    return () => {
      rockGeo.dispose();
      tetherGeometries.forEach((g) => g.dispose());
      portalMaterials.forEach((m) => m.dispose());
      bridgeMaterials.forEach((m) => m.dispose());
    };
  }, [rockGeo, tetherGeometries, portalMaterials, bridgeMaterials]);

  // Populate 20 Instanced Floating Satellite Rock Shards around the 5 Islands
  useEffect(() => {
    const mesh = satelliteMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    MULTIVERSE_ISLANDS.forEach((isl, islIdx) => {
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + islIdx * 0.7;
        const r = isl.deckRadius + 1.15 + (s % 2) * 0.55;
        dummy.position.set(
          isl.worldPosition[0] + Math.cos(angle) * r,
          isl.worldPosition[1] - 0.65 - (s % 3) * 0.55,
          isl.worldPosition[2] + Math.sin(angle) * r
        );
        dummy.rotation.set(s * 0.8, angle, s * 0.4);
        dummy.scale.setScalar(0.32 + (s % 3) * 0.14);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  // Pre-build AI neural network node offsets
  const aiNodes = useMemo(
    () => [
      // Layer 0 (Input)
      { layer: 0, pos: [-0.95, 0.75, 0.75] as [number, number, number] },
      { layer: 0, pos: [0.95, 0.75, 0.75] as [number, number, number] },
      { layer: 0, pos: [-0.95, 0.75, -0.75] as [number, number, number] },
      { layer: 0, pos: [0.95, 0.75, -0.75] as [number, number, number] },
      // Layer 1 (Hidden)
      { layer: 1, pos: [-0.72, 1.65, 0] as [number, number, number] },
      { layer: 1, pos: [0.72, 1.65, 0] as [number, number, number] },
      { layer: 1, pos: [0, 1.65, 0.72] as [number, number, number] },
      { layer: 1, pos: [0, 1.65, -0.72] as [number, number, number] },
      // Layer 2 (Output)
      { layer: 2, pos: [0, 2.55, 0] as [number, number, number] },
    ],
    []
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const nowSec = performance.now() * 0.001;

    // Gentle hover levitation on unselected islands (disabled in walk mode or reduced motion so player deck height stays exact!)
    MULTIVERSE_ISLANDS.forEach((isl, idx) => {
      const grp = islandGroupRefs.current[idx];
      if (grp) {
        const hoverY =
          navMode === 'browse' && !reducedMotion
            ? Math.sin(t * 0.9 + idx * 1.25) * 0.14
            : 0;
        grp.position.y = THREE.MathUtils.damp(grp.position.y, isl.worldPosition[1] + hoverY, 6, dt);
      }

      const pMat = portalMaterials[idx];
      if (pMat) {
        if (!reducedMotion) pMat.uniforms.uTime.value = t + idx * 1.1;
        const pBoost = hoveredPortalId === isl.id || nearbyIslandPortalTarget === isl.connectedPortalTargetId;
        pMat.uniforms.uHover.value = THREE.MathUtils.damp(
          pMat.uniforms.uHover.value,
          pBoost ? 1 : 0,
          6,
          dt
        );
        const surge = Math.min(1.4, intenseFactor + (warpPulseRef?.current ?? 0) * 1.1);
        pMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
          pMat.uniforms.uIntensity.value,
          surge,
          5,
          dt
        );
      }
    });

    bridgeMaterials.forEach((bMat, idx) => {
      if (!reducedMotion) bMat.uniforms.uTime.value = t + idx * 0.4;
    });

    if (reducedMotion) return;

    // 1. Robotics Island Animations
    const robSpeed =
      interactions.roboticsMode === 'overdrive'
        ? 2.2
        : interactions.roboticsMode === 'precision'
          ? 0.45
          : 1.0;
    if (roboticsTurretRef.current) {
      roboticsTurretRef.current.rotation.y = Math.sin(t * 0.85 * robSpeed) * 0.95;
    }
    if (roboticsArmRef.current) {
      roboticsArmRef.current.rotation.z = Math.sin(t * 1.4 * robSpeed) * 0.28 - 0.2;
    }
    if (roboticsScannerRef.current) {
      roboticsScannerRef.current.rotation.y += dt * 2.4 * robSpeed;
    }

    // 2. AI Island Inference Wave Animation
    const aiPulseAge = nowSec - aiPulseTimestampRef.current;
    const pulseActive = aiPulseAge >= 0 && aiPulseAge < 1.8;
    if (aiCoreRef.current) {
      aiCoreRef.current.rotation.y += dt * (pulseActive ? 3.2 : 0.85);
      aiCoreRef.current.rotation.x += dt * 0.4;
      const coreScale = pulseActive ? 1 + Math.sin(aiPulseAge * 8) * 0.18 : 1;
      aiCoreRef.current.scale.setScalar(coreScale);
    }
    aiLayerRefs.current.forEach((layerGrp, lIdx) => {
      if (!layerGrp) return;
      layerGrp.rotation.y += dt * (lIdx % 2 === 0 ? 0.35 : -0.45);
      const waveDist = Math.abs(aiPulseAge * 2.4 - lIdx * 0.7);
      const layerBoost = pulseActive && waveDist < 0.65 ? 1.24 : 1.0;
      layerGrp.scale.setScalar(THREE.MathUtils.damp(layerGrp.scale.x, layerBoost, 10, dt));
    });

    // 3. Gaming Island Equalizer Pillars
    const gAmp =
      interactions.gamingMode === 'pulse'
        ? 1.55
        : interactions.gamingMode === 'stealth'
          ? 0.55
          : 1.05;
    gamingPillarsRef.current.forEach((pillar, pIdx) => {
      if (!pillar) return;
      const targetScaleY =
        0.55 + (Math.sin(t * 3.1 + pIdx * 0.85) * 0.5 + 0.5) * 1.35 * gAmp;
      pillar.scale.y = THREE.MathUtils.damp(pillar.scale.y, targetScaleY, 10, dt);
      pillar.position.y = 0.28 + pillar.scale.y * 0.5;
    });
    if (gamingTrophyRef.current) {
      gamingTrophyRef.current.rotation.y += dt * 1.1;
      gamingTrophyRef.current.position.y = 2.0 + Math.sin(t * 2.0) * 0.14;
    }

    // 4. Space Exploration Island Animations
    if (spaceDishRef.current) {
      const dishSpeed = interactions.spaceThrusterActive ? 1.5 : 0.45;
      spaceDishRef.current.rotation.y = Math.sin(t * dishSpeed) * 0.85;
    }
    if (spaceSatRef.current) {
      spaceSatRef.current.rotation.y += dt * 0.75;
    }
    if (spaceFlameRef.current) {
      const targetScale = interactions.spaceThrusterActive
        ? 0.9 + Math.sin(t * 28) * 0.18
        : 0.001;
      spaceFlameRef.current.scale.set(
        interactions.spaceThrusterActive ? 1 : 0.001,
        targetScale,
        interactions.spaceThrusterActive ? 1 : 0.001
      );
    }

    // 5. Innovation Island Gyro & CAD Laser Scan
    if (innovRingARef.current) innovRingARef.current.rotation.x += dt * 0.95;
    if (innovRingBRef.current) innovRingBRef.current.rotation.z -= dt * 1.15;
    if (innovPrismRef.current) {
      innovPrismRef.current.rotation.y += dt * 0.85;
      innovPrismRef.current.position.y = 1.65 + Math.sin(t * 1.7) * 0.1;
    }
    if (innovScanRingRef.current) {
      const scanAge = nowSec - innovScanTimestampRef.current;
      const isScanning = scanAge >= 0 && scanAge < 2.2;
      innovScanRingRef.current.position.y = isScanning
        ? 0.65 + Math.sin((scanAge / 2.2) * Math.PI) * 1.95
        : 0.65 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 1.65;
    }
  });

  const labelsVisible = showLabels || navMode === 'walk';

  return (
    <group>
      {/* Central Floating Multiverse Hub Platform at [0, 0, -18] */}
      <group position={[0, 0, CITY_CENTER_Z]}>
        <mesh position={[0, -0.14, 0]} receiveShadow>
          <cylinderGeometry args={[HUB_PLAZA_RADIUS, HUB_PLAZA_RADIUS + 0.35, 0.28, 12]} />
          <meshStandardMaterial color="#0b132b" metalness={0.85} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HUB_PLAZA_RADIUS - 0.22, HUB_PLAZA_RADIUS - 0.04, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.62} side={THREE.DoubleSide} />
        </mesh>
        {/* Underside Hub Levitation Spire */}
        <mesh position={[0, -1.65, 0]}>
          <coneGeometry args={[4.4, 2.8, 12]} />
          <meshStandardMaterial color="#091124" metalness={0.6} roughness={0.65} flatShading />
        </mesh>
        <mesh position={[0, -3.2, 0]}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>

      {/* Walkable Luminous Sky-Bridges connecting Hub Plaza to all 5 Islands */}
      {SKY_BRIDGES.map((b, idx) => (
        <group
          key={b.islandId}
          position={[b.midX, b.midY, b.midZ]}
          rotation={[0, b.yaw, 0]}
        >
          {/* Walkable Bridge Deck rotated by pitch */}
          <group rotation={[-b.pitch, 0, 0]}>
            <mesh material={bridgeMaterials[idx]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <planeGeometry args={[2.15, b.fullLen]} />
            </mesh>
            {/* Solid under-frame truss */}
            <mesh position={[0, -0.09, 0]} receiveShadow>
              <boxGeometry args={[2.0, 0.14, b.fullLen]} />
              <meshStandardMaterial color="#0d1733" metalness={0.88} roughness={0.32} />
            </mesh>
            {/* Side Guide Beams */}
            <mesh position={[-1.02, 0.22, 0]}>
              <boxGeometry args={[0.05, 0.05, b.fullLen]} />
              <meshBasicMaterial color={b.accentColor} transparent opacity={0.75} />
            </mesh>
            <mesh position={[1.02, 0.22, 0]}>
              <boxGeometry args={[0.05, 0.05, b.fullLen]} />
              <meshBasicMaterial color={b.accentColor} transparent opacity={0.75} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Curved Sky Energy Tethers linking Portals across Islands */}
      {tetherGeometries.map((geo, idx) => (
        <mesh key={MULTIVERSE_ISLANDS[idx].id} geometry={geo}>
          <meshBasicMaterial
            color={MULTIVERSE_ISLANDS[idx].accentColor}
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}

      {/* Instanced Floating Satellite Rock Shards */}
      <instancedMesh ref={satelliteMeshRef} args={[undefined, undefined, 20]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#172447"
          metalness={0.35}
          roughness={0.76}
          flatShading
        />
      </instancedMesh>

      {/* THE 5 FLOATING MULTIVERSE ISLANDS */}
      {MULTIVERSE_ISLANDS.map((island, idx) => {
        const isSelected = selectedIslandId === island.id;
        const isHovered = hoveredIslandId === island.id;
        const isNearby = nearbyIslandId === island.id;
        const boosted = isSelected || isHovered || isNearby;
        const destIsland = MULTIVERSE_ISLANDS.find(
          (i) => i.id === island.connectedPortalTargetId
        )!;

        return (
          <group
            key={island.id}
            ref={(el) => {
              islandGroupRefs.current[idx] = el;
            }}
            position={island.worldPosition}
          >
            {/* Clickable Island Deck & Procedural Rock Underside */}
            <group
              onClick={(e) => {
                e.stopPropagation();
                nexusAudio.playClick();
                onSelectIsland(island);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredIslandId(island.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredIslandId((prev) => (prev === island.id ? null : prev));
                document.body.style.cursor = 'default';
              }}
            >
              {/* Procedural Faceted Basalt Underside */}
              <mesh geometry={rockGeo} position={[0, -0.14, 0]} castShadow receiveShadow>
                <meshStandardMaterial
                  color="#101a34"
                  metalness={0.28}
                  roughness={0.82}
                  flatShading
                />
              </mesh>

              {/* Terraced Metallic Upper Deck */}
              <mesh position={[0, -0.08, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[island.deckRadius, island.deckRadius + 0.16, 0.24, 16]} />
                <meshStandardMaterial
                  color="#14203f"
                  metalness={0.84}
                  roughness={0.28}
                />
              </mesh>

              {/* Glowing Perimeter Rim Ring */}
              <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[island.deckRadius - 0.05, boosted ? 0.075 : 0.045, 10, 48]} />
                <meshStandardMaterial
                  color={island.accentColor}
                  emissive={island.accentColor}
                  emissiveIntensity={boosted ? 2.2 : 1.05}
                />
              </mesh>

              {/* Under-Island Anti-Gravity Levitation Ring & Core */}
              <mesh position={[0, -4.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.15, 0.05, 10, 32]} />
                <meshStandardMaterial
                  color={island.accentColor}
                  emissive={island.accentColor}
                  emissiveIntensity={boosted ? 2.0 : 1.2}
                />
              </mesh>
              <mesh position={[0, -4.5, 0]}>
                <octahedronGeometry args={[0.42, 0]} />
                <meshStandardMaterial
                  color={island.accentColor}
                  emissive={island.accentColor}
                  emissiveIntensity={1.6}
                />
              </mesh>
            </group>

            {/* DISTINCTIVE INTERACTIVE ENVIRONMENT PER ISLAND */}
            <group
              onClick={(e) => {
                e.stopPropagation();
                onSelectIsland(island);
                onInteractIsland(island.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredIslandId(island.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredIslandId((prev) => (prev === island.id ? null : prev));
                document.body.style.cursor = 'default';
              }}
            >
              {/* 1. ROBOTICS ISLAND: Multi-Axis Turret + LiDAR Scanner */}
              {island.id === 'robotics' && (
                <group position={[0, 0.05, 0]}>
                  <mesh position={[0, 0.25, 0]} castShadow>
                    <cylinderGeometry args={[1.0, 1.25, 0.45, 8]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.22} />
                  </mesh>
                  <group ref={roboticsTurretRef} position={[0, 0.55, 0]}>
                    <mesh position={[0, 0.35, 0]} castShadow>
                      <boxGeometry args={[0.75, 0.65, 0.85]} />
                      <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.24} />
                    </mesh>
                    <group ref={roboticsArmRef} position={[0, 0.65, 0]}>
                      <mesh position={[0, 0.75, 0]} castShadow>
                        <boxGeometry args={[0.32, 1.5, 0.32]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.18} />
                      </mesh>
                      <mesh position={[0.48, 1.45, 0]} rotation={[0, 0, -0.5]}>
                        <boxGeometry args={[0.95, 0.24, 0.24]} />
                        <meshStandardMaterial color="#38bdf8" metalness={0.75} roughness={0.2} />
                      </mesh>
                      <mesh position={[0.92, 1.22, 0]}>
                        <octahedronGeometry args={[0.24, 0]} />
                        <meshStandardMaterial
                          color="#38bdf8"
                          emissive="#38bdf8"
                          emissiveIntensity={interactions.roboticsMode === 'overdrive' ? 2.6 : 1.4}
                        />
                      </mesh>
                    </group>
                  </group>
                  <mesh ref={roboticsScannerRef} position={[0, 2.55, 0]}>
                    <torusGeometry args={[0.95, 0.035, 10, 32]} />
                    <meshBasicMaterial color="#38bdf8" />
                  </mesh>
                </group>
              )}

              {/* 2. ARTIFICIAL INTELLIGENCE ISLAND: 3-Layer Neural Matrix */}
              {island.id === 'ai' && (
                <group position={[0, 0.05, 0]}>
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <cylinderGeometry args={[1.15, 1.35, 0.4, 6]} />
                    <meshStandardMaterial color="#132240" metalness={0.88} roughness={0.26} />
                  </mesh>
                  <mesh ref={aiCoreRef} position={[0, 1.65, 0]}>
                    <octahedronGeometry args={[0.46, 0]} />
                    <meshStandardMaterial
                      color="#22d3ee"
                      emissive="#22d3ee"
                      emissiveIntensity={1.9}
                      metalness={0.4}
                      roughness={0.15}
                    />
                  </mesh>
                  {[0, 1, 2].map((layerIdx) => (
                    <group
                      key={layerIdx}
                      ref={(el) => {
                        aiLayerRefs.current[layerIdx] = el;
                      }}
                    >
                      {aiNodes
                        .filter((n) => n.layer === layerIdx)
                        .map((node, nIdx) => (
                          <mesh key={nIdx} position={node.pos}>
                            <sphereGeometry args={[0.16, 14, 14]} />
                            <meshStandardMaterial
                              color={layerIdx === 2 ? '#a5f3fc' : '#22d3ee'}
                              emissive="#22d3ee"
                              emissiveIntensity={1.5}
                            />
                          </mesh>
                        ))}
                    </group>
                  ))}
                  {/* Vertical Neural Containment Halo */}
                  <mesh position={[0, 1.65, 0]}>
                    <torusGeometry args={[1.15, 0.03, 10, 36]} />
                    <meshBasicMaterial color="#6366f1" transparent opacity={0.75} />
                  </mesh>
                </group>
              )}

              {/* 3. GAMING ISLAND: Holographic Esports Arena & Equalizer Monoliths */}
              {island.id === 'gaming' && (
                <group position={[0, 0.05, 0]}>
                  <mesh position={[0, 0.16, 0]} receiveShadow>
                    <cylinderGeometry args={[1.55, 1.75, 0.3, 8]} />
                    <meshStandardMaterial color="#191638" metalness={0.86} roughness={0.24} />
                  </mesh>
                  {Array.from({ length: 8 }, (_, pIdx) => {
                    const angle = (pIdx / 8) * Math.PI * 2;
                    const pillarColor =
                      interactions.gamingMode === 'pulse'
                        ? '#22d3ee'
                        : interactions.gamingMode === 'stealth'
                          ? '#818cf8'
                          : '#a78bfa';
                    return (
                      <mesh
                        key={pIdx}
                        ref={(el) => {
                          gamingPillarsRef.current[pIdx] = el;
                        }}
                        position={[Math.cos(angle) * 1.18, 0.8, Math.sin(angle) * 1.18]}
                      >
                        <boxGeometry args={[0.24, 1.0, 0.24]} />
                        <meshStandardMaterial
                          color={pillarColor}
                          emissive={pillarColor}
                          emissiveIntensity={interactions.gamingMode === 'stealth' ? 0.65 : 1.5}
                          metalness={0.7}
                          roughness={0.2}
                        />
                      </mesh>
                    );
                  })}
                  <mesh ref={gamingTrophyRef} position={[0, 2.0, 0]}>
                    <icosahedronGeometry args={[0.52, 0]} />
                    <meshStandardMaterial
                      color="#c4b5fd"
                      emissive="#a78bfa"
                      emissiveIntensity={1.6}
                      metalness={0.85}
                      roughness={0.14}
                    />
                  </mesh>
                </group>
              )}

              {/* 4. SPACE EXPLORATION ISLAND: Launch Pad Rocket + Telemetry Dish */}
              {island.id === 'space' && (
                <group position={[0, 0.05, 0]}>
                  {/* Launch Pad Plinth */}
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[1.3, 1.48, 0.38, 12]} />
                    <meshStandardMaterial color="#1e2436" metalness={0.85} roughness={0.32} />
                  </mesh>
                  {/* Multi-Stage Launch Rocket */}
                  <group position={[-0.2, 0.4, 0]}>
                    <mesh position={[0, 1.35, 0]} castShadow>
                      <cylinderGeometry args={[0.26, 0.3, 1.85, 16]} />
                      <meshStandardMaterial color="#e2e8f0" metalness={0.72} roughness={0.24} />
                    </mesh>
                    <mesh position={[0, 2.55, 0]} castShadow>
                      <coneGeometry args={[0.26, 0.6, 16]} />
                      <meshStandardMaterial color="#f59e0b" metalness={0.65} roughness={0.25} />
                    </mesh>
                    {/* Twin Side Boosters */}
                    <mesh position={[-0.36, 0.95, 0]}>
                      <cylinderGeometry args={[0.11, 0.13, 1.15, 12]} />
                      <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.28} />
                    </mesh>
                    <mesh position={[0.36, 0.95, 0]}>
                      <cylinderGeometry args={[0.11, 0.13, 1.15, 12]} />
                      <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.28} />
                    </mesh>
                    {/* Animated Plasma Thruster Exhaust Cone */}
                    <mesh
                      ref={spaceFlameRef}
                      position={[0, 0.15, 0]}
                      rotation={[Math.PI, 0, 0]}
                    >
                      <coneGeometry args={[0.28, 0.95, 14]} />
                      <meshBasicMaterial
                        color="#fbbf24"
                        transparent
                        opacity={interactions.spaceThrusterActive ? 0.9 : 0}
                      />
                    </mesh>
                  </group>
                  {/* Gantry Mast & Orbiting Micro-Satellite */}
                  <mesh position={[0.68, 1.4, -0.35]}>
                    <boxGeometry args={[0.22, 2.25, 0.22]} />
                    <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
                  </mesh>
                  <group ref={spaceDishRef} position={[1.05, 0.72, 0.65]}>
                    <mesh rotation={[-0.6, 0, 0]}>
                      <cylinderGeometry args={[0.45, 0.12, 0.24, 16]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                  <group ref={spaceSatRef} position={[-0.2, 2.6, 0]}>
                    <mesh position={[1.25, 0, 0]}>
                      <boxGeometry args={[0.18, 0.12, 0.36]} />
                      <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
                    </mesh>
                  </group>
                </group>
              )}

              {/* 5. INNOVATION ISLAND: Gyroscopic Holo-CAD Foundry */}
              {island.id === 'innovation' && (
                <group position={[0, 0.05, 0]}>
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[1.15, 1.35, 0.38, 8]} />
                    <meshStandardMaterial color="#102530" metalness={0.88} roughness={0.25} />
                  </mesh>
                  <mesh ref={innovRingARef} position={[0, 1.65, 0]}>
                    <torusGeometry args={[1.15, 0.055, 12, 40]} />
                    <meshStandardMaterial
                      color="#34d399"
                      emissive="#34d399"
                      emissiveIntensity={1.1}
                      metalness={0.85}
                      roughness={0.2}
                    />
                  </mesh>
                  <mesh ref={innovRingBRef} position={[0, 1.65, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.9, 0.045, 12, 36]} />
                    <meshStandardMaterial
                      color="#38bdf8"
                      emissive="#38bdf8"
                      emissiveIntensity={1.1}
                      metalness={0.85}
                      roughness={0.2}
                    />
                  </mesh>
                  <mesh ref={innovPrismRef} position={[0, 1.65, 0]}>
                    <dodecahedronGeometry args={[0.48, 0]} />
                    <meshStandardMaterial
                      color="#a7f3d0"
                      emissive="#34d399"
                      emissiveIntensity={1.3}
                      metalness={0.65}
                      roughness={0.18}
                    />
                  </mesh>
                  {/* Animated Holo-CAD Laser Scan Ring */}
                  <mesh
                    ref={innovScanRingRef}
                    position={[0, 1.4, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <torusGeometry args={[0.72, 0.025, 8, 32]} />
                    <meshBasicMaterial color="#6ee7b7" />
                  </mesh>
                </group>
              )}
            </group>

            {/* ANIMATED INTER-ISLAND PORTAL GATE ON EACH ISLAND */}
            <group
              position={island.portalLocalPos}
              rotation={[0, island.portalRotationY, 0]}
              scale={hoveredPortalId === island.id ? 1.08 : 1}
              onClick={(e) => {
                e.stopPropagation();
                nexusAudio.playPortalWarp();
                onWarpToIsland(island.connectedPortalTargetId);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredPortalId(island.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredPortalId((prev) => (prev === island.id ? null : prev));
                document.body.style.cursor = 'default';
              }}
            >
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[1.65, 0.22, 0.52]} />
                <meshStandardMaterial color="#0b132b" metalness={0.9} roughness={0.25} />
              </mesh>
              <mesh position={[0, 1.25, 0]} castShadow>
                <torusGeometry args={[0.92, 0.08, 12, 36]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.18} />
              </mesh>
              <mesh position={[0, 1.25, 0]} material={portalMaterials[idx]}>
                <circleGeometry args={[0.84, 30]} />
              </mesh>
              {labelsVisible && (
                <Html position={[0, 2.45, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
                  <button
                    type="button"
                    onClick={() => {
                      nexusAudio.playPortalWarp();
                      onWarpToIsland(island.connectedPortalTargetId);
                    }}
                    className="px-2 py-0.5 rounded bg-[#060b1c]/90 border border-cyan-400/45 text-[10px] font-medium text-cyan-200 whitespace-nowrap hover:border-white cursor-pointer"
                  >
                    Portal → {destIsland.shortName}
                  </button>
                </Html>
              )}
            </group>

            {/* Floating Island Title Pin */}
            {labelsVisible && (
              <Html
                position={[0, 3.65, 0]}
                center
                distanceFactor={17}
                zIndexRange={[10, 0]}
              >
                <button
                  type="button"
                  onClick={() => {
                    nexusAudio.playClick();
                    onSelectIsland(island);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                    isSelected || isNearby
                      ? 'bg-cyan-400 text-slate-950 border-white font-semibold'
                      : 'bg-[#060b1c]/92 text-slate-100 border-cyan-400/40 hover:border-cyan-300'
                  }`}
                >
                  {island.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
