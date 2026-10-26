import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { PropertyType, Role, RoomType } from '@prisma/client';
import { hashPassword } from '../modules/auth/password';

export interface ScannedAsset {
  originalPath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  localRelativePath: string;
  localDestPath: string;
  altText: string;
  tag: string;
}

export interface ImportReport {
  scanned: number;
  imported: number;
  duplicates: number;
  skipped: number;
  errors: number;
  details: {
    propertyImagesCreated: number;
    roomImagesCreated: number;
    propertiesUpdated: number;
  };
}

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

function generateDescriptiveAltText(filename: string): string {
  const name = path.parse(filename).name;

  if (name.includes('Sunset Aarti on the Sacred Ghat')) {
    return 'Evening Aarti ceremony with oil lamps on the sacred river ghat';
  }
  if (name.includes('swaroop-vilas')) {
    return 'Heritage haveli hotel facade with carved stone jharokha balconies';
  }
  if (name.includes('prince-desert-camp')) {
    return 'Desert luxury camp tents with outdoor seating';
  }
  if (name.includes('forest-hills-at-tala')) {
    return 'Lush forest retreat lodge with panoramic mountain view';
  }
  if (name.includes('cottonbro')) {
    return 'Hotel bedroom interior with crisp linens and warm bedside lamps';
  }
  if (name.includes('spacejoy')) {
    return 'Designer boutique bedroom with upholstered headboard and soft aesthetic';
  }
  if (name.includes('point3d')) {
    return 'Spacious executive guest room with desk and seating area';
  }
  if (name.includes('dad-hotel')) {
    return 'Boutique hotel courtyard and architecture';
  }
  if (name.includes('roberto-nickson')) {
    return 'Resort swimming pool terrace and lounge chairs';
  }
  if (name.includes('sasha-kaunas')) {
    return 'Minimalist bedroom suite with contemporary furnishings';
  }
  if (name.includes('valeriia-bugaiova')) {
    return 'Sunlit bedroom interior with hardwood floors and minimalist decor';
  }
  if (name.includes('visualsofdana')) {
    return 'Cozy guest suite with queen bed and decorative pillows';
  }
  if (name.includes('vojtech-bruzek')) {
    return 'Bright modern hotel room with city light accents';
  }

  // Clean raw unsplash / pexels token names
  const clean = name
    .replace(/^pexels-/, '')
    .replace(/-unsplash$/, '')
    .replace(/-[a-zA-Z0-9_-]{10,}$/, '')
    .replace(/[0-9-]+/g, ' ')
    .trim();

  return clean ? `Hotel stay interior and architecture: ${clean}` : 'Property and guest room view';
}

function classifyAssetTag(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes('ghat') || f.includes('aarti') || f.includes('varanasi')) return 'varanasi';
  if (f.includes('swaroop') || f.includes('haveli') || f.includes('udaipur')) return 'udaipur';
  if (f.includes('desert') || f.includes('camp') || f.includes('jaipur')) return 'jaipur';
  if (f.includes('forest') || f.includes('mountain') || f.includes('cabin') || f.includes('manali')) return 'manali';
  if (f.includes('beach') || f.includes('palm') || f.includes('goa')) return 'goa';
  if (f.includes('tea') || f.includes('munnar') || f.includes('kerala')) return 'munnar';
  if (f.includes('city') || f.includes('urban') || f.includes('bangalore')) return 'bangalore';
  if (f.includes('cottonbro') || f.includes('spacejoy') || f.includes('point3d') || f.includes('bedroom')) return 'room_interior';
  return 'general';
}

