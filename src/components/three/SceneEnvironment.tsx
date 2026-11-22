import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WEATHER_PRESETS } from '../../data/festivalData';
import type { WeatherMode } from '../../types/festival';
import { createGridFloorTexture } from '../../utils/proceduralTextures';

interface SceneEnvironmentProps {
  weather: WeatherMode;
  particleCount: number;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  scrollProgressRef: React.MutableRefObject<number>;
}

// Pre-allocated Color scratch targets (zero per-frame allocations)
const _targetBg = new THREE.Color();
const _targetFog = new THREE.Color();
const _targetHemiSky = new THREE.Color();
const _targetHemiGround = new THREE.Color();
const _targetKey = new THREE.Color();
const _targetRim = new THREE.Color();
const _targetAccent = new THREE.Color();

export function SceneEnvironment({
  weather,
  particleCount,
  isSoftwareGl,
  reducedMotion,
  scrollProgressRef,
}: SceneEnvironmentProps) {
  const { scene, gl } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const bgColorRef = useRef<THREE.Color>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const accentLightRef = useRef<THREE.PointLight>(null);
  const floorMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Studio environment reflections via RoomEnvironment + PMREMGenerator
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;
    roomEnv.dispose();
    pmremGenerator.dispose();

    return () => {
      envTarget.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);

  // Procedural grid floor texture
  const gridTexture = useMemo(() => {
    const maxAniso = isSoftwareGl ? 1 : Math.min(gl.capabilities.getMaxAnisotropy(), 8);
    return createGridFloorTexture(maxAniso);
  }, [gl, isSoftwareGl]);

  useEffect(() => {
    return () => {
      gridTexture.dispose();
    };
  }, [gridTexture]);

  // Starfield & atmospheric energy particles distributed along the entire Nexus spine (z = +20 to -135)
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color('#38bdf8'), // electric cyan
      new THREE.Color('#818cf8'), // electric blue-violet
      new THREE.Color('#a78bfa'), // neon violet
      new THREE.Color('#e2e8f0'), // starlight white
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 5 + ((i * 73) % 100) * 0.34;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = 0.5 + ((i * 19) % 100) * 0.28;
      positions[i3 + 2] = 18 - (i / particleCount) * 155;

      const c = palette[i % palette.length];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [particleCount]);

  useEffect(() => {
    return () => {
      particleGeometry.dispose();
    };
  }, [particleGeometry]);

  // Smooth weather lighting, fog, environment intensity, and particle drift
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const preset = WEATHER_PRESETS[weather];
    const colorBlend = 1 - Math.exp(-3.2 * dt);

    // Subtle distant storm flash modulation in Rain mode
    let stormFlash = 0;
    if (weather === 'rain' && !reducedMotion) {
      const cycle = state.clock.elapsedTime % 9.5;
      if (cycle > 9.15) {
        stormFlash = Math.sin(((cycle - 9.15) / 0.35) * Math.PI) * 0.9;
      }
    }

    if (bgColorRef.current) {
      _targetBg.set(preset.bgColor);
      bgColorRef.current.lerp(_targetBg, colorBlend);
    }

    if (fogRef.current) {
      _targetFog.set(preset.fogColor);
      fogRef.current.color.lerp(_targetFog, colorBlend);
      fogRef.current.density = THREE.MathUtils.damp(
        fogRef.current.density,
        preset.fogDensity,
        3.2,
        dt
      );
    }

    if (hemiLightRef.current) {
      _targetHemiSky.set(preset.hemiSky);
      _targetHemiGround.set(preset.hemiGround);
      hemiLightRef.current.color.lerp(_targetHemiSky, colorBlend);
      hemiLightRef.current.groundColor.lerp(_targetHemiGround, colorBlend);
      hemiLightRef.current.intensity = THREE.MathUtils.damp(
        hemiLightRef.current.intensity,
        preset.hemiIntensity + stormFlash * 0.45,
        4,
        dt
      );
    }

    if (keyLightRef.current) {
      _targetKey.set(preset.keyColor);
      keyLightRef.current.color.lerp(_targetKey, colorBlend);
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity,
        preset.keyIntensity + stormFlash * 1.4,
        6,
        dt
      );
    }

    if (rimLightRef.current) {
      _targetRim.set(preset.rimColor);
      rimLightRef.current.color.lerp(_targetRim, colorBlend);
      rimLightRef.current.intensity = THREE.MathUtils.damp(
        rimLightRef.current.intensity,
        preset.rimIntensity + stormFlash * 0.6,
        4,
        dt
      );
    }

    scene.environmentIntensity = THREE.MathUtils.damp(
      scene.environmentIntensity,
      preset.envIntensity,
      3.5,
      dt
    );

    if (floorMatRef.current) {
      floorMatRef.current.roughness = THREE.MathUtils.damp(
        floorMatRef.current.roughness,
        preset.floorRoughness,
        2.8,
        dt
      );
      floorMatRef.current.metalness = THREE.MathUtils.damp(
        floorMatRef.current.metalness,
        preset.floorMetalness,
        2.8,
        dt
      );
    }

    if (pointsRef.current && !reducedMotion) {
      pointsRef.current.rotation.z += dt * 0.015;
    }

    if (accentLightRef.current) {
      _targetAccent.set(preset.accentColor);
      accentLightRef.current.color.lerp(_targetAccent, colorBlend);
      accentLightRef.current.intensity = THREE.MathUtils.damp(
        accentLightRef.current.intensity,
        preset.accentIntensity,
        3.5,
        dt
      );
      const targetZ = -scrollProgressRef.current * 116;
      accentLightRef.current.position.z = THREE.MathUtils.damp(
        accentLightRef.current.position.z,
        targetZ,
        4,
        dt
      );
      if (!reducedMotion) {
        accentLightRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 4;
      }
    }
  });

  return (
    <>
      <color ref={bgColorRef} attach="background" args={['#040714']} />
      <fogExp2 ref={fogRef} attach="fog" args={['#040714', 0.02]} />

      {/* Dynamic Weather-Responsive Studio Lighting Rig */}
      <hemisphereLight ref={hemiLightRef} args={['#38bdf8', '#090d24', 0.85]} />
      <directionalLight
        ref={keyLightRef}
        position={[12, 22, 10]}
        intensity={1.75}
        color="#f8fafc"
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight
        ref={rimLightRef}
        position={[-14, 10, -25]}
        intensity={0.85}
        color="#a78bfa"
      />
      <pointLight
        ref={accentLightRef}
        position={[0, 6, 0]}
        intensity={18}
        distance={32}
        decay={1.8}
        color="#38bdf8"
      />

      {/* Deep Multiverse Abyss Grid Floor well below floating island spires */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -6.2, -55]}
        receiveShadow={!isSoftwareGl}
      >
        <planeGeometry args={[140, 220]} />
        <meshStandardMaterial
          ref={floorMatRef}
          map={gridTexture}
          roughness={0.55}
          metalness={0.35}
          envMapIntensity={0.65}
        />
      </mesh>

      {/* Hero Core Stage Deck & Causeway Bridge connecting Core (z=0) to Hub Plaza (z=-18) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -3.5]} receiveShadow={!isSoftwareGl}>
        <planeGeometry args={[6.4, 21]} />
        <meshStandardMaterial color="#091024" roughness={0.42} metalness={0.58} envMapIntensity={0.65} />
      </mesh>
      <mesh position={[-1.4, 0.01, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 19]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.48} />
      </mesh>
      <mesh position={[1.4, 0.01, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 19]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.48} />
      </mesh>

      {/* Showcase Spine Deck for Events (-38), Lab (-58), Honors (-78), Gallery (-98), Contact (-116) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -80]} receiveShadow={!isSoftwareGl}>
        <planeGeometry args={[42, 92]} />
        <meshStandardMaterial
          map={gridTexture}
          roughness={0.48}
          metalness={0.42}
          envMapIntensity={0.65}
        />
      </mesh>
      <mesh position={[-1.4, 0.01, -80]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 90]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.42} />
      </mesh>
      <mesh position={[1.4, 0.01, -80]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 90]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.42} />
      </mesh>

      {/* Cosmic Starfield & Neon Dust */}
      <points ref={pointsRef} geometry={particleGeometry} frustumCulled={false}>
        <pointsMaterial
          size={0.14}
          vertexColors
          transparent
          opacity={weather === 'fog' ? 0.35 : 0.82}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
