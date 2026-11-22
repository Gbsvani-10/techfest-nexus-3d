import type { PerformanceMetrics } from '../../types/festival';

interface FpsMonitorProps {
  visible: boolean;
  metrics: PerformanceMetrics;
  isLowPower: boolean;
  isSoftwareGl: boolean;
}

export function FpsMonitor({
  visible,
  metrics,
  isLowPower,
  isSoftwareGl,
}: FpsMonitorProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed left-4 top-20 z-30 nexus-panel rounded-lg px-3 py-2 text-[11px] font-mono tabular-nums text-slate-200 md:left-6">
      <div className="flex items-center gap-3">
        <span className="text-cyan-300 font-semibold">{metrics.fps} FPS</span>
        <span className="text-slate-400">{metrics.frameMs} ms</span>
        <span className="text-slate-400">{metrics.drawCalls} calls</span>
        <span className="hidden sm:inline text-slate-400">
          {metrics.triangles.toLocaleString()} tris
        </span>
        <span className="hidden sm:inline text-slate-400">{metrics.geometries} geos</span>
        <span className="text-amber-300">
          {isSoftwareGl ? 'SW-GL' : isLowPower ? 'Balanced' : 'High'}
        </span>
      </div>
    </div>
  );
}