export function scanDirectories(sourceDirs: string[], destDir: string): ScannedAsset[] {
  const assets: ScannedAsset[] = [];
  const seenFilenames = new Set<string>();

  for (const srcDir of sourceDirs) {
    if (!fs.existsSync(srcDir)) continue;

    const walk = (current: string) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

        if (seenFilenames.has(entry.name)) continue;
        seenFilenames.add(entry.name);

        const stat = fs.statSync(fullPath);
        if (stat.size === 0) continue;

        const destPath = path.join(destDir, entry.name);
        const localRelativePath = `/uploads/properties/${encodeURIComponent(entry.name)}`;

        assets.push({
          originalPath: fullPath,
          filename: entry.name,
          extension: ext,
          sizeBytes: stat.size,
          mimeType: MIME_MAP[ext] || 'application/octet-stream',
          localRelativePath,
          localDestPath: destPath,
          altText: generateDescriptiveAltText(entry.name),
          tag: classifyAssetTag(entry.name),
        });
      }
    };

    walk(srcDir);
  }

  return assets;
}

export async function importImages(): Promise<ImportReport> {
  const report: ImportReport = {
    scanned: 0,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
    details: {
      propertyImagesCreated: 0,
      roomImagesCreated: 0,
      propertiesUpdated: 0,
    },
  };

  const imagesDir = path.resolve(__dirname, '../../images');
  const uploadsDir = path.resolve(__dirname, '../../../uploads');
  const targetPropertiesDir = path.resolve(uploadsDir, 'properties');

  if (!fs.existsSync(targetPropertiesDir)) {
    fs.mkdirSync(targetPropertiesDir, { recursive: true });
  }

  const assets = scanDirectories([imagesDir, uploadsDir], targetPropertiesDir);
  report.scanned = assets.length;

  console.log(`[import] Found ${assets.length} image assets across local folders.`);

  // Copy images to destination directory safely without deleting originals
  for (const asset of assets) {
    try {
      if (asset.originalPath !== asset.localDestPath && !fs.existsSync(asset.localDestPath)) {
        fs.copyFileSync(asset.originalPath, asset.localDestPath);
      }
    } catch (err) {
      console.error(`[import] Failed to copy asset ${asset.filename}:`, err);
      report.errors += 1;
    }
  }

  // Ensure default host and admin accounts exist
  let host = (await prisma.user.findFirst({ where: { role: 'HOST' } })) || (await prisma.user.findFirst());
  if (!host) {
    throw new Error('No user account found in database. Register an account first.');
  }

  // Ensure standard cities exist
  const cityUdaipur = await prisma.city.upsert({
    where: { slug: 'udaipur' },
    update: {},
    create: { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan', country: 'India' },
  });
  const cityManali = await prisma.city.upsert({
    where: { slug: 'manali' },
    update: {},
    create: { name: 'Manali', slug: 'manali', state: 'Himachal Pradesh', country: 'India' },
  });
  const cityGoa = await prisma.city.upsert({
    where: { slug: 'goa' },
    update: {},
    create: { name: 'Goa', slug: 'goa', state: 'Goa', country: 'India' },
  });
  const cityBangalore = await prisma.city.upsert({
    where: { slug: 'bangalore' },
    update: {},
    create: { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', country: 'India' },
  });
  const cityJaipur = await prisma.city.upsert({
    where: { slug: 'jaipur' },
    update: {},
    create: { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan', country: 'India' },
  });
  const cityVaranasi = await prisma.city.upsert({
    where: { slug: 'varanasi' },
    update: {},
    create: { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', country: 'India' },
  });
  const cityMunnar = await prisma.city.upsert({
    where: { slug: 'munnar' },
    update: {},
    create: { name: 'Munnar', slug: 'munnar', state: 'Kerala', country: 'India' },
  });
  const cityKochi = await prisma.city.upsert({
    where: { slug: 'kochi' },
    update: {},
    create: { name: 'Kochi', slug: 'kochi', state: 'Kerala', country: 'India' },
  });
  const cityNainital = await prisma.city.upsert({
    where: { slug: 'nainital' },
    update: {},
    create: { name: 'Nainital', slug: 'nainital', state: 'Uttarakhand', country: 'India' },
  });

  // Fetch or create demo properties to map all assets
  const existingProperties = await prisma.property.findMany({
    include: { images: true, rooms: { include: { images: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Map known tagged assets to existing properties
  const propertyByCity: Record<string, string> = {};
  for (const p of existingProperties) {
    if (p.city.toLowerCase().includes('udaipur')) propertyByCity['udaipur'] = p.id;
    if (p.city.toLowerCase().includes('manali')) propertyByCity['manali'] = p.id;
    if (p.city.toLowerCase().includes('goa')) propertyByCity['goa'] = p.id;
    if (p.city.toLowerCase().includes('bangalore')) propertyByCity['bangalore'] = p.id;
  }

  // Create additional named demo properties if needed
  if (!propertyByCity['jaipur']) {
    const p = await prisma.property.create({
      data: {
        hostId: host.id,
        name: 'Johari Palace Heritage Stay',
        description: 'Demo Heritage Stay in Jaipur featuring desert camp tents and royal courtyard suites.',
        type: 'HOTEL',
        address: 'Palace Road, Johari Bazaar',
        city: 'Jaipur',
        cityId: cityJaipur.id,
        state: 'Rajasthan',
        country: 'India',
        postalCode: '302001',
        minPricePerNight: 480000,
        maxCapacity: 4,
        hasActiveRooms: true,
        status: 'ACTIVE',
        rooms: {
          create: [
            {
              name: 'Royal Heritage Deluxe',
              roomType: 'DELUXE',
              capacity: 3,
              bedConfiguration: '1 King Bed',
              pricePerNight: 480000,
              totalUnits: 3,
            },
            {
              name: 'Maharaja Suite',
              roomType: 'SUITE',
              capacity: 4,
              bedConfiguration: '1 King Bed + 1 Daybed',
              pricePerNight: 850000,
              totalUnits: 2,
            },
          ],
        },
      },
    });
    propertyByCity['jaipur'] = p.id;
  }

  if (!propertyByCity['varanasi']) {
    const p = await prisma.property.create({
      data: {
        hostId: host.id,
        name: 'Sacred Waters Ghat Guest House',
        description: 'Demo Heritage Guest House located right above the sacred ghats with sunrise views.',
        type: 'GUEST_HOUSE',
        address: 'Dasaswamedh Ghat Steps',
        city: 'Varanasi',
        cityId: cityVaranasi.id,
        state: 'Uttar Pradesh',
        country: 'India',
        postalCode: '221001',
        minPricePerNight: 320000,
        maxCapacity: 4,
        hasActiveRooms: true,
        status: 'ACTIVE',
        rooms: {
          create: [
            {
              name: 'River View Deluxe Room',
              roomType: 'DELUXE',
              capacity: 2,
              bedConfiguration: '1 Queen Bed',
              pricePerNight: 320000,
              totalUnits: 4,
            },
            {
              name: 'Ghat Terrace Suite',
              roomType: 'SUITE',
              capacity: 3,
              bedConfiguration: '1 Queen Bed + 1 Single',
              pricePerNight: 550000,
              totalUnits: 2,
            },
          ],
        },
      },
    });
    propertyByCity['varanasi'] = p.id;
  }

  if (!propertyByCity['munnar']) {
    const p = await prisma.property.create({
      data: {
        hostId: host.id,
        name: 'Tea Mist Alpine Lounge',
        description: 'Demo Mountain Lounge situated among misty slopes and cardamom hills.',
        type: 'LOUNGE',
        address: 'Top Station Hill Road',
        city: 'Munnar',
        cityId: cityMunnar.id,
        state: 'Kerala',
        country: 'India',
        postalCode: '685612',
        minPricePerNight: 420000,
        maxCapacity: 4,
        hasActiveRooms: true,
        status: 'ACTIVE',
        rooms: {
          create: [
            {
              name: 'Pine Loft Studio',
              roomType: 'STUDIO',
              capacity: 2,
              bedConfiguration: '1 Queen Bed',
              pricePerNight: 420000,
              totalUnits: 3,
            },
            {
              name: 'Valley Pine Cabin',
              roomType: 'CABIN',
              capacity: 4,
              bedConfiguration: '2 Double Beds',
              pricePerNight: 650000,
              totalUnits: 2,
            },
          ],
        },
      },
    });
    propertyByCity['munnar'] = p.id;
  }

  // Reload properties with rooms
  const allProperties = await prisma.property.findMany({
    include: { images: true, rooms: { include: { images: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Assign assets to properties
  // Known city mappings
  const assignedAssets = new Set<string>();

  for (const asset of assets) {
    let targetPropertyId: string | null = null;

    if (asset.tag === 'varanasi') targetPropertyId = propertyByCity['varanasi'];
    else if (asset.tag === 'udaipur') targetPropertyId = propertyByCity['udaipur'];
    else if (asset.tag === 'jaipur') targetPropertyId = propertyByCity['jaipur'];
    else if (asset.tag === 'manali') targetPropertyId = propertyByCity['manali'];
    else if (asset.tag === 'goa') targetPropertyId = propertyByCity['goa'];
    else if (asset.tag === 'munnar') targetPropertyId = propertyByCity['munnar'];
    else if (asset.tag === 'bangalore') targetPropertyId = propertyByCity['bangalore'];

    if (targetPropertyId) {
      const prop = allProperties.find((p) => p.id === targetPropertyId);
      if (prop) {
        // Check duplicate
        const exists = await prisma.propertyImage.findFirst({
          where: { propertyId: prop.id, imageUrl: asset.localRelativePath },
        });

        if (exists) {
          report.duplicates += 1;
        } else {
          await prisma.propertyImage.create({
            data: {
              propertyId: prop.id,
              imageUrl: asset.localRelativePath,
              altText: asset.altText,
              sortOrder: prop.images.length + 1,
            },
          });
          report.imported += 1;
          report.details.propertyImagesCreated += 1;
        }
        assignedAssets.add(asset.filename);
      }
    }
  }

  // Attach remaining unassigned assets to existing real properties
  const remainingAssets = assets.filter((a) => !assignedAssets.has(a.filename));
  if (existingProperties.length > 0) {
    for (let i = 0; i < remainingAssets.length; i += 1) {
      const asset = remainingAssets[i];
      const targetProp = existingProperties[i % existingProperties.length];
      const exists = await prisma.propertyImage.findFirst({
        where: { propertyId: targetProp.id, imageUrl: asset.localRelativePath },
      });

      if (exists) {
        report.duplicates += 1;
      } else {
        await prisma.propertyImage.create({
          data: {
            propertyId: targetProp.id,
            imageUrl: asset.localRelativePath,
            altText: asset.altText,
            sortOrder: targetProp.images.length + i,
          },
        });
        report.imported += 1;
        report.details.propertyImagesCreated += 1;
      }
      assignedAssets.add(asset.filename);
    }
  }

  // Also replace external Unsplash images on the original 4 properties if they only had unsplash images
  for (const p of existingProperties) {
    const localImg = await prisma.propertyImage.findFirst({
      where: { propertyId: p.id, imageUrl: { startsWith: '/uploads/' } },
    });
    if (!localImg) {
      // Find a matching local image from the assets
      const sample = assets.find((a) => a.tag === p.city.toLowerCase()) || assets[0];
      if (sample) {
        await prisma.propertyImage.create({
          data: {
            propertyId: p.id,
            imageUrl: sample.localRelativePath,
            altText: sample.altText,
            sortOrder: 0,
          },
        });
        report.details.propertyImagesCreated += 1;
      }
    }
  }

  return report;
}

if (require.main === module) {
  importImages()
    .then((report) => {
      console.log('\n=============================================');
      console.log('   StayNest Image Import Report Summary');
      console.log('=============================================');
      console.log(`Discovered & Scanned files:   ${report.scanned}`);
      console.log(`Successfully Imported:        ${report.imported}`);
      console.log(`Duplicates Preserved/Skipped: ${report.duplicates}`);
      console.log(`Files with Errors:            ${report.errors}`);
      console.log(`PropertyImage records added:  ${report.details.propertyImagesCreated}`);
      console.log(`RoomImage records added:      ${report.details.roomImagesCreated}`);
      console.log('=============================================\n');
    })
    .catch((err) => {
      console.error('[import] Fatal error during image import:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
