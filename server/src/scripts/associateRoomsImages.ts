import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';

export interface RoomImagesAssignmentReport {
  totalRoomsImagesDiscovered: number;
  propertiesCount: number;
  propertiesUpdatedWithCardImage: number;
  roomImagesUpdated: number;
  assignedImagesMap: Array<{
    propertyId: string;
    propertyName: string;
    city: string;
    cardImage: string;
  }>;
}

export async function associateRoomsImages(): Promise<RoomImagesAssignmentReport> {
  const rootDir = path.resolve(__dirname, '../../../');
  const serverRoomsImagesDir = path.resolve(__dirname, '../../roomsimages');
  const photosRoomsImagesDir = path.resolve(rootDir, 'photos/roomsimages');
  const uploadsRoomsImagesDir = path.resolve(rootDir, 'uploads/roomsimages');

  if (!fs.existsSync(serverRoomsImagesDir)) {
    throw new Error(`Directory not found: ${serverRoomsImagesDir}`);
  }

  // Ensure mirrored directories exist
  fs.mkdirSync(photosRoomsImagesDir, { recursive: true });
  fs.mkdirSync(uploadsRoomsImagesDir, { recursive: true });

  const supportedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const files = fs
    .readdirSync(serverRoomsImagesDir)
    .filter((f) => supportedExts.has(path.extname(f).toLowerCase()))
    .sort();

  console.log(`Discovered ${files.length} room images in ${serverRoomsImagesDir}`);

  // Mirror files to photos/roomsimages and uploads/roomsimages
  for (const file of files) {
    const src = path.join(serverRoomsImagesDir, file);
    const dstPhoto = path.join(photosRoomsImagesDir, file);
    const dstUpload = path.join(uploadsRoomsImagesDir, file);
    if (!fs.existsSync(dstPhoto)) {
      try {
        fs.copyFileSync(src, dstPhoto);
      } catch {}
    }
    if (!fs.existsSync(dstUpload)) {
      try {
        fs.copyFileSync(src, dstUpload);
      } catch {}
    }
  }

  // Fetch all active properties
  const properties = await prisma.property.findMany({
    where: { status: 'ACTIVE' },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      rooms: {
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const report: RoomImagesAssignmentReport = {
    totalRoomsImagesDiscovered: files.length,
    propertiesCount: properties.length,
    propertiesUpdatedWithCardImage: 0,
    roomImagesUpdated: 0,
    assignedImagesMap: [],
  };

  if (properties.length === 0 || files.length === 0) {
    return report;
  }

  // Assign a distinct image from roomsimages for each place / property card
  // Using a stable assignment: property i gets files[i % files.length]
  // With 24 properties and 37 images, every property gets a completely unique image!
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const cardImageFileName = files[i % files.length];
    const cardImageUrl = `/roomsimages/${encodeURIComponent(cardImageFileName)}`;

    // Check if property already has this as sortOrder: 0
    const primaryImg = property.images[0];
    if (!primaryImg || primaryImg.imageUrl !== cardImageUrl) {
      // Re-order existing images or insert/update primary image
      // First, shift any existing images sortOrder up
      await prisma.propertyImage.updateMany({
        where: {
          propertyId: property.id,
          imageUrl: { not: cardImageUrl },
        },
        data: {
          sortOrder: 1, // Will be ordered after
        },
      });

      // Check if this image already exists for this property
      const existingRecord = await prisma.propertyImage.findFirst({
        where: {
          propertyId: property.id,
          imageUrl: cardImageUrl,
        },
      });

      if (existingRecord) {
        await prisma.propertyImage.update({
          where: { id: existingRecord.id },
          data: { sortOrder: 0 },
        });
      } else {
        await prisma.propertyImage.create({
          data: {
            propertyId: property.id,
            imageUrl: cardImageUrl,
            altText: `${property.name} - Luxury room view`,
            sortOrder: 0,
          },
        });
      }

      report.propertiesUpdatedWithCardImage += 1;
    }

    report.assignedImagesMap.push({
      propertyId: property.id,
      propertyName: property.name,
      city: property.city,
      cardImage: cardImageUrl,
    });

    // Also assign distinct room images for each room of this property
    for (let r = 0; r < property.rooms.length; r++) {
      const room = property.rooms[r];
      // Pick a distinct room image index (e.g. from the latter half of files or offset)
      const roomImgIndex = (properties.length + i * 2 + r) % files.length;
      const roomImgFileName = files[roomImgIndex];
      const roomImageUrl = `/roomsimages/${encodeURIComponent(roomImgFileName)}`;

      const existingRoomImg = room.images[0];
      if (!existingRoomImg || existingRoomImg.imageUrl !== roomImageUrl) {
        if (existingRoomImg) {
          await prisma.roomImage.update({
            where: { id: existingRoomImg.id },
            data: {
              imageUrl: roomImageUrl,
              altText: `${room.name} room interior`,
            },
          });
        } else {
          await prisma.roomImage.create({
            data: {
              roomId: room.id,
              imageUrl: roomImageUrl,
              altText: `${room.name} room interior`,
              sortOrder: 0,
            },
          });
        }
        report.roomImagesUpdated += 1;
      }
    }
  }

  return report;
}

if (require.main === module) {
  associateRoomsImages()
    .then((report) => {
      console.log('=== Room Images Card Assignment Report ===');
      console.log(`Discovered: ${report.totalRoomsImagesDiscovered} images in roomsimages/`);
      console.log(`Properties: ${report.propertiesCount} active properties`);
      console.log(`Properties updated with distinct card image: ${report.propertiesUpdatedWithCardImage}`);
      console.log(`Room images updated: ${report.roomImagesUpdated}`);
      console.log('\nSample card image assignments:');
      report.assignedImagesMap.slice(0, 10).forEach((entry, idx) => {
        console.log(`  [${idx + 1}] ${entry.propertyName} (${entry.city}) -> ${entry.cardImage}`);
      });
      console.log('==========================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Room images assignment failed:', err);
      process.exit(1);
    });
}
