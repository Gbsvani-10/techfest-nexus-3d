import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Shared Geometry & Material Cache to reduce GPU memory & draw-state switches
const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.Material>();
const glbBufferCache = new Map<string, ArrayBuffer>();

export function getCachedGeometry(
  key: string,
  factory: () => THREE.BufferGeometry
): THREE.BufferGeometry {
  let geo = geometryCache.get(key);
  if (!geo) {
    geo = factory();
    geometryCache.set(key, geo);
  }
  return geo;
}

export function getCachedMaterial<T extends THREE.Material>(
  key: string,
  factory: () => T
): T {
  let mat = materialCache.get(key) as T | undefined;
  if (!mat) {
    mat = factory();
    materialCache.set(key, mat);
  }
  return mat;
}

export function disposeSharedResources(): void {
  geometryCache.forEach((g) => g.dispose());
  geometryCache.clear();
  materialCache.forEach((m) => m.dispose());
  materialCache.clear();
  glbBufferCache.clear();
}

// Build rich procedural multi-part CAD assemblies, export to real binary GLB,
// and load back through Three.js GLTFLoader so inspector uses genuine GLTF/GLB parsing.
function buildProceduralAssembly(modelId: string): THREE.Group {
  const root = new THREE.Group();
  root.name = `Assembly_${modelId}`;

  const matTitanium = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.92,
    roughness: 0.18,
  });
  const matDarkSlate = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.86,
    roughness: 0.28,
  });
  const matCyanCore = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.9,
    metalness: 0.45,
    roughness: 0.2,
  });
  const matVioletTrim = new THREE.MeshStandardMaterial({
    color: '#a78bfa',
    emissive: '#7c3aed',
    emissiveIntensity: 0.7,
    metalness: 0.72,
    roughness: 0.22,
  });

  if (modelId === 'quantum-turbine') {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.35, 24), matTitanium);
    hub.name = 'TurbineRotorHub';
    hub.rotation.x = Math.PI / 2;
    root.add(hub);

    const stator = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 16, 40), matDarkSlate);
    stator.name = 'StatorContainmentRing';
    root.add(stator);

    const innerCoil = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 12, 40), matCyanCore);
    innerCoil.name = 'SuperconductingCoil';
    root.add(innerCoil);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 24), matTitanium);
    nose.name = 'IntakeNoseCone';
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, 1.05);
    root.add(nose);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 0.55, 20), matDarkSlate);
    tail.name = 'ExhaustDiffuser';
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, -0.95);
    root.add(tail);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.34), matTitanium);
      blade.name = `ImpellerBlade_${i + 1}`;
      blade.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
      blade.rotation.z = a;
      blade.rotation.y = 0.35;
      root.add(blade);
    }
  } else if (modelId === 'sat-core') {
    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.95), matDarkSlate);
    bus.name = 'AvionicsChassisBus';
    root.add(bus);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 1.02), matTitanium);
    trim.name = 'ChassisCollar';
    root.add(trim);

    const portWing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 0.68), matCyanCore);
    portWing.name = 'SolarPanelPort';
    portWing.position.set(-1.35, 0, 0);
    root.add(portWing);

    const stbdWing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 0.68), matCyanCore);
    stbdWing.name = 'SolarPanelStarboard';
    stbdWing.position.set(1.35, 0, 0);
    root.add(stbdWing);

    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.12, 0.32, 24),
      matTitanium
    );
    dish.name = 'OpticalDishAperture';
    dish.position.set(0, 0.72, 0);
    root.add(dish);

    const feed = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), matVioletTrim);
    feed.name = 'LaserTransceiverNode';
    feed.position.set(0, 1.04, 0);
    root.add(feed);
  } else {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 1), matCyanCore);
    core.name = 'EmitterChamberCore';
    root.add(core);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 1.05, 24, 1, true),
      matTitanium
    );
    sleeve.name = 'SapphireContainmentSleeve';
    root.add(sleeve);

    const topFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.72, 0.24, 24), matDarkSlate);
    topFlange.name = 'UpperVacuumFlange';
    topFlange.position.set(0, 0.75, 0);
    root.add(topFlange);

    const botFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.84, 0.24, 24), matDarkSlate);
    botFlange.name = 'LowerVacuumFlange';
    botFlange.position.set(0, -0.75, 0);
    root.add(botFlange);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.08), matVioletTrim);
      fin.name = `RadiatorFinArray_${i + 1}`;
      fin.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82);
      fin.rotation.y = -a;
      root.add(fin);
    }
  }

  return root;
}

const exporter = new GLTFExporter();
const gltfLoader = new GLTFLoader();

export async function exportAndLoadProceduralGLB(modelId: string): Promise<GLTF> {
  let buffer = glbBufferCache.get(modelId);
  if (!buffer) {
    const sourceScene = buildProceduralAssembly(modelId);
    buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        sourceScene,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            const json = JSON.stringify(result);
            resolve(new TextEncoder().encode(json).buffer);
          }
        },
        (err) => reject(err),
        { binary: true }
      );
    });
    glbBufferCache.set(modelId, buffer);

    // Dispose temporary source assembly meshes
    sourceScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
        else m.material.dispose();
      }
    });
  }

  return new Promise<GLTF>((resolve, reject) => {
    gltfLoader.parse(buffer!, '', resolve, reject);
  });
}

export async function loadUploadedGLBFile(file: File): Promise<GLTF> {
  const buffer = await file.arrayBuffer();
  return new Promise<GLTF>((resolve, reject) => {
    gltfLoader.parse(buffer, '', resolve, reject);
  });
}
