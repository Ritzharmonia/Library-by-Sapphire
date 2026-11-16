import React, { useEffect, useState } from 'react';
import { getCachedMediaSync, isMediaRef, resolveMediaUrl } from '../lib/storage';

interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  fallbackSrc?: string;
}

export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  fallbackSrc,
  alt = '',
  className = '',
  onError,
  ...rest
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => {
    if (!src) return fallbackSrc || '';
    const sync = getCachedMediaSync(src);
    return sync || '';
  });

  useEffect(() => {
    let active = true;
    if (!src) {
      setResolvedSrc(fallbackSrc || '');
      return;
    }

    const sync = getCachedMediaSync(src);
    if (sync) {
      setResolvedSrc(sync);
      return;
    }

    if (!isMediaRef(src)) {
      setResolvedSrc(src);
      return;
    }

    setResolvedSrc('');
    resolveMediaUrl(src)
      .then((url) => {
        if (active) {
          setResolvedSrc(url || fallbackSrc || '');
        }
      })
      .catch(() => {
        if (active && fallbackSrc) {
          setResolvedSrc(fallbackSrc);
        }
      });

    return () => {
      active = false;
    };
  }, [src, fallbackSrc]);

  if (!resolvedSrc) {
    return (
      <div
        aria-label={alt}
        className={`bg-[#0a0d14] animate-pulse ${className}`}
      />
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (fallbackSrc && (e.target as HTMLImageElement).src !== fallbackSrc) {
          (e.target as HTMLImageElement).src = fallbackSrc;
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
};
