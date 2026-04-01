'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function SizeChartModal({
  images,
  open,
  onClose,
}: {
  images: string[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'flex max-h-[min(90dvh,880px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl sm:w-full',
          '[&>button:last-child]:z-20'
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/60 px-4 py-3 pr-14 text-left">
          <DialogTitle className="text-xs font-mono uppercase tracking-[0.2em] text-foreground">
            Size chart
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(78dvh,760px)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {images.map((img, i) => (
              <div
                key={img + i}
                className="overflow-hidden rounded-md border border-foreground/10 bg-muted/20"
              >
                <div className="relative mx-auto h-[min(42dvh,360px)] w-full max-w-full sm:h-[min(45dvh,400px)]">
                  <Image
                    src={img}
                    alt={`Size chart ${i + 1}`}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 640px) 95vw, 36rem"
                    priority={i === 0}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
