import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

interface PostProcessingBloomProps {
  isLowPower: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  warpPulseRef: React.MutableRefObject<number>;
  intenseFactor: number; // 0..1 computed from overdrive, portal/multiverse focus, thruster, overdrive mode
  bloomEnabled?: boolean;
}

export function PostProcessingBloom({
  isLowPower,
  isSoftwareGl,
  reducedMotion,
  warpPulseRef,
  intenseFactor,
  bloomEnabled = true,
}: PostProcessingBloomProps) {
  const { gl, scene, camera, size } = useThree();

  const pipeline = useMemo(() => {
    if (isSoftwareGl || !bloomEnabled) return null;

    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    const bloomScale = isLowPower ? 0.5 : 1;

    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: gl.capabilities.isWebGL2 && !isLowPower ? 4 : 0,
    });

    const composer = new EffectComposer(gl, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, width * bloomScale), Math.max(1, height * bloomScale)),
      0.38, // base strength
      0.45, // radius
      0.84 // threshold
    );
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    return {
      renderTarget,
      composer,
      renderPass,
      bloomPass,
      outputPass,
    };
  }, [gl, scene, camera, isLowPower, isSoftwareGl, bloomEnabled]);

  // Keep composer & bloom resolution synced on viewport resize / DPR changes
  useEffect(() => {
    if (!pipeline) return;
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    const dpr = Math.min(gl.getPixelRatio(), isLowPower ? 1.25 : 2);
    const bloomScale = isLowPower ? 0.5 : 1;

    pipeline.composer.setPixelRatio(dpr);
    pipeline.composer.setSize(width, height);
    pipeline.bloomPass.resolution.set(
      Math.max(1, Math.floor(width * bloomScale)),
      Math.max(1, Math.floor(height * bloomScale))
    );
  }, [pipeline, gl, size.width, size.height, isLowPower]);

  // Keep active camera synced if R3F swaps cameras
  useEffect(() => {
    if (!pipeline) return;
    pipeline.renderPass.camera = camera;
  }, [pipeline, camera]);

  // Clean GPU disposal on unmount or capability toggle
  useEffect(() => {
    if (!pipeline) return;
    return () => {
      pipeline.bloomPass.dispose();
      pipeline.outputPass.dispose();
      pipeline.renderPass.dispose();
      pipeline.composer.dispose();
      pipeline.renderTarget.dispose();
    };
  }, [pipeline]);

  // Priority 1 hands final render execution to EffectComposer
  useFrame((state, delta) => {
    if (!pipeline) return;
    const dt = Math.min(delta, 0.05);
    const warp = warpPulseRef.current;

    // Modulate bloom strength, radius, and luminance threshold dynamically for intense scenes
    const baseStrength = reducedMotion ? 0.28 : 0.36;
    const targetStrength =
      baseStrength + intenseFactor * 0.34 + (reducedMotion ? 0 : warp * 0.58);
    const targetRadius = 0.42 + intenseFactor * 0.16 + (reducedMotion ? 0 : warp * 0.24);
    const targetThreshold = Math.max(
      0.66,
      0.86 - intenseFactor * 0.12 - (reducedMotion ? 0 : warp * 0.14)
    );

    // Subtle high-energy shimmer during intense scenes (no jarring strobe)
    const energyShimmer =
      !reducedMotion && intenseFactor > 0.25
        ? Math.sin(state.clock.elapsedTime * 3.2) * 0.035 * intenseFactor
        : 0;

    pipeline.bloomPass.strength = THREE.MathUtils.damp(
      pipeline.bloomPass.strength,
      targetStrength + energyShimmer,
      6,
      dt
    );
    pipeline.bloomPass.radius = THREE.MathUtils.damp(
      pipeline.bloomPass.radius,
      targetRadius,
      6,
      dt
    );
    pipeline.bloomPass.threshold = THREE.MathUtils.damp(
      pipeline.bloomPass.threshold,
      targetThreshold,
      6,
      dt
    );

    pipeline.composer.render();
  }, 1);

  return null;
}
