import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  GalleryExhibit,
  GalleryHotspot,
  LabHotspot,
  MultiverseIsland,
} from '../../types/festival';

export interface CameraFocusOverride {
  position: [number, number, number];
  target: [number, number, number];
}

interface CameraRigProps {
  navMode: 'browse' | 'walk';
  overviewActive: boolean;
  warpPulseRef: React.MutableRefObject<number>;
  scrollProgressRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  orbitOffsetRef: React.MutableRefObject<{ yaw: number; pitch: number; zoom: number }>;
  selectedIsland: MultiverseIsland | null;
  selectedHotspot: LabHotspot | null;
  focusedExhibit: GalleryExhibit | null;
  galleryFocusMode: 'overview' | 'center' | 'pedestal';
  selectedGalleryHotspot: GalleryHotspot | null;
  activeSectionIndex: number;
  reducedMotion: boolean;
}

const WAYPOINTS: { pos: [number, number, number]; target: [number, number, number] }[] = [
  { pos: [0, 2.25, 8.8], target: [0, 1.85, 0] }, // 0: Hero Core
  { pos: [0, 10.6, 1.5], target: [0, 2.2, -19.5] }, // 1: Multiverse Archipelago
  { pos: [0, 2.55, -28.2], target: [0, 2.1, -38.5] }, // 2: Events Arc
  { pos: [2.2, 2.95, -51.4], target: [0.25, 1.75, -58] }, // 3: Innovation Lab
  { pos: [0, 2.5, -71.2], target: [0, 1.5, -78] }, // 4: Achievements Trophy
  { pos: [0, 3.35, -89.4], target: [0, 1.55, -98.0] }, // 5: 3D Exhibition Gallery
  { pos: [0, 2.5, -108.2], target: [0, 2.1, -116] }, // 6: Contact Beacon
];

const OVERVIEW_CAM = {
  pos: [0, 18.2, 10.2] as [number, number, number],
  target: [0, 2.0, -18.5] as [number, number, number],
};

// Pre-allocated math scratchpads (zero GC inside useFrame)
const _basePos = new THREE.Vector3();
const _baseTarget = new THREE.Vector3();
const _offsetVec = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.85, 0);
const _spherical = new THREE.Spherical();

