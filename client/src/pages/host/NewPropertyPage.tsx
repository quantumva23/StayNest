import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fieldErrors, messageForError, uploadImage } from '../../lib/api';
import { Home, ListChecks, Plus, Image, Bed, ArrowRight, AlertCircle } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
}

interface CityOption {
  id: string;
  name: string;
  slug: string;
  state?: string | null;
}

const ROOM_TYPES = [
  { id: 'STANDARD', label: 'Standard' },
  { id: 'DELUXE', label: 'Deluxe' },
  { id: 'SUITE', label: 'Suite' },
  { id: 'STUDIO', label: 'Studio' },
  { id: 'CABIN', label: 'Cabin' },
  { id: 'FAMILY', label: 'Family' },
] as const;

export const NewPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Load amenities
  const { data: amenitiesData } = useQuery<{ amenities: Amenity[] }>({
    queryKey: ['amenities'],
    queryFn: () => apiFetch<{ amenities: Amenity[] }>('/amenities'),
  });

  const { data: citiesData } = useQuery<{ cities: CityOption[] }>({
    queryKey: ['cities'],
    queryFn: () => apiFetch<{ cities: CityOption[] }>('/cities'),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'HOTEL' | 'LOUNGE' | 'GUEST_HOUSE'>('HOTEL');
  const [address, setAddress] = useState('');
  const [citySlug, setCitySlug] = useState('');
  const [country, setCountry] = useState('India');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Initial room category
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]['id']>('DELUXE');
  const [roomName, setRoomName] = useState('Deluxe King Suite');
  const [roomDescription, setRoomDescription] = useState('Spacious room with king bed and private view.');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [roomPriceINR, setRoomPriceINR] = useState(4500);
  const [roomTotalUnits, setRoomTotalUnits] = useState(4);

  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      setFields({});

      const propRes = await apiFetch<{ property: { id: string } }>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          type,
          address,
          citySlug,
          country,
          amenityIds: selectedAmenities,
          images: [
            {
              imageUrl,
              altText: name,
              sortOrder: 0,
            },
          ],
          rooms: [
            {
              name: roomName,
              description: roomDescription,
              roomType,
              capacity: Number(roomCapacity),
              nightlyPrice: Number(roomPriceINR),
              totalUnits: Number(roomTotalUnits),
              currency: 'INR',
            },
          ],
        }),
      });

      return propRes.property.id;
    },
    onSuccess: async (propertyId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['featured-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['explore-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['host-properties'] }),
      ]);
      navigate(`/properties/${propertyId}`);
    },
    onError: (err: unknown) => {
      setFields(fieldErrors(err));
      setFormError(messageForError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setFormError('Add a cover photo before submitting.');
      return;
    }
    createMutation.mutate();
  };

  const onCoverPhoto = async (file?: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    setFormError(null);
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setImageUrl('');
      setFormError(messageForError(err));
    } finally {
      setUploadingPhoto(false);
    }
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

      {formError && Object.keys(fields).every((path) => !['name', 'description', 'address', 'citySlug', 'images.0.imageUrl', 'rooms.0.roomType', 'rooms.0.nightlyPrice', 'rooms.0.name', 'rooms.0.capacity', 'rooms.0.totalUnits'].includes(path)) && (
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
              {fields.name && <p className="text-[11px] text-red-700 mt-1">{fields.name}</p>}
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
              <select
                required
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="">Choose a city</option>
                {(citiesData?.cities || []).map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}{item.state ? `, ${item.state}` : ''}
                  </option>
                ))}
              </select>
              {fields.citySlug && <p className="text-[11px] text-red-700 mt-1">{fields.citySlug}</p>}
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
              {fields.address && <p className="text-[11px] text-red-700 mt-1">{fields.address}</p>}
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
              {fields.description && <p className="text-[11px] text-red-700 mt-1">{fields.description}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
                Cover photo
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onCoverPhoto(e.target.files?.[0])}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7]"
              />
              {uploadingPhoto && <p className="text-[11px] text-staynest-muted mt-1">Uploading photo...</p>}
              {imageUrl && <img src={imageUrl} alt="" className="mt-3 h-32 w-48 object-cover rounded-2xl border border-[#E6E1D8]" />}
              {fields['images.0.imageUrl'] && <p className="text-[11px] text-red-700 mt-1">{fields['images.0.imageUrl']}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Amenities */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-4">
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal flex items-center space-x-2">
            <ListChecks className="w-5 h-5 text-staynest-olive" />
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
                Room type
              </label>
              <select
                required
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as (typeof ROOM_TYPES)[number]['id'])}
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none cursor-pointer"
              >
                {ROOM_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              {fields['rooms.0.roomType'] && <p className="text-[11px] text-red-700 mt-1">{fields['rooms.0.roomType']}</p>}
            </div>

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
              {fields['rooms.0.nightlyPrice'] && <p className="text-[11px] text-red-700 mt-1">{fields['rooms.0.nightlyPrice']}</p>}
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
            disabled={createMutation.isPending || uploadingPhoto}
            className="px-8 py-3.5 rounded-full bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
          >
            <span>{createMutation.isPending ? 'Submitting...' : 'Submit for review'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
