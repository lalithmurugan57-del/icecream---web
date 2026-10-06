import React, { useState } from 'react';
import { IceCreamCone } from 'lucide-react';
import { PRODUCT_IMAGES } from '../data/initialMenu';

interface ProductImageProps {
  imageKey: 'logo' | 'hero' | 'sticks' | 'bars' | 'cones' | 'balls';
  alt: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  imageKey,
  alt,
  title,
  subtitle,
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);
  const src = PRODUCT_IMAGES[imageKey] || PRODUCT_IMAGES.cones;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F3EFE6] text-[#57534E] p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <IceCreamCone className="w-8 h-8 text-[#C2410C] mb-2 stroke-[1.5]" />
        {title && <span className="text-sm font-semibold text-[#18181B]">{title}</span>}
        {subtitle && <span className="text-xs text-[#78716C] mt-0.5">{subtitle}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
