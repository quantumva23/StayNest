import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const secret = process.env.JWT_SECRET || 'staynest-secret-key-development-minimum-32-chars-long';
  return crypto.createHash('sha256').update(password + secret).digest('hex');
}

async function main() {
  console.log('[Seed] Seeding StayNest database...');

  // 1. Create Amenities
  const amenityData = [
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

  const amenities = [];
  for (const item of amenityData) {
    const amenity = await prisma.amenity.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
    amenities.push(amenity);
  }

  // 2. Create Demo Users (Guest, Host, Admin)
  const defaultPasswordHash = hashPassword('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@staynest.dev' },
    update: {},
    create: {
      email: 'admin@staynest.dev',
      name: 'StayNest Admin',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const host = await prisma.user.upsert({
    where: { email: 'host@staynest.dev' },
    update: {},
    create: {
      email: 'host@staynest.dev',
      name: 'Aarav Singhania',
      passwordHash: defaultPasswordHash,
      role: 'HOST',
      isActive: true,
    },
  });

  const guest = await prisma.user.upsert({
    where: { email: 'guest@staynest.dev' },
    update: {},
    create: {
      email: 'guest@staynest.dev',
      name: 'Rohan Sharma',
      passwordHash: defaultPasswordHash,
      role: 'GUEST',
      isActive: true,
    },
  });

  console.log('[Seed] Created demo users (password: password123):', {
    admin: admin.email,
    host: host.email,
    guest: guest.email,
  });

  // 3. Properties and Rooms
  const propertiesData = [
    {
      name: 'The Heritage Haveli & Spa',
      description: 'A restored 18th-century royal haveli featuring tranquil courtyards, traditional Rajasthani sandstone carvings, rooftop dining under the stars, and luxurious holistic wellness rituals.',
      type: 'HOTEL' as const,
      address: 'Near Lake Pichola, Old City',
      city: 'Udaipur',
      state: 'Rajasthan',
      country: 'India',
      status: 'ACTIVE' as const,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
          altText: 'Courtyard view of Heritage Haveli',
          sortOrder: 0,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
          altText: 'Luxury suite bedroom',
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
          altText: 'Swimming pool by night',
          sortOrder: 2,
        },
      ],
      rooms: [
        {
          name: 'Royal Heritage Suite',
          description: 'Spacious suite with hand-carved jharokhas, marble bath, and panoramic view of Lake Pichola.',
          capacity: 2,
          pricePerNight: 850000, // INR 8,500.00
          currency: 'INR',
          totalUnits: 5,
        },
        {
          name: 'Courtyard Deluxe Room',
          description: 'Charming king room opening directly into the central fountain courtyard.',
          capacity: 3,
          pricePerNight: 550000, // INR 5,500.00
          currency: 'INR',
          totalUnits: 8,
        },
      ],
      amenityNames: ['High-speed WiFi', 'Swimming Pool', 'Complimentary Breakfast', 'Spa & Wellness', 'Air Conditioning'],
    },
    {
      name: 'Pinecrest Alpine Lounge & Retreat',
      description: 'Nestled amidst whispering cedar forests, Pinecrest is a cozy modern lounge featuring floor-to-ceiling glass, an artisan coffee and cocktail lounge, and open-fire deck.',
      type: 'LOUNGE' as const,
      address: 'Upper Mall Road, Wildflower Woods',
      city: 'Manali',
      state: 'Himachal Pradesh',
      country: 'India',
      status: 'ACTIVE' as const,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
          altText: 'Pinecrest exterior with pine forest background',
          sortOrder: 0,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          altText: 'Wooden cabin interior with fireplace',
          sortOrder: 1,
        },
      ],
      rooms: [
        {
          name: 'Forest Loft Cabin',
          description: 'Two-tier loft with private wood-burning stove and panoramic balcony.',
          capacity: 4,
          pricePerNight: 620000, // INR 6,200.00
          currency: 'INR',
          totalUnits: 4,
        },
        {
          name: 'Valley View Studio',
          description: 'Sunlit studio ideal for remote creatives and nature lovers.',
          capacity: 2,
          pricePerNight: 420000, // INR 4,200.00
          currency: 'INR',
          totalUnits: 6,
        },
      ],
      amenityNames: ['High-speed WiFi', 'Mountain View', 'Dedicated Workspace', 'Free Parking', 'Complimentary Breakfast'],
    },
    {
      name: 'Casa Mar Bella Guest House',
      description: 'A serene Indo-Portuguese coastal guest house just 300 meters from the golden sands of Ashwem beach. Shaded by swaying palms with hammock-strewn verandas.',
      type: 'GUEST_HOUSE' as const,
      address: 'Mandrem Beach Road',
      city: 'Goa',
      state: 'Goa',
      country: 'India',
      status: 'ACTIVE' as const,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
          altText: 'Tropical coastal villa exterior',
          sortOrder: 0,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
          altText: 'Airy bohemian bedroom',
          sortOrder: 1,
        },
      ],
      rooms: [
        {
          name: 'Veranda King Garden Room',
          description: 'Relaxed bohemian room with private patio looking out onto tropical frangipani trees.',
          capacity: 2,
          pricePerNight: 380000, // INR 3,800.00
          currency: 'INR',
          totalUnits: 5,
        },
        {
          name: 'Two-Bedroom Beach Cottage',
          description: 'Full self-contained cottage with kitchenette for families or travel companions.',
          capacity: 5,
          pricePerNight: 750000, // INR 7,500.00
          currency: 'INR',
          totalUnits: 2,
        },
      ],
      amenityNames: ['High-speed WiFi', 'Private Garden', 'Kitchen & Cookware', 'Air Conditioning', 'Free Parking'],
    },
    {
      name: 'Skyline Metropolis Hotel & Executive Lounge',
      description: 'Sophisticated metropolitan living in the heart of the business district. Featuring contemporary designer architecture, soundproof executive suites, and a skybar.',
      type: 'HOTEL' as const,
      address: 'Indiranagar 100ft Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      status: 'ACTIVE' as const,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
          altText: 'Modern hotel facade and entrance',
          sortOrder: 0,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
          altText: 'Executive hotel suite',
          sortOrder: 1,
        },
      ],
      rooms: [
        {
          name: 'Executive King Suite',
          description: 'Ergonomic workspace, high-thread-count linens, and complimentary club lounge access.',
          capacity: 2,
          pricePerNight: 690000, // INR 6,900.00
          currency: 'INR',
          totalUnits: 12,
        },
      ],
      amenityNames: ['High-speed WiFi', 'Air Conditioning', 'Dedicated Workspace', 'Complimentary Breakfast'],
    },
  ];

  for (const propData of propertiesData) {
    const existing = await prisma.property.findFirst({
      where: { name: propData.name },
    });

    if (!existing) {
      const property = await prisma.property.create({
        data: {
          hostId: host.id,
          name: propData.name,
          description: propData.description,
          type: propData.type,
          address: propData.address,
          city: propData.city,
          state: propData.state,
          country: propData.country,
          status: propData.status,
          images: {
            create: propData.images,
          },
          rooms: {
            create: propData.rooms,
          },
        },
      });

      // Connect amenities
      for (const aName of propData.amenityNames) {
        const amenity = amenities.find((a) => a.name === aName);
        if (amenity) {
          await prisma.propertyAmenity.create({
            data: {
              propertyId: property.id,
              amenityId: amenity.id,
            },
          });
        }
      }
    }
  }

  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
