import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';

interface DiscoveryReport {
  totalDiscovered: number;
  propertiesUpdated: number;
  propertyImagesAdded: number;
  roomImagesAdded: number;
  duplicatesSkipped: number;
  files: string[];
}

export async function associateDemoPhotos(): Promise<DiscoveryReport> {
  const rootDir = path.resolve(__dirname, '../../../');
  const photosDir = path.resolve(rootDir, 'photos');
  const uploadsPropsDir = path.resolve(rootDir, 'uploads/properties');
  const serverImagesDir = path.resolve(__dirname, '../../images');

  // Discover candidate source directories in priority order
  const searchDirs = [photosDir, uploadsPropsDir, serverImagesDir].filter((d) =>
    fs.existsSync(d)
  );

  const supportedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const discoveredFiles = new Map<string, string>(); // basename -> absolute path

  for (const dir of searchDirs) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExts.has(ext) && !discoveredFiles.has(entry.name)) {
          discoveredFiles.set(entry.name, path.join(dir, entry.name));
        }
      }
    }
  }

  const allFiles = Array.from(discoveredFiles.keys()).sort();
  const report: DiscoveryReport = {
    totalDiscovered: allFiles.length,
    propertiesUpdated: 0,
    propertyImagesAdded: 0,
    roomImagesAdded: 0,
    duplicatesSkipped: 0,
    files: allFiles,
  };

  // Ensure all discovered files are mirrored to /photos and /server/uploads/properties
  const serverUploadsProps = path.resolve(rootDir, 'server/uploads/properties');
  fs.mkdirSync(photosDir, { recursive: true });
  fs.mkdirSync(serverUploadsProps, { recursive: true });

  for (const [filename, sourcePath] of discoveredFiles.entries()) {
    const targetPhotos = path.join(photosDir, filename);
    const targetServerUploads = path.join(serverUploadsProps, filename);

    if (!fs.existsSync(targetPhotos)) {
      try {
        fs.copyFileSync(sourcePath, targetPhotos);
      } catch {}
    }
    if (!fs.existsSync(targetServerUploads)) {
      try {
        fs.copyFileSync(sourcePath, targetServerUploads);
      } catch {}
    }
  }

  // Fetch all active properties with their existing images and rooms
  const properties = await prisma.property.findMany({
    where: { status: 'ACTIVE' },
    include: {
      images: true,
      rooms: {
        include: {
          images: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (properties.length === 0) {
    return report;
  }

  // City keyword matching heuristics
  const cityKeywords: Record<string, string[]> = {
    varanasi: ['aarti', 'ghat', 'varanasi', 'sacred', 'river'],
    manali: ['neuner-icn', 'mountain', 'pine', 'manali', 'alpine', 'forest', 'wood'],
    goa: ['bertelli', 'thanzeena', 'beach', 'goa', 'palm', 'solaticace', 'ocean'],
    nainital: ['neuner-zi3', 'lake', 'mist', 'nainital', 'juman', 'hill', 'cottage'],
    udaipur: ['swaroop', 'vilas', 'haveli', 'lake', 'udaipur', 'pichola', 'court'],
    jaipur: ['desert', 'camp', 'prince', 'jaipur', 'palace', 'johari'],
    bangalore: ['metropolis', 'executive', 'urban', 'city', 'bangalore', 'point3d'],
    munnar: ['tea', 'mist', 'munnar', 'kallianpur', 'plantation', 'hill'],
    kochi: ['kochi', 'harbour', 'fort', 'water', 'boat'],
  };

  const assignedPhotos = new Set<string>();

  // 1. Assign destination-matched photos to properties
  for (const property of properties) {
    const citySlug = property.city.toLowerCase().trim();
    const keywords = cityKeywords[citySlug] || [];

    const matchedFiles = allFiles.filter((filename) => {
      const lower = filename.toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });

    let propertyUpdated = false;
    let orderIndex = property.images.length;

    for (const filename of matchedFiles) {
      const imageUrl = `/uploads/properties/${encodeURIComponent(filename)}`;
      const alreadyHas = await prisma.propertyImage.findFirst({
        where: {
          propertyId: property.id,
          OR: [{ imageUrl }, { imageUrl: { contains: encodeURIComponent(filename) } }],
        },
      });

      if (alreadyHas) {
        report.duplicatesSkipped += 1;
      } else {
        await prisma.propertyImage.create({
          data: {
            propertyId: property.id,
            imageUrl,
            altText: `${property.name} - ${filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')}`,
            sortOrder: orderIndex++,
          },
        });
        report.propertyImagesAdded += 1;
        propertyUpdated = true;
      }
      assignedPhotos.add(filename);
    }

    // Assign room images if room currently has none
    if (property.rooms.length > 0) {
      for (let rIdx = 0; rIdx < property.rooms.length; rIdx++) {
        const room = property.rooms[rIdx];
        const existingRoomImg = await prisma.roomImage.findFirst({
          where: { roomId: room.id },
        });

        if (!existingRoomImg) {
          // Pick a room-interior styled photo or matching photo
          const roomCandidate =
            allFiles.find((f) => {
              const fl = f.toLowerCase();
              return (
                (fl.includes('bed') ||
                  fl.includes('room') ||
                  fl.includes('cottonbro') ||
                  fl.includes('spacejoy') ||
                  fl.includes('sasha-kaunas')) &&
                !assignedPhotos.has(f)
              );
            }) || matchedFiles[rIdx % matchedFiles.length] || allFiles[rIdx % allFiles.length];

          if (roomCandidate) {
            const roomImgUrl = `/uploads/properties/${encodeURIComponent(roomCandidate)}`;
            await prisma.roomImage.create({
              data: {
                roomId: room.id,
                imageUrl: roomImgUrl,
                altText: `${room.name} interior`,
                sortOrder: 0,
              },
            });
            report.roomImagesAdded += 1;
            assignedPhotos.add(roomCandidate);
          }
        } else {
          report.duplicatesSkipped += 1;
        }
      }
    }

    if (propertyUpdated) {
      report.propertiesUpdated += 1;
    }
  }

  // 2. Deterministic round-robin assignment for remaining unassigned photos
  const unassigned = allFiles.filter((f) => !assignedPhotos.has(f));
  for (let i = 0; i < unassigned.length; i++) {
    const filename = unassigned[i];
    const targetProp = properties[i % properties.length];
    const imageUrl = `/uploads/properties/${encodeURIComponent(filename)}`;

    const alreadyHas = await prisma.propertyImage.findFirst({
      where: {
        propertyId: targetProp.id,
        OR: [{ imageUrl }, { imageUrl: { contains: encodeURIComponent(filename) } }],
      },
    });

    if (alreadyHas) {
      report.duplicatesSkipped += 1;
    } else {
      await prisma.propertyImage.create({
        data: {
          propertyId: targetProp.id,
          imageUrl,
          altText: `${targetProp.name} Gallery`,
          sortOrder: targetProp.images.length + i,
        },
      });
      report.propertyImagesAdded += 1;
    }
  }

  return report;
}

// Direct execution CLI support
if (require.main === module) {
  associateDemoPhotos()
    .then((report) => {
      console.log('=== Photo Association Report ===');
      console.log(`Discovered: ${report.totalDiscovered} total image files`);
      console.log(`Property Images Added: ${report.propertyImagesAdded}`);
      console.log(`Room Images Added: ${report.roomImagesAdded}`);
      console.log(`Duplicates Skipped: ${report.duplicatesSkipped}`);
      console.log('================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Photo association failed:', err);
      process.exit(1);
    });
}
