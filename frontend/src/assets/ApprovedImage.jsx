import React, { useState } from 'react';
import { getApprovedAsset, resolveAssetUrl } from './assetRegistry.js';

/**
 * Reusable image component enforcing approved registry, aspect-ratio placeholder,
 * and zero layout shifts.
 */
export function ApprovedImage({
  assetId,
  src,
  alt,
  className = '',
  aspectRatio,
  loading = 'lazy',
  ...props
}) {
  const asset = assetId ? getApprovedAsset(assetId) : null;
  const initialUrl = asset ? asset.url : resolveAssetUrl(src);
  const [imgSrc, setImgSrc] = useState(initialUrl);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc('/mockups/sevo_emblem_transparent.png');
    }
  };

  const finalAlt = alt || (asset ? asset.alt : 'antigravity item');
  const finalAspectRatio = aspectRatio || (asset ? asset.aspectRatio : '1/1');

  return (
    <div
      style={{ aspectRatio: finalAspectRatio }}
      className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}
    >
      <img
        src={imgSrc}
        alt={finalAlt}
        loading={loading}
        onError={handleError}
        className="w-full h-full object-cover select-none transition-opacity duration-200"
        {...props}
      />
    </div>
  );
}