export function CameraRig({
  navMode,
  overviewActive,
  warpPulseRef,
  scrollProgressRef,
  pointerRef,
  orbitOffsetRef,
  selectedIsland,
  selectedHotspot,
  focusedExhibit,
  galleryFocusMode,
  selectedGalleryHotspot,
  activeSectionIndex,
  reducedMotion,
}: CameraRigProps) {
  const { camera } = useThree();
  const initializedRef = useRef(false);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Smooth cinematic FOV pulse during portal warps
    if (camera instanceof THREE.PerspectiveCamera) {
      if (warpPulseRef.current > 0.001) {
        warpPulseRef.current = THREE.MathUtils.damp(warpPulseRef.current, 0, 4.5, dt);
      }
      const targetFov = 48 + warpPulseRef.current * 18;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
        camera.updateProjectionMatrix();
      }
    }

    if (navMode === 'walk') {
      return;
    }

    const dampSpeed = reducedMotion ? 16 : 5.2;

    if (!initializedRef.current) {
      camera.position.set(...WAYPOINTS[0].pos);
      _currentLook.set(...WAYPOINTS[0].target);
      camera.lookAt(_currentLook);
      initializedRef.current = true;
    }

    // 1. Overview Camera showing the entire 5-island Multiverse & Central Core
    if (overviewActive) {
      _basePos.set(...OVERVIEW_CAM.pos);
      _baseTarget.set(...OVERVIEW_CAM.target);
    } else if (activeSectionIndex === 1 && selectedIsland) {
      const [wx, wy, wz] = selectedIsland.worldPosition;
      _baseTarget.set(wx, wy + 1.35, wz);
      _basePos.set(
        wx + selectedIsland.cameraOffset[0],
        wy + selectedIsland.cameraOffset[1],
        wz + selectedIsland.cameraOffset[2]
      );
    } else if (activeSectionIndex === 3 && selectedHotspot) {
      const worldX = selectedHotspot.localPosition[0];
      const worldY = selectedHotspot.localPosition[1];
      const worldZ = -58 + selectedHotspot.localPosition[2];
      _baseTarget.set(worldX, worldY, worldZ);
      _basePos.set(
        worldX + selectedHotspot.cameraOffset[0],
        worldY + selectedHotspot.cameraOffset[1],
        worldZ + selectedHotspot.cameraOffset[2]
      );
    } else if (activeSectionIndex === 5 && selectedGalleryHotspot) {
      const hx = selectedGalleryHotspot.localPosition[0] * 1.38;
      const hy = 0.49 + selectedGalleryHotspot.localPosition[1] * 1.38;
      const hz = -97.4 + selectedGalleryHotspot.localPosition[2] * 1.38;
      _baseTarget.set(hx, hy, hz);
      _basePos.set(
        hx + selectedGalleryHotspot.cameraOffset[0] * 1.08,
        hy + selectedGalleryHotspot.cameraOffset[1] * 0.9,
        hz + selectedGalleryHotspot.cameraOffset[2] * 1.08
      );
    } else if (activeSectionIndex === 5 && galleryFocusMode === 'center') {
      _baseTarget.set(0, 1.32, -97.4);
      _basePos.set(0, 2.25, -92.6);
    } else if (
      activeSectionIndex === 5 &&
      galleryFocusMode === 'pedestal' &&
      focusedExhibit
    ) {
      const [ex, ey, ez] = focusedExhibit.position;
      _baseTarget.set(ex, ey + 0.55, ez);
      const normalX = Math.sin(focusedExhibit.rotationY) * 3.85;
      const normalZ = Math.cos(focusedExhibit.rotationY) * 3.85;
      _basePos.set(ex + normalX, ey + 1.25, ez + normalZ);
    } else {
      // 2. Interpolate smoothly along the 7-station scroll spine
      const clampedProgress = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1);
      const scaled = clampedProgress * (WAYPOINTS.length - 1);
      const idxA = Math.floor(scaled);
      const idxB = Math.min(idxA + 1, WAYPOINTS.length - 1);
      const frac = scaled - idxA;
      const t = frac * frac * (3 - 2 * frac);

      const wpA = WAYPOINTS[idxA];
      const wpB = WAYPOINTS[idxB];

      _basePos.set(
        THREE.MathUtils.lerp(wpA.pos[0], wpB.pos[0], t),
        THREE.MathUtils.lerp(wpA.pos[1], wpB.pos[1], t),
        THREE.MathUtils.lerp(wpA.pos[2], wpB.pos[2], t)
      );
      _baseTarget.set(
        THREE.MathUtils.lerp(wpA.target[0], wpB.target[0], t),
        THREE.MathUtils.lerp(wpA.target[1], wpB.target[1], t),
        THREE.MathUtils.lerp(wpA.target[2], wpB.target[2], t)
      );
    }

    // 3. Apply user drag-to-rotate spherical orbit + zoom offset around _baseTarget
    _offsetVec.copy(_basePos).sub(_baseTarget);
    _spherical.setFromVector3(_offsetVec);
    _spherical.theta += orbitOffsetRef.current.yaw;
    _spherical.phi = THREE.MathUtils.clamp(
      _spherical.phi + orbitOffsetRef.current.pitch,
      0.22,
      Math.PI / 2 - 0.04
    );
    _spherical.radius = THREE.MathUtils.clamp(
      _spherical.radius + orbitOffsetRef.current.zoom,
      2.4,
      overviewActive ? 38 : 26
    );

    _offsetVec.setFromSpherical(_spherical);
    _desiredPos.copy(_baseTarget).add(_offsetVec);

    // 4. Subtle mouse parallax when not in reduced motion
    if (!reducedMotion) {
      _desiredPos.x += pointerRef.current.x * 0.35;
      _desiredPos.y += pointerRef.current.y * 0.2;
    }

    // 5. Frame-rate independent exponential damping
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredPos.x, dampSpeed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredPos.y, dampSpeed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredPos.z, dampSpeed, dt);

    _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _baseTarget.x, dampSpeed + 1, dt);
    _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _baseTarget.y, dampSpeed + 1, dt);
    _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _baseTarget.z, dampSpeed + 1, dt);

    camera.lookAt(_currentLook);
  });

  return null;
}
