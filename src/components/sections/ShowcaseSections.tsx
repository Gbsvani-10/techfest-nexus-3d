import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Image as ImageIcon,
  Maximize2,
  RotateCcw,
  Send,
  Trophy,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENT_AWARDS,
  ACHIEVEMENT_STATS,
  GALLERY_CATEGORIES,
  GALLERY_EXHIBITS,
  SAMPLE_LEADERBOARD,
} from '../../data/festivalData';
import type {
  GalleryCategoryId,
  GalleryExhibit,
  GalleryHotspot,
  SectionId,
} from '../../types/festival';
import { nexusAudio } from '../../utils/audioEngine';

const LazyGalleryFullscreenModal = lazy(
  () => import('../three/GalleryFullscreenModal')
);

interface ShowcaseSectionsProps {
  activeSectionIndex: number;
  activeExhibit: GalleryExhibit;
  activeCategory: GalleryCategoryId;
  onChangeCategory: (category: GalleryCategoryId) => void;
  galleryFocusMode: 'overview' | 'center' | 'pedestal';
  onChangeGalleryFocusMode: (mode: 'overview' | 'center' | 'pedestal') => void;
  selectedGalleryHotspot: GalleryHotspot | null;
  onSelectGalleryHotspot: (hotspot: GalleryHotspot | null) => void;
  onResetGalleryCamera: () => void;
  onSelectExhibit: (
    exhibit: GalleryExhibit,
    openLightbox: boolean,
    focusMode?: 'center' | 'pedestal'
  ) => void;
  lightboxExhibit: GalleryExhibit | null;
  onCloseLightbox: () => void;
  onNavigate: (id: SectionId) => void;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

export function ShowcaseSections({
  activeSectionIndex,
  activeExhibit,
  activeCategory,
  onChangeCategory,
  galleryFocusMode,
  onChangeGalleryFocusMode,
  selectedGalleryHotspot,
  onSelectGalleryHotspot,
  onResetGalleryCamera,
  onSelectExhibit,
  lightboxExhibit,
  onCloseLightbox,
  onNavigate,
  isSoftwareGl,
  reducedMotion,
}: ShowcaseSectionsProps) {
  // Animated stats counter when Achievements section (index 4) becomes active
  const [statCounts, setStatCounts] = useState<number[]>(() =>
    ACHIEVEMENT_STATS.map((s) => (reducedMotion ? s.value : 0))
  );
  const [statsTriggered, setStatsTriggered] = useState(false);

  useEffect(() => {
    if (activeSectionIndex >= 4 && !statsTriggered) {
      setStatsTriggered(true);
      if (reducedMotion) {
        setStatCounts(ACHIEVEMENT_STATS.map((s) => s.value));
        return;
      }

      const start = performance.now();
      const duration = 900;
      let rafId = 0;

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setStatCounts(ACHIEVEMENT_STATS.map((s) => Math.round(s.value * eased)));
        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        }
      };
      rafId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafId);
    }
  }, [activeSectionIndex, statsTriggered, reducedMotion]);

  // Gallery info panel & image fallback state
  const [galleryInfoOpen, setGalleryInfoOpen] = useState(true);
  const [thumbFailed, setThumbFailed] = useState<Record<string, boolean>>({});

  // Reopen exhibition info panel whenever user selects a new exhibit or hotspot
  useEffect(() => {
    setGalleryInfoOpen(true);
  }, [activeExhibit.id, selectedGalleryHotspot?.id]);

  // Filtered exhibition list & stepping helpers
  const filteredExhibits = useMemo(() => {
    if (activeCategory === 'all') return GALLERY_EXHIBITS;
    return GALLERY_EXHIBITS.filter((e) => e.category === activeCategory);
  }, [activeCategory]);

  const activeIdx = Math.max(
    0,
    filteredExhibits.findIndex((g) => g.id === activeExhibit.id)
  );

  const handleStepExhibit = (dir: -1 | 1, openLightbox = false) => {
    if (filteredExhibits.length === 0) return;
    const nextIdx = (activeIdx + dir + filteredExhibits.length) % filteredExhibits.length;
    nexusAudio.playClick();
    onSelectExhibit(filteredExhibits[nextIdx], openLightbox, 'center');
  };

  // Contact form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [track, setTrack] = useState('Robotics');
  const [message, setMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('nexus@techfest-nexus.org');
      setCopiedEmail(true);
      nexusAudio.playClick();
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <>
      {/* SECTION 5: 3D ACHIEVEMENTS */}
      <section
        id="achievements"
        data-section="achievements"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between px-5 pb-20 pt-24 md:px-10"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="pointer-events-auto max-w-md space-y-2">
            <p className="text-xs font-medium text-amber-300">
              04 · Distinctions & Program Scale
            </p>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl text-balance">
              3D Achievements
            </h2>
            <p className="text-sm text-slate-300">
              Drag to inspect the championship trophy. Pre-event standings below are clearly
              marked sample content prior to live judging.
            </p>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-12 lg:items-end">
          {/* Left Flank: Animated Stats + Award Cards */}
          <div className="pointer-events-auto space-y-4 lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENT_STATS.map((stat, idx) => (
                <div key={stat.id} className="nexus-panel rounded-xl p-4">
                  <p className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                    {stat.prefix}
                    {statCounts[idx].toLocaleString()}
                    {stat.suffix}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">{stat.label}</p>
                  <p className="text-[11px] text-slate-400">{stat.note}</p>
                </div>
              ))}
            </div>

            <div className="nexus-panel rounded-xl p-4 space-y-3">
              {ACHIEVEMENT_AWARDS.map((award) => (
                <div
                  key={award.id}
                  className="border-b border-slate-800/90 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xs font-semibold text-white">
                      {award.title}
                    </h3>
                    <span className="font-mono text-[11px] tabular-nums text-amber-300 whitespace-nowrap">
                      {award.grant}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{award.criteria}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Center spacer left open for 3D Championship Trophy */}
          <div className="hidden lg:block lg:col-span-2" />

          {/* Right Flank: Clearly Marked Sample Leaderboard */}
          <div className="pointer-events-auto nexus-panel rounded-xl p-5 space-y-3.5 lg:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-300" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Sample Pre-Event Leaderboard
                </h3>
              </div>
              <span className="text-[11px] font-medium text-amber-300">
                Sample Content · Live data on Nov 28
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {SAMPLE_LEADERBOARD.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono tabular-nums text-cyan-300 w-6">
                      0{entry.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-100">{entry.team}</p>
                      <p className="text-[11px] text-slate-400">
                        {entry.track} · {entry.status}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-white whitespace-nowrap">
                    {entry.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: 3D TECHNOLOGY EXHIBITION GALLERY */}
      <section
        id="gallery"
        data-section="gallery"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between gap-6 px-5 pb-20 pt-24 md:px-10"
      >
        {/* Top Row: Introduction Header + Category Filter Bar */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto max-w-xl space-y-1.5">
            <p className="text-xs font-medium text-cyan-300">
              05 · 3D Technology Exhibition Gallery
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-4xl text-balance">
              EXPLORE THE EXTRAORDINARY
            </h2>
            <p className="text-sm text-slate-300">
              A universe of innovation, creativity and technology. Drag to orbit, scroll to zoom, or
              click any floating exhibition pedestal and hotspot.
            </p>
          </div>

          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-cyan-500/25 bg-[#060b1c]/90 p-1">
            {GALLERY_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    nexusAudio.playClick();
                    onChangeCategory(cat.id);
                    if (cat.id !== 'all') {
                      const match = GALLERY_EXHIBITS.find((e) => e.category === cat.id);
                      if (match) {
                        onSelectExhibit(match, false, 'center');
                      }
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-400 font-semibold text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  {cat.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle/Bottom Exhibition Info & Controls */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          {/* Glassmorphic Selected Exhibit & Hotspot Panel */}
          <div className="flex items-end justify-between gap-4">
            {galleryInfoOpen ? (
              <div
                className="pointer-events-auto nexus-panel w-full max-w-md rounded-xl p-4 sm:p-5 space-y-3"
                style={{ borderColor: `${activeExhibit.accentColor}55` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {thumbFailed[activeExhibit.id] ? (
                      <div
                        className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#040714]"
                        style={{ borderColor: `${activeExhibit.accentColor}44` }}
                      >
                        <ImageIcon
                          className="h-5 w-5"
                          style={{ color: activeExhibit.accentColor }}
                        />
                      </div>
                    ) : (
                      <img
                        src={activeExhibit.imageUrl}
                        alt={activeExhibit.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setThumbFailed((prev) => ({ ...prev, [activeExhibit.id]: true }))
                        }
                        className="h-12 w-16 shrink-0 rounded-lg border border-slate-700 object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className="font-mono text-[10px] font-semibold uppercase tracking-wider truncate"
                        style={{ color: activeExhibit.accentColor }}
                      >
                        {activeExhibit.categoryLabel} · {activeExhibit.year}
                      </p>
                      <h3 className="font-display text-base font-bold text-white truncate">
                        {activeExhibit.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Close exhibition panel"
                    onClick={() => {
                      nexusAudio.playClick();
                      setGalleryInfoOpen(false);
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  {activeExhibit.curatorNote}
                </p>

                <div className="grid grid-cols-3 gap-2 border-y border-slate-800/90 py-2.5">
                  {activeExhibit.specs.map((spec) => (
                    <div key={spec.label} className="min-w-0">
                      <p className="text-[10px] text-slate-400 truncate">{spec.label}</p>
                      <p className="font-mono text-[11px] font-semibold text-white truncate tabular-nums">
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Inspect 3D Hotspots
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeExhibit.hotspots.map((hs, idx) => {
                      const active = selectedGalleryHotspot?.id === hs.id;
                      return (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => {
                            nexusAudio.playClick();
                            onSelectGalleryHotspot(active ? null : hs);
                          }}
                          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'border-emerald-300 bg-emerald-400 font-semibold text-slate-950'
                              : 'border-slate-700 bg-[#040714] text-slate-200 hover:border-cyan-400'
                          }`}
                        >
                          0{idx + 1} · {hs.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedGalleryHotspot && (
                    <div className="rounded-lg border border-emerald-400/35 bg-[#040714]/90 p-2.5 space-y-0.5">
                      <p className="font-mono text-[10px] text-emerald-300">
                        {selectedGalleryHotspot.subsystem} · {selectedGalleryHotspot.specs}
                      </p>
                      <p className="text-xs text-slate-300">
                        {selectedGalleryHotspot.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  setGalleryInfoOpen(true);
                }}
                className="pointer-events-auto nexus-panel inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-300 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                Open Exhibit Details
              </button>
            )}
          </div>

          {/* Bottom Exhibition Navigation Dock */}
          <div className="pointer-events-auto nexus-panel flex flex-col justify-between gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous exhibition"
                onClick={() => handleStepExhibit(-1, false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs tabular-nums text-slate-300 px-1.5">
                0{activeIdx + 1}/0{filteredExhibits.length}
              </span>
              <button
                type="button"
                aria-label="Next exhibition"
                onClick={() => handleStepExhibit(1, false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="hidden text-xs text-slate-400 md:inline">
                {activeExhibit.shortCategory} · {activeExhibit.title}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#040714] p-1">
                {(
                  [
                    { id: 'overview', label: 'Rotunda' },
                    { id: 'center', label: 'Center Stage' },
                    { id: 'pedestal', label: 'Pedestal' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      nexusAudio.playClick();
                      onChangeGalleryFocusMode(mode.id);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer ${
                      galleryFocusMode === mode.id && !selectedGalleryHotspot
                        ? 'bg-cyan-400 font-semibold text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onResetGalleryCamera();
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Camera
              </button>

              <button
                type="button"
                onClick={() => {
                  nexusAudio.playClick();
                  onSelectExhibit(activeExhibit, true, 'center');
                }}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 whitespace-nowrap cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Full-Screen 3D
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: CONTACT & FOOTER */}
      <section
        id="contact"
        data-section="contact"
        className="pointer-events-none relative flex min-h-screen flex-col justify-between px-5 pb-16 pt-24 md:px-10"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="pointer-events-auto max-w-md space-y-2">
            <p className="text-xs font-medium text-cyan-300">06 · Holographic Uplink</p>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl text-balance">
              Connect With Nexus
            </h2>
            <p className="text-sm text-slate-300">
              Register your team, request hardware bench allocation, or partner with our engineering
              tracks.
            </p>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-12 lg:items-end">
          <div className="pointer-events-auto nexus-panel rounded-xl p-6 lg:col-span-6">
            {formSubmitted ? (
              <div className="space-y-4 py-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  Registration Received
                </h3>
                <p className="text-sm text-slate-300">
                  Thank you, <span className="text-white font-medium">{name}</span>. Your{' '}
                  <span className="text-cyan-300">{track}</span> inquiry has been logged for
                  TECHFEST NEXUS 2026.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormSubmitted(false);
                    setMessage('');
                  }}
                  className="rounded-md border border-cyan-400/50 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10 cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  nexusAudio.playChime(587.33);
                  setFormSubmitted(true);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-name" className="text-xs font-medium text-slate-300">
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full rounded-md border border-slate-700 bg-[#040714] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="contact-email" className="text-xs font-medium text-slate-300">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ada@robotics.org"
                      className="w-full rounded-md border border-slate-700 bg-[#040714] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-track" className="text-xs font-medium text-slate-300">
                    Primary Track / Topic
                  </label>
                  <select
                    id="contact-track"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-[#040714] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="Robotics">Robotics</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Hackathons">Hackathons</option>
                    <option value="Gaming">Gaming</option>
                    <option value="AR/VR">AR/VR</option>
                    <option value="Tech Talks">Tech Talks</option>
                    <option value="Sponsorship">Sponsorship & Lab Partnership</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="text-xs font-medium text-slate-300">
                    Project or Inquiry Brief
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your team size, hardware requirements, or question..."
                    className="w-full rounded-md border border-slate-700 bg-[#040714] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Submit Registration
                </button>
              </form>
            )}
          </div>

          <div className="pointer-events-auto nexus-panel rounded-xl p-6 space-y-5 lg:col-span-6">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400">Direct Channels</p>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#040714]/80 px-4 py-3">
                <a
                  href="mailto:nexus@techfest-nexus.org"
                  className="font-mono text-xs text-cyan-300 hover:underline"
                >
                  nexus@techfest-nexus.org
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-400 cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-semibold text-white">Venue Coordinates</p>
                <p className="mt-1 text-slate-400">Quantum District · Sector 7</p>
                <p className="text-slate-400">Nov 28–30, 2026</p>
              </div>
              <div>
                <p className="font-semibold text-white">Quick Navigation</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-cyan-300">
                  <button
                    type="button"
                    onClick={() => onNavigate('world')}
                    className="hover:underline cursor-pointer"
                  >
                    World
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('events')}
                    className="hover:underline cursor-pointer"
                  >
                    Events
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('lab')}
                    className="hover:underline cursor-pointer"
                  >
                    Lab
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('achievements')}
                    className="hover:underline cursor-pointer"
                  >
                    Honors
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('gallery')}
                    className="hover:underline cursor-pointer"
                  >
                    Gallery
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
              © 2026 TECHFEST NEXUS. All rights reserved.
            </div>
          </div>
        </div>
      </section>

      {/* LAZY-LOADED FULL-SCREEN 3D EXHIBITION VIEWING MODE */}
      {lightboxExhibit && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#040714]">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
              <p className="font-mono text-xs uppercase tracking-wider text-cyan-300">
                Loading 3D Exhibition Chamber
              </p>
            </div>
          }
        >
          <LazyGalleryFullscreenModal
            exhibit={lightboxExhibit}
            activeCategory={activeCategory}
            onChangeCategory={onChangeCategory}
            onSelectExhibit={(next) => onSelectExhibit(next, true, 'center')}
            onClose={onCloseLightbox}
            isSoftwareGl={isSoftwareGl}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      )}
    </>
  );
}
