"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogTrigger, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";

export interface GalleryImage {
  src: string;
  alt: string;
  date?: string;
  description?: string;
}

interface GalleryLightboxProps {
  images: GalleryImage[];
}

export function GalleryLightbox({ images }: GalleryLightboxProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = images[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {images.map((img, idx) => (
        <DialogTrigger
          key={idx}
          onClick={() => setCurrentIndex(idx)}
          className="group block w-full cursor-pointer text-left"
        >
          <div className="gallery-card mb-5 break-inside-avoid overflow-hidden rounded-[28px] border border-black/5 bg-[var(--card)] dark:border-white/10">
            <div
              className="aspect-[4/3] overflow-hidden bg-[var(--color-light-gray)]"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
              />
            </div>
            <div className="p-4">
              <p className="caption-text font-semibold">{img.alt}</p>
              {img.date && (
                <p className="micro-text text-[var(--color-text-secondary)]">{img.date}</p>
              )}
            </div>
          </div>
        </DialogTrigger>
      ))}

      <DialogPopup showCloseButton={false} className="max-w-4xl !bg-black/95 !text-white">
        <div className="relative flex min-h-[60vh] items-center justify-center">
          <button
            onClick={() => setOpen(false)}
            className="lightbox-button absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80"
          >
            <XIcon size={20} />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="lightbox-button absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white/80"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <img
            src={current?.src}
            alt={current?.alt ?? ""}
            loading="lazy"
            decoding="async"
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
          />

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="lightbox-button absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white/80"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {current?.alt && (
          <div className="px-6 pb-4 pt-2 text-center">
            <DialogTitle className="text-white">{current.alt}</DialogTitle>
            {current.description && (
              <p className="mt-1 text-sm text-white/60">{current.description}</p>
            )}
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}

