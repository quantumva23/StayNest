-- Step 1: Create RoomType Enum if not exists
DO $$ BEGIN
  CREATE TYPE "RoomType" AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'STUDIO', 'CABIN', 'FAMILY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create cities table if not exists
CREATE TABLE IF NOT EXISTS "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cities_slug_key" ON "cities"("slug");

-- Step 3: Populate cities from existing properties
INSERT INTO "cities" ("id", "name", "slug", "state", "country")
SELECT DISTINCT
  md5(lower(trim(city))),
  trim(city),
  lower(regexp_replace(trim(city), '[^a-zA-Z0-9]+', '-', 'g')),
  state,
  country
FROM "properties"
WHERE city IS NOT NULL AND city != ''
ON CONFLICT ("slug") DO NOTHING;

-- Fallback city for any unassigned properties
INSERT INTO "cities" ("id", "name", "slug", "country")
VALUES ('default-city', 'Demo Destination', 'demo-destination', 'India')
ON CONFLICT ("slug") DO NOTHING;

-- Step 4: Add columns to properties
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "city_id" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "min_price_per_night" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "max_capacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "has_active_rooms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "check_in_time" TEXT DEFAULT '14:00';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "check_out_time" TEXT DEFAULT '11:00';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cancellation_policy" TEXT DEFAULT 'FLEXIBLE';

-- Backfill city_id on properties
UPDATE "properties" p
SET "city_id" = c."id"
FROM "cities" c
WHERE p."city_id" IS NULL AND lower(trim(p."city")) = lower(trim(c."name"));

UPDATE "properties" SET "city_id" = 'default-city' WHERE "city_id" IS NULL;
ALTER TABLE "properties" ALTER COLUMN "city_id" SET NOT NULL;

-- Step 5: Add columns to rooms
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "room_type" "RoomType" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "bed_configuration" TEXT DEFAULT '1 Queen Bed';

UPDATE "rooms" SET "room_type" = 'SUITE' WHERE lower("name") LIKE '%suite%';
UPDATE "rooms" SET "room_type" = 'DELUXE' WHERE lower("name") LIKE '%deluxe%';
UPDATE "rooms" SET "room_type" = 'CABIN' WHERE lower("name") LIKE '%cabin%';
UPDATE "rooms" SET "room_type" = 'STUDIO' WHERE lower("name") LIKE '%studio%';
UPDATE "rooms" SET "room_type" = 'FAMILY' WHERE lower("name") LIKE '%family%' OR lower("name") LIKE '%cottage%';

-- Step 6: Recalculate property snapshot values
UPDATE "properties" p
SET 
  "min_price_per_night" = COALESCE((SELECT MIN("price_per_night") FROM "rooms" r WHERE r."property_id" = p."id" AND r."is_active" = true), 0),
  "max_capacity" = COALESCE((SELECT MAX("capacity") FROM "rooms" r WHERE r."property_id" = p."id" AND r."is_active" = true), 0),
  "has_active_rooms" = EXISTS (SELECT 1 FROM "rooms" r WHERE r."property_id" = p."id" AND r."is_active" = true);

-- Step 7: Add columns to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "confirmation_code" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "adults" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "children" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "taxes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

UPDATE "bookings" 
SET "confirmation_code" = 'SN-' || upper(substr(md5(random()::text || "id"), 1, 8))
WHERE "confirmation_code" IS NULL;

ALTER TABLE "bookings" ALTER COLUMN "confirmation_code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_confirmation_code_key" ON "bookings"("confirmation_code");

-- Step 8: Create room_images, room_amenities, reviews, and refresh_tokens tables
CREATE TABLE IF NOT EXISTS "room_images" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "room_amenities" (
    "room_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    CONSTRAINT "room_amenities_pkey" PRIMARY KEY ("room_id","amenity_id")
);

CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "property_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Step 9: Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_id_key" ON "reviews"("booking_id");
CREATE INDEX IF NOT EXISTS "reviews_property_id_idx" ON "reviews"("property_id");
CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "room_images_room_id_idx" ON "room_images"("room_id");
CREATE INDEX IF NOT EXISTS "properties_status_city_id_type_idx" ON "properties"("status", "city_id", "type");
CREATE INDEX IF NOT EXISTS "properties_status_min_price_per_night_idx" ON "properties"("status", "min_price_per_night");
CREATE INDEX IF NOT EXISTS "rooms_property_id_is_active_room_type_price_per_night_idx" ON "rooms"("property_id", "is_active", "room_type", "price_per_night");

-- Step 10: Foreign key constraints
DO $$ BEGIN
  ALTER TABLE "properties" ADD CONSTRAINT "properties_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
