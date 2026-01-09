import Link from 'next/link';
import type { Shirt } from '@/types';

interface ShirtCardProps {
  shirt: Shirt;
  availableSizes?: string[]; // Available sizes for this shirt design
}

export default function ShirtCard({ shirt, availableSizes }: ShirtCardProps) {
  const discountPercentage = Math.round(
    ((shirt.originalPrice - shirt.discountedPrice) / shirt.originalPrice) * 100
  );

  const sizesText = availableSizes && availableSizes.length > 0 
    ? `Sizes: ${availableSizes.join(', ')}`
    : `Size: ${shirt.size}`;

  return (
    <Link href={`/shirts/${shirt.id}`} className="block">
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="aspect-square bg-gray-100 relative">
          <img
            src={shirt.imageUrl}
            alt={shirt.name}
            className="w-full h-full object-cover"
          />
          {discountPercentage > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
              -{discountPercentage}%
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{shirt.name}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{shirt.description}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 line-through text-sm">
              ₹{shirt.originalPrice.toFixed(2)}
            </span>
            <span className="text-xl font-bold text-gray-900">
              ₹{shirt.discountedPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{sizesText}</span>
            <span className="text-sm text-gray-600">{shirt.type}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

