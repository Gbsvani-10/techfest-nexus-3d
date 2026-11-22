import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeatherMode } from '../../types/festival';

interface WeatherSystemProps {
  weather: WeatherMode;
  isLowPower: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

const RAIN_VERT = `
  attribute vec3 aOffset;
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uWind;
  uniform vec3 uCameraPos;
  varying vec2 vUv;
  varying float vSeed;

  void main() {
    vUv = uv;
    vSeed = aSeed.w;

    vec3 boxSize = vec3(34.0, 18.0, 34.0);
    vec3 halfBox = boxSize * 0.5;

    float speed = 17.0 + aSeed.x * 9.0;
    vec3 animated = aOffset;
    animated.y -= uTime * speed;
    animated.x += uTime * uWind * speed * 0.16;

    // Wrap modularly around active camera position so weather follows the user everywhere
    vec3 worldCenter = mod(animated - uCameraPos + halfBox, boxSize) - halfBox + uCameraPos;

    // Align streak along tilted fall vector in view space
    vec3 fallDir = normalize(vec3(uWind * 0.16, -1.0, 0.04));
    vec2 viewDir = (viewMatrix * vec4(fallDir, 0.0)).xy;
    float dirLen = max(length(viewDir), 0.001);
    viewDir /= dirLen;
    vec2 viewPerp = vec2(-viewDir.y, viewDir.x);

    vec4 mvCenter = viewMatrix * vec4(worldCenter, 1.0);
    float dropLength = 0.65 + aSeed.y * 0.65;
    float dropWidth = 0.022 + aSeed.z * 0.014;
    mvCenter.xy += viewPerp * (position.x * dropWidth) + viewDir * (position.y * dropLength);

    gl_Position = projectionMatrix * mvCenter;
  }
`;

const RAIN_FRAG = `
  uniform float uOpacity;
  uniform float uFlash;
  varying vec2 vUv;
  varying float vSeed;

  void main() {
    if (uOpacity <= 0.005) discard;

    // Tapered rain streak profile: crisp center, soft top/bottom edges
    float horiz = 1.0 - abs(vUv.x * 2.0 - 1.0);
    horiz = pow(clamp(horiz, 0.0, 1.0), 1.8);

    float vert = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
    float shimmer = 0.72 + 0.28 * fract(vSeed * 13.37);

    float alpha = horiz * vert * uOpacity * shimmer * (0.62 + uFlash * 0.35);
    if (alpha < 0.01) discard;

    vec3 baseCol = mix(vec3(0.42, 0.78, 0.98), vec3(0.88, 0.96, 1.0), vert * 0.7 + uFlash * 0.3);
    gl_FragColor = vec4(baseCol, alpha);
  }
`;

const SNOW_VERT = `
  attribute vec3 aOffset;
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uCameraPos;
  varying vec2 vUv;
  varying float vTwinkle;

  void main() {
    vUv = uv;
    vTwinkle = 0.65 + 0.35 * sin(uTime * 2.2 + aSeed.w * 6.2831);

    vec3 boxSize = vec3(32.0, 16.0, 32.0);
    vec3 halfBox = boxSize * 0.5;

    float fallSpeed = 1.35 + aSeed.x * 1.15;
    vec3 animated = aOffset;
    animated.y -= uTime * fallSpeed;
    animated.x += sin(uTime * (0.7 + aSeed.y * 0.6) + aSeed.w * 6.2831) * 1.15;
    animated.z += cos(uTime * (0.6 + aSeed.z * 0.5) + aSeed.w * 4.12) * 1.15;

    vec3 worldCenter = mod(animated - uCameraPos + halfBox, boxSize) - halfBox + uCameraPos;

    float flakeSize = 0.09 + aSeed.y * 0.11;
    vec4 mvCenter = viewMatrix * vec4(worldCenter, 1.0);
    mvCenter.xy += position.xy * flakeSize;

    gl_Position = projectionMatrix * mvCenter;
  }
`;

const SNOW_FRAG = `
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vTwinkle;

  void main() {
    if (uOpacity <= 0.005) discard;

    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    // 6-fold subtle crystalline frost star + soft Gaussian core
    float angle = atan(p.y, p.x);
    float crystal = 0.78 + 0.22 * cos(angle * 6.0);
    float softDisc = smoothstep(1.0, 0.12, r / crystal);
    float core = smoothstep(0.45, 0.0, r);

    float alpha = (softDisc * 0.75 + core * 0.35) * uOpacity * vTwinkle;
    if (alpha < 0.01) discard;

    vec3 snowCol = mix(vec3(0.75, 0.91, 1.0), vec3(0.96, 0.99, 1.0), core);
    gl_FragColor = vec4(snowCol, alpha);
  }
`;

const FOG_VERT = `
  attribute vec3 aOffset;
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uCameraPos;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDistFade;

  void main() {
    vUv = uv;
    vSeed = aSeed.w;

    vec3 boxSize = vec3(42.0, 8.0, 46.0);
    vec3 halfBox = boxSize * 0.5;

    vec3 animated = aOffset;
    animated.x += uTime * (0.45 + aSeed.x * 0.45) * (aSeed.z > 0.5 ? 1.0 : -1.0);
    animated.z += sin(uTime * 0.2 + aSeed.w * 6.2831) * 1.4;

    // Keep mist anchored close to city ground plane while wrapping X/Z around camera
    vec3 camAnchor = vec3(uCameraPos.x, 3.2, uCameraPos.z);
    vec3 worldCenter = mod(animated - camAnchor + halfBox, boxSize) - halfBox + camAnchor;
    worldCenter.y = 0.85 + aSeed.y * 4.4;

    float camDist = length(worldCenter - uCameraPos);
    vDistFade = smoothstep(2.5, 8.0, camDist) * smoothstep(28.0, 14.0, camDist);

    float w = 13.0 + aSeed.x * 8.0;
    float h = 5.5 + aSeed.y * 3.5;

    vec4 mvCenter = viewMatrix * vec4(worldCenter, 1.0);
    mvCenter.xy += vec2(position.x * w, position.y * h);
    gl_Position = projectionMatrix * mvCenter;
  }
`;

const FOG_FRAG = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDistFade;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    if (uOpacity <= 0.005) discard;

