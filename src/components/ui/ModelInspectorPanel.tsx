import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Box, Layers, Upload, X } from 'lucide-react';
import { INSPECTOR_MODELS } from '../../data/festivalData';
import type { InspectorHotspot, InspectorModelDef } from '../../types/festival';

const LazyInspectorCanvas = lazy(() => import('../three/GltfModelInspector'));

interface ModelInspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isSoftwareGl: boolean;
}

export function ModelInspectorPanel({
  isOpen,
  onClose,
  isSoftwareGl,
}: ModelInspectorPanelProps) {
  const [selectedModel, setSelectedModel] = useState<InspectorModelDef>(INSPECTOR_MODELS[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<InspectorHotspot | null>(
    INSPECTOR_MODELS[0].hotspots[0]
  );
  const [loadedParts, setLoadedParts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadedParts = useCallback((parts: string[]) => {
    setLoadedParts(parts);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GLTF 3D Model Inspector"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-6"
    >
      <div className="nexus-panel flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl lg:flex-row">
        {/* Left/Top 3D GLTF Viewport */}
        <div className="relative h-1/2 w-full bg-[#050a1a] lg:h-full lg:w-2/3">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading GLTF/GLB Inspector...
              </div>
            }
          >
            <LazyInspectorCanvas
              modelDef={selectedModel}
              uploadedFile={uploadedFile}
              explodedAmount={explodedAmount}
              selectedHotspotId={selectedHotspot?.id ?? null}
              onSelectHotspot={setSelectedHotspot}
              isSoftwareGl={isSoftwareGl}
              onLoadedParts={handleLoadedParts}
            />
          </Suspense>

          <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-[#040714]/85 px-3 py-1.5 text-xs text-slate-300 border border-slate-800">
            Drag to rotate · Scroll to zoom · Click hotspots
          </div>
        </div>

        {/* Right Controls & Component Inspector */}
        <div className="flex h-1/2 w-full flex-col justify-between overflow-y-auto border-t border-slate-800 p-5 lg:h-full lg:w-1/3 lg:border-t-0 lg:border-l">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-cyan-300">
                  {uploadedFile ? 'Custom GLB / GLTF Upload' : selectedModel.category}
                </p>
                <h2 className="font-display text-lg font-bold text-white">
                  {uploadedFile ? uploadedFile.name : selectedModel.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close model inspector"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Model Switcher + GLB Upload */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400">Select GLB Assembly</p>
              <div className="grid grid-cols-1 gap-1.5">
                {INSPECTOR_MODELS.map((m) => {
                  const active = !uploadedFile && selectedModel.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setSelectedModel(m);
                        setSelectedHotspot(m.hotspots[0]);
                      }}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-200 border border-slate-800 hover:border-cyan-400/50'
                      }`}
                    >
                      <span>{m.name}</span>
                      <Box className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  );
                })}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadedFile(file);
                    setSelectedHotspot(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-cyan-400/40 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Load Local .GLB / .GLTF File
              </button>
            </div>

            {/* Exploded View Control */}
            <div className="rounded-lg border border-slate-800 bg-[#040714]/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-white">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  Exploded-View Assembly
                </span>
                <span className="font-mono tabular-nums text-cyan-300">
                  {Math.round(explodedAmount * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodedAmount}
                onChange={(e) => setExplodedAmount(Number(e.target.value))}
                aria-label="Exploded view separation"
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExplodedAmount(explodedAmount > 0.1 ? 0 : 0.85)}
                  className="flex-1 rounded border border-slate-700 py-1.5 text-xs text-slate-200 hover:border-cyan-400 cursor-pointer"
                >
                  {explodedAmount > 0.1 ? 'Collapse Assembly' : 'Explode Parts'}
                </button>
              </div>
            </div>

            {/* Hotspot Explanations */}
            {!uploadedFile && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">Component Hotspots</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModel.hotspots.map((hs, idx) => (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => setSelectedHotspot(hs)}
                      className={`rounded px-2.5 py-1 text-xs font-mono cursor-pointer ${
                        selectedHotspot?.id === hs.id
                          ? 'bg-emerald-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-400'
                      }`}
                    >
                      0{idx + 1} · {hs.name}
                    </button>
                  ))}
                </div>
                {selectedHotspot && (
                  <div className="rounded-lg border border-slate-800 bg-[#040714]/70 p-3.5 space-y-1">
                    <p className="font-mono text-[11px] text-emerald-300">
                      {selectedHotspot.specs}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {selectedHotspot.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
            Parsed GLTF Meshes:{' '}
            <span className="font-mono tabular-nums text-slate-200">{loadedParts.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
