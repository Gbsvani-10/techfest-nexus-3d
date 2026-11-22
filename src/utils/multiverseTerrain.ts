import { CITY_CENTER_Z, HUB_PLAZA_RADIUS, MULTIVERSE_ISLANDS } from '../data/festivalData';
import type { IslandId } from '../types/festival';

export interface SkyBridgeDef {
  islandId: IslandId;
  accentColor: string;
  startX: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  midX: number;
  midY: number;
  midZ: number;
  horizLen: number;
  fullLen: number;
  yaw: number;
  pitch: number;
}

export const SKY_BRIDGES: SkyBridgeDef[] = MULTIVERSE_ISLANDS.map((island) => {
  const [ix, iy, iz] = island.worldPosition;
  const dx = ix - 0;
  const dz = iz - CITY_CENTER_Z;
  const centerDist = Math.hypot(dx, dz);
  const ux = dx / centerDist;
  const uz = dz / centerDist;

  // Start slightly inside the hub plaza rim and end slightly inside the island deck rim
  const startR = HUB_PLAZA_RADIUS - 0.45;
  const endDist = centerDist - (island.deckRadius - 0.45);

  const startX = ux * startR;
  const startZ = CITY_CENTER_Z + uz * startR;
  const endX = ux * endDist;
  const endZ = CITY_CENTER_Z + uz * endDist;

  const segDx = endX - startX;
  const segDz = endZ - startZ;
  const horizLen = Math.hypot(segDx, segDz);
  const fullLen = Math.hypot(horizLen, iy);

  // Direction along bridge from start -> end
  const yaw = Math.atan2(segDx, segDz);
  const pitch = Math.atan2(iy, horizLen);

  return {
    islandId: island.id,
    accentColor: island.accentColor,
    startX,
    startZ,
    endX,
    endY: iy,
    endZ,
    midX: (startX + endX) * 0.5,
    midY: iy * 0.5,
    midZ: (startZ + endZ) * 0.5,
    horizLen,
    fullLen,
    yaw,
    pitch,
  };
});

const BRIDGE_HALF_WIDTH = 1.05;

function sampleSurfaceAt(x: number, z: number): {
  valid: boolean;
  y: number;
  currentIslandId: IslandId | null;
} {
  // 1. Check all 5 floating island decks
  for (let i = 0; i < MULTIVERSE_ISLANDS.length; i++) {
    const isl = MULTIVERSE_ISLANDS[i];
    const dist = Math.hypot(x - isl.worldPosition[0], z - isl.worldPosition[2]);
    if (dist <= isl.deckRadius - 0.3) {
      return { valid: true, y: isl.worldPosition[1], currentIslandId: isl.id };
    }
  }

  // 2. Check all 5 sky-bridges
  for (let i = 0; i < SKY_BRIDGES.length; i++) {
    const b = SKY_BRIDGES[i];
    const vx = b.endX - b.startX;
    const vz = b.endZ - b.startZ;
    const lenSq = vx * vx + vz * vz;
    if (lenSq < 0.001) continue;
    const t = ((x - b.startX) * vx + (z - b.startZ) * vz) / lenSq;
    if (t >= -0.05 && t <= 1.05) {
      const projX = b.startX + t * vx;
      const projZ = b.startZ + t * vz;
      const perpDist = Math.hypot(x - projX, z - projZ);
      if (perpDist <= BRIDGE_HALF_WIDTH) {
        const clampedT = Math.max(0, Math.min(1, t));
        return { valid: true, y: clampedT * b.endY, currentIslandId: null };
      }
    }
  }

  // 3. Check Central Multiverse Hub Plaza
  if (Math.hypot(x, z - CITY_CENTER_Z) <= HUB_PLAZA_RADIUS - 0.3) {
    return { valid: true, y: 0, currentIslandId: null };
  }

  // 4. Check Central Core Causeway connecting Hero Core (0,0,0) to Hub Plaza (0,0,-18)
  if (Math.abs(x) <= 3.1 && z >= -18.5 && z <= 5.2) {
    return { valid: true, y: 0, currentIslandId: null };
  }

  return { valid: false, y: 0, currentIslandId: null };
}

export function resolveWalkablePosition(
  nextX: number,
  nextZ: number,
  prevX: number,
  prevZ: number
): { x: number; y: number; z: number; currentIslandId: IslandId | null } {
  const full = sampleSurfaceAt(nextX, nextZ);
  if (full.valid) {
    return { x: nextX, y: full.y, z: nextZ, currentIslandId: full.currentIslandId };
  }

  // Try sliding along X or Z independently for smooth railing collision
  const slideX = sampleSurfaceAt(nextX, prevZ);
  if (slideX.valid) {
    return { x: nextX, y: slideX.y, z: prevZ, currentIslandId: slideX.currentIslandId };
  }

  const slideZ = sampleSurfaceAt(prevX, nextZ);
  if (slideZ.valid) {
    return { x: prevX, y: slideZ.y, z: nextZ, currentIslandId: slideZ.currentIslandId };
  }

  const fallback = sampleSurfaceAt(prevX, prevZ);
  return {
    x: prevX,
    y: fallback.valid ? fallback.y : 0,
    z: prevZ,
    currentIslandId: fallback.currentIslandId,
  };
}