    vec2 centered = vUv * 2.0 - 1.0;
    float radial = 1.0 - smoothstep(0.15, 1.0, length(centered * vec2(0.92, 1.15)));
    if (radial <= 0.005) discard;

    vec2 flowUv = vUv * vec2(2.6, 1.8) + vec2(uTime * 0.055 + vSeed * 5.0, -uTime * 0.02);
    float wisp = fbm(flowUv);
    float density = smoothstep(0.28, 0.82, wisp) * radial * vDistFade;

    float alpha = density * uOpacity * 0.34;
    if (alpha < 0.005) discard;

    vec3 mistTint = mix(uFogColor, vec3(0.45, 0.72, 0.82), wisp * 0.38);
    gl_FragColor = vec4(mistTint, alpha);
  }
`;

function createInstancedQuadGeometry(
  count: number,
  spreadX: number,
  spreadY: number,
  spreadZ: number
): THREE.InstancedBufferGeometry {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;

  const offsets = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const h1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
    const h2 = Math.sin(i * 78.233 + 4.56) * 24634.6345;
    const h3 = Math.sin(i * 39.425 + 7.89) * 19532.1234;
    const h4 = Math.sin(i * 93.117 + 2.71) * 31415.9265;

    const r1 = h1 - Math.floor(h1);
    const r2 = h2 - Math.floor(h2);
    const r3 = h3 - Math.floor(h3);
    const r4 = h4 - Math.floor(h4);

    offsets[i * 3] = (r1 - 0.5) * spreadX;
    offsets[i * 3 + 1] = r2 * spreadY;
    offsets[i * 3 + 2] = (r3 - 0.5) * spreadZ;

    seeds[i * 4] = r2;
    seeds[i * 4 + 1] = r3;
    seeds[i * 4 + 2] = r1;
    seeds[i * 4 + 3] = r4;
  }

  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;
  return geo;
}

export function WeatherSystem({
  weather,
  isLowPower,
  isSoftwareGl,
  reducedMotion,
}: WeatherSystemProps) {
  const { camera } = useThree();

  const rainCount = isLowPower || isSoftwareGl ? 480 : 1200;
  const snowCount = isLowPower || isSoftwareGl ? 320 : 820;
  const fogCount = isLowPower || isSoftwareGl ? 10 : 18;

  const rainGeo = useMemo(
    () => createInstancedQuadGeometry(rainCount, 34, 18, 34),
    [rainCount]
  );
  const snowGeo = useMemo(
    () => createInstancedQuadGeometry(snowCount, 32, 16, 32),
    [snowCount]
  );
  const fogGeo = useMemo(
    () => createInstancedQuadGeometry(fogCount, 42, 8, 46),
    [fogCount]
  );

  const rainMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: 0.75 },
          uOpacity: { value: 0 },
          uFlash: { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
        },
        vertexShader: RAIN_VERT,
        fragmentShader: RAIN_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const snowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
        },
        vertexShader: SNOW_VERT,
        fragmentShader: SNOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const fogMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uFogColor: { value: new THREE.Color('#22d3ee') },
          uCameraPos: { value: new THREE.Vector3() },
        },
        vertexShader: FOG_VERT,
        fragmentShader: FOG_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    []
  );

  useEffect(() => {
    return () => {
      rainGeo.dispose();
      snowGeo.dispose();
      fogGeo.dispose();
      rainMat.dispose();
      snowMat.dispose();
      fogMat.dispose();
    };
  }, [rainGeo, snowGeo, fogGeo, rainMat, snowMat, fogMat]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const timeStep = reducedMotion ? dt * 0.06 : dt;

    rainMat.uniforms.uTime.value += timeStep;
    snowMat.uniforms.uTime.value += timeStep;
    fogMat.uniforms.uTime.value += timeStep;

    rainMat.uniforms.uCameraPos.value.copy(camera.position);
    snowMat.uniforms.uCameraPos.value.copy(camera.position);
    fogMat.uniforms.uCameraPos.value.copy(camera.position);

    rainMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
      rainMat.uniforms.uOpacity.value,
      weather === 'rain' ? 0.92 : 0,
      4.5,
      dt
    );
    snowMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
      snowMat.uniforms.uOpacity.value,
      weather === 'snow' ? 0.88 : 0,
      3.5,
      dt
    );
    fogMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
      fogMat.uniforms.uOpacity.value,
      weather === 'fog' ? 1.0 : weather === 'rain' ? 0.28 : 0,
      3.0,
      dt
    );

    if (weather === 'rain' && !reducedMotion) {
      const cycle = state.clock.elapsedTime % 9.5;
      const pulse =
        cycle > 9.15 ? Math.sin(((cycle - 9.15) / 0.35) * Math.PI) : 0;
      rainMat.uniforms.uFlash.value = THREE.MathUtils.damp(
        rainMat.uniforms.uFlash.value,
        pulse,
        14,
        dt
      );
    } else {
      rainMat.uniforms.uFlash.value = THREE.MathUtils.damp(
        rainMat.uniforms.uFlash.value,
        0,
        8,
        dt
      );
    }
  });

  return (
    <group>
      <mesh geometry={rainGeo} material={rainMat} frustumCulled={false} renderOrder={4} />
      <mesh geometry={snowGeo} material={snowMat} frustumCulled={false} renderOrder={4} />
      <mesh geometry={fogGeo} material={fogMat} frustumCulled={false} renderOrder={3} />
    </group>
  );
}
