import React from 'react';
import Image from 'next/image';

export function SizeChartModal({ images, open, onClose }: { images: string[]; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-background rounded-lg p-12 max-w-3xl w-full relative shadow-2xl border-2 border-foreground/20">
        <button
          className="absolute top-6 right-8 text-3xl text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close size chart"
        >
          ×
        </button>
        <h2 className="text-[28px] font-mono font-bold mb-10 uppercase tracking-widest text-left">Size Chart</h2>
        <div className="flex flex-col items-center gap-10">
          {images.map((img, i) => (
            <div key={img + i} className="w-full flex justify-center items-center bg-secondary border border-foreground/10 p-6 rounded-lg">
              <div className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center">
                <Image src={img} alt={`Size chart ${i + 1}`} fill className="object-contain" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
