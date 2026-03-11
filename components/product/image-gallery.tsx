'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="flex gap-3 h-full">
      {/* Thumbnails Column */}
      {images.length > 1 && (
        <div className="flex flex-col gap-2 w-[80px] flex-shrink-0">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-full aspect-square overflow-hidden bg-secondary transition-all ${
                index === currentIndex
                  ? 'ring-1 ring-foreground/50 opacity-100'
                  : 'opacity-40 hover:opacity-70'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="relative flex-1 aspect-[3/4] overflow-hidden bg-secondary">
        <Image
          src={images[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 55vw"
          className="object-cover transition-opacity duration-300"
          priority
        />
      </div>
    </div>
  );
}
