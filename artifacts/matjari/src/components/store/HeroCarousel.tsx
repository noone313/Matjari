import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

interface HeroCarouselProps {
  slides: Array<{
    id: number;
    title?: string | null;
    subtitle?: string | null;
    linkUrl?: string | null;
    imageUrl?: string | null;
  }>;
  storeName: string;
}

const AUTOPLAY_MS = 6000;

// Crossfade carousel — no external slider library, no transforms.
// Immune to RTL layout issues (the old Embla-based version mis-positioned
// slides inside the RTL body and rendered blank).
export default function HeroCarousel({ slides, storeName }: HeroCarouselProps) {
  const slideImages = slides.filter((s) => s.imageUrl);
  const count = slideImages.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count],
  );

  // Reset if the slide list shrinks below the current index
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Autoplay — pauses while hovered
  useEffect(() => {
    if (paused || count < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      dir="rtl"
      className="relative w-full select-none"
      aria-roledescription="carousel"
      aria-label="عرض صور المتجر"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden bg-zinc-200">
        {slideImages.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== index}
            aria-roledescription="slide"
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.imageUrl ? getApiUrl(slide.imageUrl) : undefined}
              alt={slide.title || storeName}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-14 text-center text-white px-6">
              <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-2 drop-shadow-sm">
                {slide.title || storeName}
              </h1>
              {slide.subtitle && (
                <p className="text-white/95 text-base md:text-lg max-w-lg leading-relaxed drop-shadow-md bg-black/20 px-3 py-1.5 rounded-lg">
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Arrows — RTL reading order: right arrow goes back, left arrow advances */}
        {count > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              aria-label="الشريحة السابقة"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="الشريحة التالية"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {count > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slideImages.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                aria-label={`الانتقال للشريحة ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
