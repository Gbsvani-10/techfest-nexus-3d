export type SectionId =
  | 'hero'
  | 'world'
  | 'events'
  | 'lab'
  | 'achievements'
  | 'gallery'
  | 'contact';

export type NavigationMode = 'browse' | 'walk';

export type WeatherMode = 'clear' | 'rain' | 'fog' | 'snow';

export interface WeatherPreset {
  id: WeatherMode;
  label: string;
  description: string;
  bgColor: string;
  fogColor: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  accentColor: string;
  accentIntensity: number;
  envIntensity: number;
  floorRoughness: number;
  floorMetalness: number;
}

export type IslandId = 'robotics' | 'ai' | 'gaming' | 'space' | 'innovation';

export interface MultiverseIsland {
  id: IslandId;
  name: string;
  shortName: string;
  sector: string;
  summary: string;
  capacity: string;
  schedule: string;
  featuredDemo: string;
  accentColor: string;
  secondaryColor: string;
  worldPosition: [number, number, number];
  cameraOffset: [number, number, number];
  deckRadius: number;
  collisionRadius: number;
  connectedPortalTargetId: IslandId;
  portalLocalPos: [number, number, number];
  portalRotationY: number;
  actionLabel: string;
  targetSection: SectionId;
}

export interface IslandInteractionState {
  roboticsMode: 'sweep' | 'precision' | 'overdrive';
  aiPulseCount: number;
  gamingMode: 'tournament' | 'pulse' | 'stealth';
  gamingCombo: number;
  spaceThrusterActive: boolean;
  innovationScanCount: number;
}

export interface CityZone {
  id: string;
  name: string;
  district: string;
  summary: string;
  capacity: string;
  schedule: string;
  featuredDemo: string;
  accentColor: string;
  localPosition: [number, number, number];
  cameraOffset: [number, number, number];
  collisionRadius: number;
  shape: 'dome' | 'spire' | 'hex' | 'arch' | 'citadel';
}

export interface PortalDef {
  id: string;
  name: string;
  destinationLabel: string;
  targetSection: SectionId;
  openInspector?: boolean;
  accentColor: string;
  secondaryColor: string;
  worldPosition: [number, number, number];
  rotationY: number;
  description: string;
}

export interface CrystalDef {
  id: string;
  name: string;
  color: string;
  worldPosition: [number, number, number];
  slotPosition: [number, number, number];
  targetStep: number; // 0..7 (45-degree increments)
  initialStep: number;
}

export interface InspectorHotspot {
  id: string;
  name: string;
  partName: string;
  specs: string;
  description: string;
  position: [number, number, number];
}

export interface InspectorModelDef {
  id: string;
  name: string;
  category: string;
  description: string;
  hotspots: InspectorHotspot[];
}

export interface EventTrack {
  id: string;
  title: string;
  category: string;
  dateLabel: string;
  venue: string;
  prizeOrFormat: string;
  description: string;
  highlights: string[];
  accentColor: string;
  position: [number, number, number];
  rotationY: number;
  emblem: 'robotics' | 'ai' | 'hackathon' | 'gaming' | 'arvr' | 'talks';
}

export interface LabHotspot {
  id: string;
  name: string;
  subsystem: string;
  specs: string;
  description: string;
  localPosition: [number, number, number];
  cameraOffset: [number, number, number];
}

export interface AchievementStat {
  id: string;
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  note: string;
}

export interface AchievementAward {
  id: string;
  title: string;
  category: string;
  grant: string;
  criteria: string;
}

export interface LeaderboardEntry {
  rank: number;
  team: string;
  track: string;
  points: number;
  status: string;
}

export type GalleryCategoryId =
  | 'all'
  | 'robotics'
  | 'ai'
  | 'space'
  | 'automotive'
  | 'gaming'
  | 'future';

export interface GalleryHotspot {
  id: string;
  label: string;
  subsystem: string;
  specs: string;
  description: string;
  localPosition: [number, number, number];
  cameraOffset: [number, number, number];
}

export interface GalleryExhibit {
  id: string;
  category: Exclude<GalleryCategoryId, 'all'>;
  categoryLabel: string;
  shortCategory: string;
  title: string;
  subtitle: string;
  discipline: string;
  year: string;
  curatorNote: string;
  specs: { label: string; value: string }[];
  accentColor: string;
  secondaryColor: string;
  imageUrl: string;
  aspect: '16:9' | '4:3';
  position: [number, number, number];
  rotationY: number;
  hotspots: GalleryHotspot[];
}

export interface DeviceCapabilities {
  webglSupported: boolean;
  isSoftwareGl: boolean;
  isLowPower: boolean;
  particleCount: number;
  dpr: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
}

export interface PlayerTelemetry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  currentIslandId: IslandId | null;
  nearbyIslandId: IslandId | null;
  nearbyIslandPortalTarget: IslandId | null;
  nearbyPortalId: string | null;
  nearbyCrystalId: string | null;
}

export interface ToastNotification {
  id: string;
  kind: 'crystal' | 'island' | 'overdrive';
  title: string;
  message: string;
  meta: string;
  accentColor: string;
}
