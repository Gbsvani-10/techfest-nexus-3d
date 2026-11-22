import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Mail,
  MapPin,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENT_AWARDS,
  ACHIEVEMENT_STATS,
  EVENT_TRACKS,
  GALLERY_CATEGORIES,
  GALLERY_EXHIBITS,
  LAB_HOTSPOTS,
  MULTIVERSE_ISLANDS,
  SAMPLE_LEADERBOARD,
} from '../../data/festivalData';
import type { GalleryCategoryId, SectionId } from '../../types/festival';

interface WebGLFallbackProps {
  onNavigate: (id: SectionId) => void;
}

export function WebGLFallback({ onNavigate }: WebGLFallbackProps) {
  const [selectedIsland, setSelectedIsland] = useState(MULTIVERSE_ISLANDS[0]);
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TRACKS[0]);
  const [selectedHotspot, setSelectedHotspot] = useState(LAB_HOTSPOTS[0]);
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategoryId>('all');
  const [lightboxImage, setLightboxImage] = useState<(typeof GALLERY_EXHIBITS)[0] | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const filteredGallery = useMemo(() => {
    if (galleryCategory === 'all') return GALLERY_EXHIBITS;
    return GALLERY_EXHIBITS.filter((g) => g.category === galleryCategory);
  }, [galleryCategory]);

  return (
    <div className="min-h-screen bg-[#040714] pt-20 pb-20 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-20 px-5 md:px-8">
        {/* Notice Banner */}
        <div className="nexus-panel flex items-start gap-3 rounded-xl p-4 text-sm text-slate-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <p>
            WebGL 3D hardware acceleration is unavailable in this browser environment. Displaying the
            high-contrast interactive 2D edition of TECHFEST NEXUS.
          </p>
        </div>

        {/* Hero */}
        <section id="hero" className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
              ENTER THE FUTURE
            </h1>
            <p className="text-lg text-cyan-300">Innovate. Build. Inspire.</p>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Explore five floating multiverse islands—Robotics, Artificial Intelligence, Gaming,
              Space Exploration, and Innovation—alongside six engineering competition tracks.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('world')}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                Explore Multiverse
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('events')}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-400/50 px-5 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10 cursor-pointer"
              >
                Discover Events
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-cyan-500/25">
            <img
              src={GALLERY_EXHIBITS[0].imageUrl}
              alt={GALLERY_EXHIBITS[0].title}
              referrerPolicy="no-referrer"
              className="aspect-video w-full object-cover"
            />
          </div>
        </section>

        {/* Multiverse Islands */}
        <section id="world" className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">01. Multiverse Islands</h2>
          <div className="flex flex-wrap gap-2">
            {MULTIVERSE_ISLANDS.map((island) => (
              <button
                key={island.id}
                type="button"
                onClick={() => setSelectedIsland(island)}
                className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  selectedIsland.id === island.id
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400/50'
                }`}
              >
                {island.name}
              </button>
            ))}
          </div>
          <div className="nexus-panel rounded-xl p-6 space-y-3">
            <p className="text-xs text-cyan-300">{selectedIsland.sector}</p>
            <h3 className="font-display text-xl font-semibold text-white">{selectedIsland.name}</h3>
            <p className="text-sm text-slate-300">{selectedIsland.summary}</p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400">
              <span>{selectedIsland.capacity}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedIsland.schedule}</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-300">{selectedIsland.featuredDemo}</span>
            </div>
          </div>
        </section>

        {/* Events */}
        <section id="events" className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">02. Festival Events</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TRACKS.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEvent(ev)}
                className={`nexus-panel rounded-xl p-5 text-left transition-colors cursor-pointer ${
                  selectedEvent.id === ev.id ? 'border-cyan-400' : 'hover:border-cyan-400/50'
                }`}
              >
                <p className="text-xs text-slate-400">
                  {ev.category} · {ev.dateLabel}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-white">{ev.title}</h3>
                <p className="mt-2 text-xs text-slate-300 line-clamp-2">{ev.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Innovation Lab */}
        <section id="lab" className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">03. Innovation Lab</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <img
              src={GALLERY_EXHIBITS[2].imageUrl}
              alt="Robotic manipulator prototype"
              referrerPolicy="no-referrer"
              className="aspect-4/3 w-full rounded-xl border border-slate-800 object-cover"
            />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {LAB_HOTSPOTS.map((hs, i) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setSelectedHotspot(hs)}
                    className={`rounded-md px-3 py-1.5 text-xs font-mono cursor-pointer ${
                      selectedHotspot.id === hs.id
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    0{i + 1} · {hs.name}
                  </button>
                ))}
              </div>
              <div className="nexus-panel rounded-xl p-5 space-y-2">
                <p className="text-xs text-cyan-300">{selectedHotspot.subsystem}</p>
                <h3 className="font-display text-lg font-semibold text-white">
                  {selectedHotspot.name}
                </h3>
                <p className="font-mono text-xs text-slate-400">{selectedHotspot.specs}</p>
                <p className="text-sm text-slate-300">{selectedHotspot.description}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section id="achievements" className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">04. Achievements & Honors</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ACHIEVEMENT_STATS.map((s) => (
              <div key={s.id} className="nexus-panel rounded-xl p-5">
                <p className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                  {s.prefix}
                  {s.value.toLocaleString()}
                  {s.suffix}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{s.note}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {ACHIEVEMENT_AWARDS.map((a) => (
              <div key={a.id} className="nexus-panel rounded-xl p-5 space-y-1.5">
                <p className="text-xs text-amber-300">{a.category} · {a.grant}</p>
                <h3 className="font-display text-base font-semibold text-white">{a.title}</h3>
                <p className="text-xs text-slate-300">{a.criteria}</p>
              </div>
            ))}
          </div>
          <div className="nexus-panel rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-white">
                Sample Pre-Event Standings
              </h3>
              <span className="text-xs text-amber-300">
                Sample Content · Live leaderboard activates during event
              </span>
            </div>
            <div className="divide-y divide-slate-800 text-sm">
              {SAMPLE_LEADERBOARD.map((row) => (
                <div key={row.rank} className="flex items-center justify-between py-2.5">
                  <span className="font-mono tabular-nums text-slate-300">
                    #{row.rank} {row.team}
                  </span>
                  <span className="text-xs text-slate-400">
                    {row.track} · <strong className="font-mono tabular-nums text-cyan-300">{row.points} pts</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery" className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cyan-300">
                05 · 3D Technology Exhibition Gallery
              </p>
              <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
                EXPLORE THE EXTRAORDINARY
              </h2>
              <p className="text-sm text-slate-300">
                A universe of innovation, creativity and technology.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GALLERY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGalleryCategory(cat.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    galleryCategory === cat.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400/50'
                  }`}
                >
                  {cat.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGallery.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setLightboxImage(ex)}
                className="nexus-panel group overflow-hidden rounded-xl text-left cursor-pointer"
              >
                {failedImages[ex.id] ? (
                  <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 bg-[#071029]">
                    <ImageIcon className="h-8 w-8" style={{ color: ex.accentColor }} />
                    <span className="font-mono text-xs text-slate-300">{ex.categoryLabel}</span>
                  </div>
                ) : (
                  <img
                    src={ex.imageUrl}
                    alt={ex.title}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [ex.id]: true }))}
                    className="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="p-4 space-y-1.5">
                  <p className="text-xs" style={{ color: ex.accentColor }}>
                    {ex.categoryLabel} · {ex.year}
                  </p>
                  <p className="font-display text-sm font-semibold text-white">{ex.title}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{ex.curatorNote}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="nexus-panel rounded-xl p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">06. Contact & Registration</h2>
          {submitted ? (
            <div className="flex items-center gap-3 text-cyan-300 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Registration inquiry recorded for TECHFEST NEXUS 2026.</span>
            </div>
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <input
                required
                type="text"
                placeholder="Full Name"
                className="rounded-md border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              />
              <input
                required
                type="email"
                placeholder="Email Address"
                className="rounded-md border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="sm:col-span-2 rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                Submit Inquiry
              </button>
            </form>
          )}
          <div className="flex flex-wrap gap-6 pt-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-cyan-400" /> nexus@techfest-nexus.org
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" /> Quantum District · Sector 7
            </span>
          </div>
        </section>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 md:p-8"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="nexus-panel max-w-3xl w-full overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#040714]">
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-full object-contain"
              />
              <button
                type="button"
                aria-label="Close exhibition detail"
                onClick={() => setLightboxImage(null)}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#040714]/90 text-white hover:border-cyan-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs" style={{ color: lightboxImage.accentColor }}>
                    {lightboxImage.categoryLabel} · {lightboxImage.year}
                  </p>
                  <p className="font-display text-lg font-bold text-white">{lightboxImage.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous exhibit"
                    onClick={() => {
                      const idx = GALLERY_EXHIBITS.findIndex((g) => g.id === lightboxImage.id);
                      const prev =
                        GALLERY_EXHIBITS[(idx - 1 + GALLERY_EXHIBITS.length) % GALLERY_EXHIBITS.length];
                      setLightboxImage(prev);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:border-cyan-400 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next exhibit"
                    onClick={() => {
                      const idx = GALLERY_EXHIBITS.findIndex((g) => g.id === lightboxImage.id);
                      const next = GALLERY_EXHIBITS[(idx + 1) % GALLERY_EXHIBITS.length];
                      setLightboxImage(next);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:border-cyan-400 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-300">{lightboxImage.curatorNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
