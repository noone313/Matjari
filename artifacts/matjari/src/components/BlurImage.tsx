import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function BlurImage({ src, alt, className, fallback, ...props }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
      {/* Blurred placeholder */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn(
          'absolute inset-0 w-full h-full object-cover scale-110 blur-xl transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
      />
      {/* Full image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
    </div>
  );
}
