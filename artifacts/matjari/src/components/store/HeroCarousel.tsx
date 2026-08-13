import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { HeroSlide } from '@workspace/api-client-react';
import { getApiUrl } from '@/lib/utils';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface HeroCarouselProps {
  slides: HeroSlide[];
  storeName: string;
  description?: string | null;
}

const AUTOPLAY_MS = 5000;

export default function HeroCarousel({ slides, storeName, description }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay — pauses while the user hovers the carousel
  useEffect(() => {
    if (!emblaApi || slides.length < 2) return;
    const id = window.setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, slides.length]);

  if (slides.length === 0) return null;

  const slideImages = slides.filter((s) => s.imageUrl);

  return (
    <section className="relative w-full overflow-hidden bg-zinc-100 select-none" aria-roledescription="carousel" aria-label="عرض صور المتجر">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slideImages.map((slide) => (
            <div key={slide.id} className="relative min-w-0 shrink-0 grow-0 basis-full" aria-roledescription="slide">
              <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden">
                <img
                  src={slide.imageUrl ? getApiUrl(slide.imageUrl) : undefined}
                  alt={slide.title || storeName}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-14 text-center text-white px-6">
                  {slide.title && (
                    <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-2 drop-shadow-sm">
                      {slide.title}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p className="text-white/85 text-sm md:text-lg max-w-lg leading-relaxed drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {slideImages.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="الشريحة السابقة"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="الشريحة التالية"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {scrollSnaps.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`الانتقال للشريحة ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === selectedIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
