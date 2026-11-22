import { useState } from 'react';
import {
  Activity,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  CloudFog,
  CloudRain,
  Footprints,
  Globe,
  Map,
  MoonStar,
  RefreshCw,
  Snowflake,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SECTION_ORDER, WEATHER_ORDER, WEATHER_PRESETS } from '../../data/festivalData';
import type { NavigationMode, SectionId, WeatherMode } from '../../types/festival';

interface FloatingControlsProps {
  activeSectionIndex: number;
  navMode: NavigationMode;
  onToggleNavMode: () => void;
  overviewActive: boolean;
  onToggleOverview: () => void;
  mapOpen: boolean;
  onToggleMap: () => void;
  weather: WeatherMode;
  autoWeather: boolean;
  onChangeWeather: (mode: WeatherMode) => void;
  onToggleAutoWeather: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  puzzleOpen: boolean;
  onTogglePuzzle: () => void;
  collectedCount: number;
  puzzleSolved: boolean;
  showFps: boolean;
  onToggleFps: () => void;
  onNavigate: (id: SectionId) => void;
  showBackToTop: boolean;
}

function WeatherIcon({ mode, className }: { mode: WeatherMode; className?: string }) {
  switch (mode) {
    case 'rain':
      return <CloudRain className={className} />;
    case 'fog':
      return <CloudFog className={className} />;
    case 'snow':
      return <Snowflake className={className} />;
    default:
      return <MoonStar className={className} />;
  }
}

export function FloatingControls({
  activeSectionIndex,
  navMode,
  onToggleNavMode,
  overviewActive,
  onToggleOverview,
  mapOpen,
  onToggleMap,
  weather,
  autoWeather,
  onChangeWeather,
  onToggleAutoWeather,
  audioEnabled,
  onToggleAudio,
  puzzleOpen,
  onTogglePuzzle,
  collectedCount,
  puzzleSolved,
  showFps,
  onToggleFps,
  onNavigate,
  showBackToTop,
}: FloatingControlsProps) {
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);

  const current = SECTION_ORDER[activeSectionIndex] ?? SECTION_ORDER[0];
  const prevSection = activeSectionIndex > 0 ? SECTION_ORDER[activeSectionIndex - 1] : null;
  const nextSection =
    activeSectionIndex < SECTION_ORDER.length - 1
      ? SECTION_ORDER[activeSectionIndex + 1]
      : null;

  const activeWeatherPreset = WEATHER_PRESETS[weather];

  return (
    <div
      data-hud
      className="pointer-events-none fixed bottom-4 right-4 left-4 z-30 flex flex-col items-end gap-2 md:left-auto md:bottom-6 md:right-6"
    >
      {/* Expandable Weather Control Drawer */}
      {weatherMenuOpen && (
        <div className="pointer-events-auto nexus-panel w-full max-w-sm rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">Atmosphere & Weather</span>
            <button
              type="button"
              onClick={onToggleAutoWeather}
              aria-pressed={autoWeather}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                autoWeather
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700 text-slate-300 hover:border-cyan-400/60 hover:text-white'
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${autoWeather ? 'text-cyan-300' : ''}`} />
              <span>{autoWeather ? 'Auto Cycle On' : 'Auto Cycle'}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {WEATHER_ORDER.map((mode) => {
              const preset = WEATHER_PRESETS[mode];
              const isSelected = weather === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeWeather(mode)}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-[40px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-semibold'
                      : 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-cyan-400/60'
                  }`}
                >
                  <WeatherIcon mode={mode} className="h-3.5 w-3.5" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] leading-snug text-slate-400">
            {activeWeatherPreset.description}
          </p>
        </div>
      )}

      <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end">
        {/* Section Stepper (only shown in Browse Mode) */}
        {navMode === 'browse' && (
          <div className="pointer-events-auto nexus-panel flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-mono tabular-nums text-cyan-300">
              0{activeSectionIndex + 1}/0{SECTION_ORDER.length}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-slate-200 whitespace-nowrap">{current.label}</span>
            <div className="ml-1 flex items-center border-l border-slate-700/80 pl-1.5">
              <button
                type="button"
                disabled={!prevSection}
                aria-label="Previous section"
                onClick={() => prevSection && onNavigate(prevSection.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!nextSection}
                aria-label="Next section"
                onClick={() => nextSection && onNavigate(nextSection.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Overview, Map, Weather, Walk, Puzzle, FPS, Sound & Top Utilities */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          {navMode === 'browse' && (
            <button
              type="button"
              onClick={onToggleOverview}
              aria-pressed={overviewActive}
              aria-label="Toggle multiverse overview camera"
              className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                overviewActive
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-200 hover:border-cyan-400/60'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMap}
            aria-pressed={mapOpen}
            aria-label="Open multiverse map"
            className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              mapOpen
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'text-slate-200 hover:border-cyan-400/60'
            }`}
          >
            <Map className="h-3.5 w-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <button
            type="button"
            onClick={() => setWeatherMenuOpen((o) => !o)}
            aria-expanded={weatherMenuOpen}
            aria-label="Weather and lighting controls"
            className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              weatherMenuOpen || weather !== 'clear'
                ? 'border-cyan-400 text-cyan-200'
                : 'text-slate-200 hover:border-cyan-400/60'
            }`}
          >
            <WeatherIcon mode={weather} className="h-3.5 w-3.5 text-cyan-300" />
            <span className="hidden sm:inline">{activeWeatherPreset.label}</span>
          </button>

          <button
            type="button"
            onClick={onToggleNavMode}
            aria-pressed={navMode === 'walk'}
            className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              navMode === 'walk'
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'text-slate-200 hover:border-cyan-400/60'
            }`}
          >
            <Footprints className="h-3.5 w-3.5 text-cyan-300" />
            <span>{navMode === 'walk' ? 'Walk On' : 'Walk'}</span>
          </button>

          <button
            type="button"
            onClick={onTogglePuzzle}
            aria-pressed={puzzleOpen}
            className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              puzzleSolved
                ? 'border-emerald-400/70 text-emerald-300'
                : puzzleOpen
                  ? 'border-cyan-400 text-cyan-200'
                  : 'text-slate-200 hover:border-cyan-400/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">
              {puzzleSolved ? 'Active' : `${collectedCount}/3`}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleFps}
            aria-pressed={showFps}
            aria-label="Toggle FPS monitor"
            className={`nexus-panel hidden sm:inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-mono whitespace-nowrap transition-colors cursor-pointer ${
              showFps ? 'border-cyan-400 text-cyan-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>FPS</span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioEnabled}
            aria-label={audioEnabled ? 'Mute sound' : 'Enable ambient audio'}
            className={`nexus-panel inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              audioEnabled
                ? 'border-cyan-400/70 text-cyan-300'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {navMode === 'browse' && showBackToTop && (
            <button
              type="button"
              onClick={() => onNavigate('hero')}
              aria-label="Back to top"
              className="nexus-panel inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-white whitespace-nowrap cursor-pointer"
            >
              <ArrowUp className="h-4 w-4 text-cyan-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
