import React, { useEffect, useState } from 'react';
import { resolveImageUrl } from '../../lib/api';

export const DEFAULT_FALLBACK_IMAGE = '/uploads/properties/Sunset%20Aarti%20on%20the%20Sacred%20Ghat.png';

export interface ResponsiveImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatioClass?: string;
  containerClassName?: string;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  aspectRatioClass = 'aspect-[4/3]',
  containerClassName = '',
  objectFit = 'cover',
  objectPosition = 'object-center',
  className = '',
  ...imgProps
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const initialUrl = resolveImageUrl(src || fallbackSrc);
  const resolvedFallback = resolveImageUrl(fallbackSrc);
  const currentSrc = hasError ? resolvedFallback : initialUrl;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F2ECE4] ${aspectRatioClass} ${containerClassName}`}
    >
      {/* Subtle placeholder / shimmer while loading */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#F0ECE1] via-[#E8E2D5] to-[#F0ECE1] animate-pulse z-0"
          aria-hidden="true"
        />
      )}

      <img
        {...imgProps}
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          if (!hasError && currentSrc !== resolvedFallback) {
            setHasError(true);
          } else {
            setIsLoading(false);
          }
        }}
        className={`w-full h-full relative z-10 ${
          objectFit === 'cover' ? 'object-cover' : 'object-contain'
        } ${objectPosition} transition-all duration-500 ${
          isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${className}`}
      />
    </div>
  );
};
