import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Home, Sparkles, Plus, Image, Bed, ArrowRight, AlertCircle } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
}

export const NewPropertyPage: React.FC = () => {
  const navigate = useNavigate();

  // Load amenities
  const { data: amenitiesData } = useQuery<{ amenities: Amenity[] }>({
    queryKey: ['amenities'],
    queryFn: () => apiFetch<{ amenities: Amenity[] }>('/amenities'),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'HOTEL' | 'LOUNGE' | 'GUEST_HOUSE'>('HOTEL');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Initial room category
  const [roomName, setRoomName] = useState('Deluxe King Suite');
  const [roomDescription, setRoomDescription] = useState('Spacious room with king bed and private view.');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [roomPriceINR, setRoomPriceINR] = useState(4500);
  const [roomTotalUnits, setRoomTotalUnits] = useState(4);

  const [formError, setFormError] = useState<string | null>(null);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);

      // 1. Create property
      const propRes = await apiFetch<{ property: { id: string } }>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          type,
          address,
          city,
          country,
          amenityIds: selectedAmenities,
          images: [
            {
              imageUrl,
              altText: name,
              sortOrder: 0,
            },
          ],
        }),
      });

      // 2. Create room category
      await apiFetch(`/properties/${propRes.property.id}/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
          capacity: Number(roomCapacity),
          pricePerNight: Number(roomPriceINR) * 100, // convert INR to paise
          totalUnits: Number(roomTotalUnits),
          currency: 'INR',
        }),
      });

      return propRes.property.id;
    },
    onSuccess: (propertyId) => {
      navigate(`/properties/${propertyId}`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create listing.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-staynest-olive">
          Hosting on StayNest
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal mt-1">
          List Your Property
        </h1>
        <p className="text-xs text-staynest-muted mt-1">
          Add your boutique hotel, alpine lounge, or family guest house to our curated marketplace.
        </p>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Property Basics */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-6">
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal flex items-center space-x-2">
            <Home className="w-5 h-5 text-staynest-terracotta" />
            <span>Property Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Property Title / Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Lakeview Heritage Haveli"
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Category / Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="HOTEL">Boutique Hotel</option>
                <option value="LOUNGE">Alpine / Forest Lounge</option>
                <option value="GUEST_HOUSE">Heritage Guest House</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Udaipur, Manali, Goa"
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Full Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or local landmark"
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Property Description
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the architecture, ambiance, views, and unique highlights of your property..."
                className="w-full text-xs font-medium px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none leading-relaxed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Cover Photo URL (Unsplash or Cloudinary)
              </label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Amenities */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-4">
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-staynest-olive" />
            <span>Select Available Amenities</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {amenitiesData?.amenities.map((a) => {
              const isChecked = selectedAmenities.includes(a.id);
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleAmenity(a.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                    isChecked
                      ? 'border-staynest-olive bg-staynest-olive-light/50 text-staynest-olive'
                      : 'border-[#E6E1D8] bg-white text-staynest-charcoal hover:border-gray-400'
                  }`}
                >
                  <span>{a.name}</span>
                  {isChecked && <span className="text-staynest-olive font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Initial Room Inventory Pool */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-6">
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal flex items-center space-x-2">
            <Bed className="w-5 h-5 text-staynest-terracotta" />
            <span>Initial Room Category & Inventory Pool</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Room Category Name
              </label>
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Deluxe Garden Room"
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Max Capacity (Guests)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Nightly Price (INR)
              </label>
              <input
                type="number"
                min={100}
                required
                value={roomPriceINR}
                onChange={(e) => setRoomPriceINR(Number(e.target.value))}
                placeholder="e.g. 4500"
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Total Inventory Units (Pooled)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={roomTotalUnits}
                onChange={(e) => setRoomTotalUnits(Number(e.target.value))}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Room Description
              </label>
              <input
                type="text"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="e.g. King-sized bed, en-suite marble bathroom, balcony."
                className="w-full text-xs font-medium px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/host')}
            className="px-6 py-3.5 rounded-full border border-[#E6E1D8] bg-white text-xs font-bold text-staynest-charcoal hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-8 py-3.5 rounded-full bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
          >
            <span>{createMutation.isPending ? 'Publishing Listing...' : 'Publish Accommodation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
