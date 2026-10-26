import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PropertyType, Role, RoomType } from '@prisma/client';
import { databaseUrl, prisma } from '../config/database';
import { hashPassword } from '../modules/auth/password';

type Asset = { publicId: string; file: string; tags: string[] };

type Section = {
  key: string;
  city: { name: string; slug: string; state: string };
  type: PropertyType;
  rooms: RoomType[];
  names: string[];
  amenities: string[];
  blurb: string;
};

const SECTIONS: Section[] = [
  {
    key: 'udaipur',
    city: { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan' },
    type: 'HOTEL',
    rooms: ['SUITE', 'DELUXE'],
    names: ['Lake Court Hotel', 'Haveli Wing', 'Courtyard House'],
    amenities: ['High-speed WiFi', 'Swimming Pool', 'Complimentary Breakfast', 'Air Conditioning'],
    blurb: 'A lakeside hotel with courtyard rooms and a quiet pool.',
  },
  {
    key: 'jaipur',
    city: { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan' },
    type: 'HOTEL',
    rooms: ['DELUXE', 'STANDARD'],
    names: ['Pink City Hotel', 'Palace Road House', 'Johari Hotel'],
    amenities: ['High-speed WiFi', 'Complimentary Breakfast', 'Air Conditioning', 'Free Parking'],
    blurb: 'A city hotel a short walk from the old bazaars.',
  },
  {
    key: 'bangalore',
    city: { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka' },
    type: 'HOTEL',
    rooms: ['SUITE', 'STUDIO'],
    names: ['Indiranagar Hotel', 'Cubbon Suites', 'Garden City Hotel'],
    amenities: ['High-speed WiFi', 'Dedicated Workspace', 'Air Conditioning', 'Complimentary Breakfast'],
    blurb: 'A city hotel with a desk in every room.',
  },
  {
    key: 'manali',
    city: { name: 'Manali', slug: 'manali', state: 'Himachal Pradesh' },
    type: 'LOUNGE',
    rooms: ['CABIN', 'STUDIO'],
    names: ['Cedar Lounge', 'Pine Loft', 'Valley Lounge'],
    amenities: ['High-speed WiFi', 'Mountain View', 'Free Parking', 'Dedicated Workspace'],
    blurb: 'A cedar lounge above the valley, with cabins and small studios.',
  },
  {
    key: 'munnar',
    city: { name: 'Munnar', slug: 'munnar', state: 'Kerala' },
    type: 'LOUNGE',
    rooms: ['CABIN', 'DELUXE'],
    names: ['Tea Hill Lounge', 'Mist Cabin Lodge', 'Cardamom Lounge'],
    amenities: ['High-speed WiFi', 'Mountain View', 'Complimentary Breakfast', 'Free Parking'],
    blurb: 'A hill lounge set above the tea slopes.',
  },
  {
    key: 'goa',
    city: { name: 'Goa', slug: 'goa', state: 'Goa' },
    type: 'GUEST_HOUSE',
    rooms: ['STANDARD', 'FAMILY'],
    names: ['Ashwem Guest House', 'Palm Veranda', 'Mandrem House'],
    amenities: ['High-speed WiFi', 'Private Garden', 'Kitchen & Cookware', 'Air Conditioning'],
    blurb: 'A beach guest house with a garden and a family cottage.',
  },
  {
    key: 'kochi',
    city: { name: 'Kochi', slug: 'kochi', state: 'Kerala' },
    type: 'GUEST_HOUSE',
    rooms: ['FAMILY', 'STANDARD'],
    names: ['Fort Kochi House', 'Harbour Guest House', 'Spice Lane House'],
    amenities: ['High-speed WiFi', 'Kitchen & Cookware', 'Air Conditioning', 'Free Parking'],
    blurb: 'A fort guest house with a shared kitchen.',
  },
  {
    key: 'varanasi',
    city: { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh' },
    type: 'GUEST_HOUSE',
    rooms: ['DELUXE', 'SUITE'],
    names: ['Ghat Guest House', 'River Step House', 'Old City Rooms'],
    amenities: ['High-speed WiFi', 'Complimentary Breakfast', 'Air Conditioning'],
    blurb: 'Rooms above the ghats, a short walk from the evening aarti.',
  },
];

const AMENITIES = [
  { name: 'High-speed WiFi', iconKey: 'wifi' },
  { name: 'Swimming Pool', iconKey: 'pool' },
  { name: 'Complimentary Breakfast', iconKey: 'coffee' },
  { name: 'Air Conditioning', iconKey: 'air-conditioning' },
  { name: 'Mountain View', iconKey: 'mountain' },
  { name: 'Spa & Wellness', iconKey: 'spa' },
  { name: 'Private Garden', iconKey: 'flower' },
  { name: 'Dedicated Workspace', iconKey: 'briefcase' },
  { name: 'Kitchen & Cookware', iconKey: 'utensils' },
  { name: 'Free Parking', iconKey: 'car' },
];

const ROOM_PRICE: Record<RoomType, number> = {
  STANDARD: 280000,
  STUDIO: 360000,
  DELUXE: 450000,
  CABIN: 540000,
  FAMILY: 690000,
  SUITE: 820000,
};

const ROOM_CAPACITY: Record<RoomType, number> = {
  STANDARD: 2,
  DELUXE: 3,
  SUITE: 2,
  STUDIO: 2,
  CABIN: 4,
  FAMILY: 5,
};

export function photosDir(): string {
  if (process.env.CATALOG_PHOTOS) return path.resolve(process.env.CATALOG_PHOTOS);
  return path.resolve(__dirname, '../../../photos');
}

function stayPhoto(asset: Asset): boolean {
  if (asset.publicId.startsWith('samples/') || asset.publicId === 'sample') return false;
  return true;
}

function pinnedSection(asset: Asset): string | null {
  const id = asset.publicId.toLowerCase();
  if (id.includes('ghat') || id.includes('varanasi')) return 'varanasi';
  if (id.includes('mountain') || id.includes('manali') || id.includes('cabin')) return 'manali';
  if (id.includes('beach') || id.includes('goa')) return 'goa';
  if (id.includes('urban') || id.includes('bangalore') || id.includes('city')) return 'bangalore';
  if (id.includes('munnar') || id.includes('tea')) return 'munnar';
  if (id.includes('jaipur')) return 'jaipur';
  if (id.includes('kochi')) return 'kochi';
  if (id.includes('udaipur') || id.includes('haveli') || id.includes('lake')) return 'udaipur';
  return null;
}

export function groupStayPhotos(assets: Asset[]): Map<string, Asset[]> {
  const buckets = new Map<string, Asset[]>(SECTIONS.map((section) => [section.key, []]));
  const loose: Asset[] = [];
  for (const asset of assets.filter(stayPhoto)) {
    const pin = pinnedSection(asset);
    if (pin && buckets.has(pin)) buckets.get(pin)!.push(asset);
    else loose.push(asset);
  }
  loose.sort((a, b) => a.publicId.localeCompare(b.publicId));
  loose.forEach((asset, index) => {
    buckets.get(SECTIONS[index % SECTIONS.length].key)!.push(asset);
  });
  return buckets;
}

function listPhotos(dir: string): Asset[] {
  if (!fs.existsSync(dir)) return [];
  const assets: Asset[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
      const file = path.relative(dir, full).split(path.sep).join('/');
      assets.push({ publicId: file.replace(/\.[^.]+$/, ''), file, tags: [] });
    }
  };
  walk(dir);
  return assets;
}

function photoUrl(file: string): string {
  const encoded = file.split('/').map(encodeURIComponent).join('/');
  return `/catalog-photos/${encoded}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function roomLabel(roomType: RoomType): string {
  if (roomType === 'SUITE') return 'Suite';
  const lower = roomType.toLowerCase();
  return lower[0].toUpperCase() + lower.slice(1);
}

function importTables() {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}

async function seedAccounts() {
  for (const item of AMENITIES) {
    await prisma.amenity.upsert({ where: { name: item.name }, update: { iconKey: item.iconKey }, create: item });
  }
}

async function seedStays(assets: Asset[]) {
  const host = await prisma.user.findFirst({ where: { role: 'HOST' } });
  if (!host) throw new Error('No host account found. Please register a host account first.');
  const amenities = await prisma.amenity.findMany();
  const grouped = groupStayPhotos(assets);
  const counts: Record<string, number> = {};

  for (const section of SECTIONS) {
    const city = await prisma.city.upsert({
      where: { slug: section.city.slug },
      update: { name: section.city.name, state: section.city.state, country: 'India' },
      create: { ...section.city, country: 'India' },
    });
    const stays = chunk(grouped.get(section.key) || [], 3).filter((group) => group.length > 0);
    counts[section.key] = stays.length;
    for (let index = 0; index < stays.length; index += 1) {
      const rooms = section.rooms.map((roomType) => ({
        name: roomLabel(roomType),
        roomType,
        capacity: ROOM_CAPACITY[roomType],
        pricePerNight: ROOM_PRICE[roomType] + index * 15000,
        currency: 'INR',
        totalUnits: roomType === 'FAMILY' || roomType === 'SUITE' ? 2 : 4,
        isActive: true,
        description: `${roomLabel(roomType)} room at ${section.names[index % section.names.length]}.`,
      }));
      await prisma.property.create({
        data: {
          hostId: host.id,
          name: index < section.names.length ? section.names[index] : `${section.names[index % section.names.length]} ${index + 1}`,
          description: `${section.blurb} Sample stay for browsing ${section.city.name}.`,
          type: section.type,
          address: `${section.city.name} old town`,
          city: city.name,
          cityId: city.id,
          state: city.state,
          country: 'India',
          status: 'ACTIVE',
          minPricePerNight: Math.min(...rooms.map((room) => room.pricePerNight)),
          maxCapacity: Math.max(...rooms.map((room) => room.capacity)),
          hasActiveRooms: true,
          images: {
            create: stays[index].map((asset, sortOrder) => ({
              imageUrl: photoUrl(asset.file),
              altText: `${section.city.name} stay photo`,
              sortOrder,
            })),
          },
          rooms: { create: rooms },
          amenities: {
            create: section.amenities
              .map((name) => amenities.find((amenity) => amenity.name === name))
              .filter((amenity): amenity is (typeof amenities)[number] => Boolean(amenity))
              .map((amenity) => ({ amenityId: amenity.id })),
          },
        },
      });
    }
  }
  return counts;
}

export async function ensureLocalCatalog() {
  importTables();
  await seedAccounts();
  const stays = await prisma.property.count();
  if (stays > 0) {
    console.log(`[catalog] local postgres already has ${stays} stays`);
    return;
  }
  const dir = photosDir();
  const photos = listPhotos(dir);
  if (!photos.length) {
    console.log(`[catalog] tables are imported. Add stay photos to ${dir} and restart to fill listings.`);
    return;
  }
  const counts = await seedStays(photos);
  console.log(`[catalog] filled local postgres from ${dir} ${JSON.stringify(counts)}`);
}

const isDirectRun = process.argv[1]?.includes('importLocalCatalog');
if (isDirectRun) {
  ensureLocalCatalog()
    .catch((error) => {
      const text = error instanceof Error ? error.message : String(error);
      console.error(text.split('\n').filter(Boolean).slice(0, 8).join('\n'));
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
