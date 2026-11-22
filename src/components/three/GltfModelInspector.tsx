import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { InspectorHotspot, InspectorModelDef } from '../../types/festival';
import { exportAndLoadProceduralGLB, loadUploadedGLBFile } from '../../utils/resourceCache';

interface InspectorStageProps {
  modelDef: InspectorModelDef;
  uploadedFile: File | null;
  explodedAmount: number;
  selectedHotspotId: string | null;
  onSelectHotspot: (hs: InspectorHotspot) => void;
  isSoftwareGl: boolean;
  onLoadedParts: (parts: string[]) => void;
}

interface ExplodablePart {
  mesh: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeDir: THREE.Vector3;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        mat.dispose();
      });
    }
  });
}

function InspectorScene({
  modelDef,
  uploadedFile,
  explodedAmount,
  selectedHotspotId,
  onSelectHotspot,
  isSoftwareGl,
  onLoadedParts,
}: InspectorStageProps) {
  const { scene, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const partsRef = useRef<ExplodablePart[]>([]);
  const [loadedScene, setLoadedScene] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    return () => {
      env.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);

  useEffect(() => {
    let active = true;
    let currentRoot: THREE.Object3D | null = null;

    const load = async () => {
      try {
        const gltf = uploadedFile
          ? await loadUploadedGLBFile(uploadedFile)
          : await exportAndLoadProceduralGLB(modelDef.id);

        if (!active) {
          disposeObjectTree(gltf.scene);
          return;
        }

        const root = gltf.scene;
        currentRoot = root;
        // Center & normalize scale to fit inspector viewport cleanly
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 2.6 / maxDim;

        root.position.sub(center.multiplyScalar(scale));
        root.scale.setScalar(scale);

        const parts: ExplodablePart[] = [];
        const names: string[] = [];

        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = !isSoftwareGl;
            mesh.receiveShadow = !isSoftwareGl;

            const basePos = mesh.position.clone();
            const dir = basePos.clone();
            if (dir.lengthSq() < 0.001) {
              dir.set(0, 1, 0);
            } else {
              dir.normalize();
            }
            parts.push({ mesh, basePos, explodeDir: dir });
            if (mesh.name) names.push(mesh.name);
          }
        });

        partsRef.current = parts;
        onLoadedParts(names);
        setLoadedScene(root);
      } catch {
        // Handled gracefully
      }
    };

    void load();

    return () => {
      active = false;
      partsRef.current = [];
      if (currentRoot) {
        disposeObjectTree(currentRoot);
      }
    };
  }, [modelDef.id, uploadedFile, isSoftwareGl, onLoadedParts]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    partsRef.current.forEach((p) => {
      const targetX = p.basePos.x + p.explodeDir.x * explodedAmount * 1.15;
      const targetY = p.basePos.y + p.explodeDir.y * explodedAmount * 1.15;
      const targetZ = p.basePos.z + p.explodeDir.z * explodedAmount * 1.15;

      p.mesh.position.x = THREE.MathUtils.damp(p.mesh.position.x, targetX, 7, dt);
      p.mesh.position.y = THREE.MathUtils.damp(p.mesh.position.y, targetY, 7, dt);
      p.mesh.position.z = THREE.MathUtils.damp(p.mesh.position.z, targetZ, 7, dt);
    });
  });

  const hotspots = useMemo(
    () => (uploadedFile ? [] : modelDef.hotspots),
    [uploadedFile, modelDef.hotspots]
  );

  return (
    <>
      <color attach="background" args={['#050a1a']} />
      <hemisphereLight args={['#38bdf8', '#090f24', 0.9]} />
      <directionalLight position={[5, 8, 5]} intensity={1.8} color="#f8fafc" />
      <directionalLight position={[-5, -2, -5]} intensity={0.85} color="#a78bfa" />

      <group ref={groupRef}>
        {loadedScene && <primitive object={loadedScene} />}

        {hotspots.map((hs, idx) => {
          const isSelected = selectedHotspotId === hs.id;
          return (
            <group key={hs.id} position={hs.position}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHotspot(hs);
                }}
              >
                <sphereGeometry args={[isSelected ? 0.11 : 0.08, 12, 12]} />
                <meshBasicMaterial color={isSelected ? '#34d399' : '#38bdf8'} />
              </mesh>
              <Html position={[0, 0.18, 0]} center distanceFactor={6}>
                <button
                  type="button"
                  onClick={() => onSelectHotspot(hs)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-400 text-slate-950 border-white font-semibold'
                      : 'bg-[#040714]/90 text-cyan-200 border-cyan-400/50 hover:border-white'
                  }`}
                >
                  0{idx + 1} · {hs.name}
                </button>
              </Html>
            </group>
          );
        })}
      </group>

      {/* Subtle calibration floor grid */}
      <gridHelper args={[8, 16, '#1e3a5f', '#0f172a']} position={[0, -1.65, 0]} />

      <OrbitControls
        enableDamping={!isSoftwareGl}
        dampingFactor={0.07}
        minDistance={2.2}
        maxDistance={9}
      />
    </>
  );
}

export default function GltfModelInspector(props: InspectorStageProps) {
  return (
    <Canvas
      dpr={props.isSoftwareGl ? 1 : [1, 1.8]}
      camera={{ position: [3.2, 2.0, 4.2], fov: 42 }}
      gl={{
        antialias: !props.isSoftwareGl,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
    >
      <InspectorScene {...props} />
    </Canvas>
  );
}
