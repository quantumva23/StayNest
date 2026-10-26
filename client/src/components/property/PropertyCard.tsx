import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/api';
import { MapPin, Users } from 'lucide-react';
import { ResponsiveImage } from '../common/ResponsiveImage';

export interface PropertyCardData {
  id: string;
  name: string;
  type: 'HOTEL' | 'LOUNGE' | 'GUEST_HOUSE';
  city: string;
  country: string;
  images: Array<{ imageUrl: string; altText?: string }>;
  minPricePerNight: number;
  currency: string;
  roomCount: number;
  roomTypes?: string[];
  amenities?: Array<{ id: string; name: string }>;
}

export const PropertyCard: React.FC<{ property: PropertyCardData }> = ({ property }) => {
  const typeLabels = {
    HOTEL: { label: 'Boutique Hotel', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    LOUNGE: { label: 'Alpine Lounge', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    GUEST_HOUSE: { label: 'Heritage Guest House', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
  };

  const badge = typeLabels[property.type] || { label: property.type, bg: 'bg-gray-100 text-gray-800 border-gray-200' };

  return (
    <Link
      to={`/properties/${property.id}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-[#E6E1D8] transition-all duration-300 hover:shadow-hover hover:-translate-y-1"
    >
      {/* Image container with responsive aspect ratio and error fallback */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2ECE4]">
        <ResponsiveImage
          src={property.images[0]?.imageUrl}
          alt={property.images[0]?.altText || property.name}
          aspectRatioClass="aspect-[4/3]"
          objectFit="cover"
          objectPosition="object-center"
          className="group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 z-20">
          <span className={`inline-block text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full border backdrop-blur-sm ${badge.bg}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center text-xs text-staynest-muted mb-1 space-x-1">
            <MapPin className="w-3.5 h-3.5 text-staynest-terracotta" />
            <span className="font-medium">{property.city}, {property.country}</span>
          </div>

          <h3 className="font-serif text-lg font-bold text-staynest-charcoal group-hover:text-staynest-terracotta transition-colors line-clamp-1">
            {property.name}
          </h3>
          {property.roomTypes && property.roomTypes.length > 0 && (
            <p className="text-[11px] text-staynest-muted mt-1">
              {property.roomTypes.map((type) => type.replace('_', ' ').toLowerCase()).join(' · ')}
            </p>
          )}

          {/* Quick amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {property.amenities.slice(0, 2).map((a) => (
                <span key={a.id} className="text-[11px] px-2 py-0.5 rounded-md bg-[#F3EFE6] text-staynest-olive font-medium">
                  {a.name}
                </span>
              ))}
              {property.amenities.length > 2 && (
                <span className="text-[11px] px-1.5 py-0.5 text-staynest-muted font-medium">
                  +{property.amenities.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing bottom */}
        <div className="mt-4 pt-3 border-t border-[#F0EBE1] flex items-baseline justify-between">
          <div>
            <span className="text-xs text-staynest-muted">from </span>
            <span className="text-lg font-bold text-staynest-charcoal">
              {formatCurrency(property.minPricePerNight, property.currency)}
            </span>
            <span className="text-xs text-staynest-muted"> / night</span>
          </div>

          <span className="text-xs font-semibold text-staynest-olive group-hover:underline">
            View Rooms →
          </span>
        </div>
      </div>
    </Link>
  );
};
