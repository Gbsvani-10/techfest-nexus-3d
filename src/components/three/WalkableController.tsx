import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MULTIVERSE_ISLANDS, NEXUS_CRYSTALS, PORTALS } from '../../data/festivalData';
import type { IslandId, PlayerTelemetry } from '../../types/festival';
import { resolveWalkablePosition } from '../../utils/multiverseTerrain';

interface WalkableControllerProps {
  active: boolean;
  touchMoveRef: React.MutableRefObject<{ x: number; y: number }>;
  walkTeleportRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
  } | null>;
  collectedCrystalIds: string[];
  onTelemetryUpdate: (telemetry: PlayerTelemetry) => void;
  onInteractNearby: () => void;
}

const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.55;
const WALK_SPEED = 6.5;

// Pre-allocated math vectors (zero per-frame allocations)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export function WalkableController({
  active,
  touchMoveRef,
  walkTeleportRef,
  collectedCrystalIds,
  onTelemetryUpdate,
  onInteractNearby,
}: WalkableControllerProps) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const playerPosRef = useRef(new THREE.Vector3(0, EYE_HEIGHT, -13.5));
  const groundYRef = useRef(0);
  const yawRef = useRef(0); // 0 = looking toward -Z into the Multiverse Hub
  const pitchRef = useRef(-0.04);
  const dragLookRef = useRef<{
    active: boolean;
    pointerId: number | null;
    lastX: number;
    lastY: number;
  }>({ active: false, pointerId: null, lastX: 0, lastY: 0 });
  const lastEmitRef = useRef(0);

  // Reset spawn at the Multiverse Hub entrance when entering Walk Mode
  useEffect(() => {
    if (!active) return;
    if (walkTeleportRef.current) {
      const tp = walkTeleportRef.current;
      playerPosRef.current.set(tp.x, tp.y + EYE_HEIGHT, tp.z);
      groundYRef.current = tp.y;
      yawRef.current = tp.yaw;
      walkTeleportRef.current = null;
    } else {
      playerPosRef.current.set(0, EYE_HEIGHT, -13.5);
      groundYRef.current = 0;
      yawRef.current = 0;
    }
    pitchRef.current = -0.04;
  }, [active, walkTeleportRef]);

  // Keyboard listeners for WASD, Arrow keys, and E interact
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      keysRef.current[e.code] = true;
      if (e.code === 'KeyE') {
        onInteractNearby();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (dragLookRef.current.active) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, select, textarea, [data-hud]')) {
        return;
      }
      dragLookRef.current = {
        active: true,
        pointerId: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragLookRef.current.active || e.pointerId !== dragLookRef.current.pointerId) return;
      const dx = e.clientX - dragLookRef.current.lastX;
      const dy = e.clientY - dragLookRef.current.lastY;
      dragLookRef.current.lastX = e.clientX;
      dragLookRef.current.lastY = e.clientY;

      yawRef.current -= dx * 0.0045;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - dy * 0.0038,
        -0.55,
        0.65
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === dragLookRef.current.pointerId) {
        dragLookRef.current.active = false;
        dragLookRef.current.pointerId = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      keysRef.current = {};
      dragLookRef.current = { active: false, pointerId: null, lastX: 0, lastY: 0 };
    };
  }, [active, onInteractNearby]);

  useFrame((state, delta) => {
    if (!active) return;
    const dt = Math.min(delta, 0.05);

    // Handle instant inter-island portal warp inside Walk Mode
    if (walkTeleportRef.current) {
      const tp = walkTeleportRef.current;
      playerPosRef.current.set(tp.x, tp.y + EYE_HEIGHT, tp.z);
      groundYRef.current = tp.y;
      yawRef.current = tp.yaw;
      walkTeleportRef.current = null;
    }

    const keys = keysRef.current;
    if (keys['KeyQ']) yawRef.current += dt * 1.8;
    if (keys['KeyR']) pitchRef.current = THREE.MathUtils.clamp(pitchRef.current + dt, -0.55, 0.65);

    const forwardInput =
      (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
      (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) +
      touchMoveRef.current.y;

    const strafeInput =
      (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
      (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) +
      touchMoveRef.current.x;

    _forward.set(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
    _right.set(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));

    _move.set(0, 0, 0);
    _move.addScaledVector(_forward, forwardInput);
    _move.addScaledVector(_right, strafeInput);

    const prevX = playerPosRef.current.x;
    const prevZ = playerPosRef.current.z;
    let nextX = prevX;
    let nextZ = prevZ;

    if (_move.lengthSq() > 0.0001) {
      if (_move.lengthSq() > 1) _move.normalize();
      nextX += _move.x * WALK_SPEED * dt;
      nextZ += _move.z * WALK_SPEED * dt;
    }

    // Resolve walkable Multiverse Hub, Sky-Bridges, and 5 Floating Island decks
    const surface = resolveWalkablePosition(nextX, nextZ, prevX, prevZ);
    playerPosRef.current.x = surface.x;
    playerPosRef.current.z = surface.z;
    groundYRef.current = THREE.MathUtils.damp(groundYRef.current, surface.y, 10, dt);
    playerPosRef.current.y = groundYRef.current + EYE_HEIGHT;

    // Collision against Central Energy Core Plinth (0,0,0)
    const coreDist = Math.hypot(playerPosRef.current.x, playerPosRef.current.z);
    const coreMin = 2.95 + PLAYER_RADIUS;
    if (coreDist < coreMin && coreDist > 0.001) {
      playerPosRef.current.x = (playerPosRef.current.x / coreDist) * coreMin;
      playerPosRef.current.z = (playerPosRef.current.z / coreDist) * coreMin;
    }

    // Collision & proximity detection against each Island's central landmark and inter-island portal
    let nearbyIslandId: IslandId | null = null;
    let nearbyIslandPortalTarget: IslandId | null = null;

    for (let i = 0; i < MULTIVERSE_ISLANDS.length; i++) {
      const isl = MULTIVERSE_ISLANDS[i];
      const ix = isl.worldPosition[0];
      const iz = isl.worldPosition[2];
      const dx = playerPosRef.current.x - ix;
      const dz = playerPosRef.current.z - iz;
      const dist = Math.hypot(dx, dz);
      const minDist = isl.collisionRadius + PLAYER_RADIUS;

      if (dist < minDist && dist > 0.001) {
        playerPosRef.current.x = ix + (dx / dist) * minDist;
        playerPosRef.current.z = iz + (dz / dist) * minDist;
      }

      if (dist < isl.collisionRadius + 1.45 && Math.abs(groundYRef.current - isl.worldPosition[1]) < 0.7) {
        nearbyIslandId = isl.id;
      }

      // Inter-island portal proximity
      const px = ix + isl.portalLocalPos[0];
      const pz = iz + isl.portalLocalPos[2];
      const pDist = Math.hypot(playerPosRef.current.x - px, playerPosRef.current.z - pz);
      if (pDist < 1.65 && Math.abs(groundYRef.current - isl.worldPosition[1]) < 0.7) {
        nearbyIslandPortalTarget = isl.connectedPortalTargetId;
      }
    }

    // Proximity detection for Central Hub Portals
    let nearbyPortalId: string | null = null;
    if (groundYRef.current < 0.6) {
      for (let i = 0; i < PORTALS.length; i++) {
        const p = PORTALS[i];
        const dist = Math.hypot(
          playerPosRef.current.x - p.worldPosition[0],
          playerPosRef.current.z - p.worldPosition[2]
        );
        if (dist < 2.1) {
          nearbyPortalId = p.id;
          break;
        }
      }
    }

    // Proximity detection for uncollected Crystals on islands
    let nearbyCrystalId: string | null = null;
    for (let i = 0; i < NEXUS_CRYSTALS.length; i++) {
      const c = NEXUS_CRYSTALS[i];
      if (collectedCrystalIds.includes(c.id)) continue;
      const dist = Math.hypot(
        playerPosRef.current.x - c.worldPosition[0],
        playerPosRef.current.z - c.worldPosition[2]
      );
      if (dist < 1.85 && Math.abs(groundYRef.current + 1.15 - c.worldPosition[1]) < 1.0) {
        nearbyCrystalId = c.id;
        break;
      }
    }

    // Smooth camera placement at eye level
    camera.position.x = THREE.MathUtils.damp(camera.position.x, playerPosRef.current.x, 12, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, playerPosRef.current.y, 12, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, playerPosRef.current.z, 12, dt);

    const cosPitch = Math.cos(pitchRef.current);
    _lookTarget.set(
      camera.position.x - Math.sin(yawRef.current) * cosPitch * 5,
      camera.position.y + Math.sin(pitchRef.current) * 5,
      camera.position.z - Math.cos(yawRef.current) * cosPitch * 5
    );
    camera.lookAt(_lookTarget);

    // Throttled telemetry emission (~12 Hz) for Minimap & Island HUD
    if (state.clock.elapsedTime - lastEmitRef.current > 0.08) {
      lastEmitRef.current = state.clock.elapsedTime;
      onTelemetryUpdate({
        x: playerPosRef.current.x,
        y: groundYRef.current,
        z: playerPosRef.current.z,
        yaw: yawRef.current,
        currentIslandId: surface.currentIslandId,
        nearbyIslandId,
        nearbyIslandPortalTarget,
        nearbyPortalId,
        nearbyCrystalId,
      });
    }
  });

  return null;
}
