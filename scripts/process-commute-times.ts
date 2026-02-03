/**
 * Calculate estimated commute times to London for each postcode district.
 *
 * Uses a distance-based estimation from district centroid to central London,
 * with different speed factors for rail vs road travel.
 *
 * Usage:
 *   npm run process-commute-times
 *
 * Output:
 *   Updates src/data/district-metrics.json with commuteMinutes values
 */

import * as fs from "fs";
import * as path from "path";

const BOUNDARIES_PATH = path.join(
  import.meta.dirname,
  "../src/data/postcode-districts.json"
);
const OUTPUT_PATH = path.join(
  import.meta.dirname,
  "../src/data/district-metrics.json"
);

// Central London coordinates (approximate center)
const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

// Approximate commute speeds and fixed overhead
const RAIL_SPEED_KMH = 80; // Average rail speed including stops
const ROAD_SPEED_KMH = 40; // Average road speed in mixed traffic
const FIXED_OVERHEAD_MINS = 20; // Walking to station, waiting, etc.

// Distance threshold for rail vs road (km)
// Within 30km of London, assume mostly underground/overground (slower average)
const INNER_LONDON_RADIUS_KM = 30;
const INNER_LONDON_SPEED_KMH = 30;

interface DistrictMetrics {
  medianPrice: number | null;
  commuteMinutes: number | null;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    district: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

function calculateCentroid(
  geometry: GeoJSONFeature["geometry"]
): { lat: number; lng: number } | null {
  let coords: number[][];

  if (geometry.type === "Polygon") {
    // Use the outer ring (first ring)
    coords = geometry.coordinates[0] as number[][];
  } else if (geometry.type === "MultiPolygon") {
    // Use the first polygon's outer ring
    coords = (geometry.coordinates[0] as number[][][])[0];
  } else {
    return null;
  }

  if (!coords || coords.length === 0) {
    return null;
  }

  // Simple centroid calculation (average of all points)
  let sumLng = 0;
  let sumLat = 0;

  for (const coord of coords) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return {
    lng: sumLng / coords.length,
    lat: sumLat / coords.length,
  };
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function estimateCommuteTime(distanceKm: number): number {
  if (distanceKm < INNER_LONDON_RADIUS_KM) {
    // Inner London: slower transport but shorter distances
    const travelTime = (distanceKm / INNER_LONDON_SPEED_KMH) * 60;
    return Math.round(FIXED_OVERHEAD_MINS + travelTime);
  }

  // Outer areas: assume a mix of rail and road
  // For longer distances, rail becomes more attractive
  const railFraction = Math.min(0.8, distanceKm / 200);
  const avgSpeed =
    railFraction * RAIL_SPEED_KMH + (1 - railFraction) * ROAD_SPEED_KMH;
  const travelTime = (distanceKm / avgSpeed) * 60;

  return Math.round(FIXED_OVERHEAD_MINS + travelTime);
}

async function main() {
  // Check if boundaries file exists
  if (!fs.existsSync(BOUNDARIES_PATH)) {
    console.log(`Boundaries file not found: ${BOUNDARIES_PATH}`);
    console.log("Please run: npm run process-boundaries");
    return;
  }

  console.log("Reading postcode district boundaries...");
  const geojson: GeoJSONCollection = JSON.parse(
    fs.readFileSync(BOUNDARIES_PATH, "utf-8")
  );

  console.log(`Processing ${geojson.features.length} districts...`);

  // Load existing metrics or create new
  let metrics: Record<string, DistrictMetrics> = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    metrics = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
  }

  let processed = 0;
  let skipped = 0;

  for (const feature of geojson.features) {
    const district = feature.properties.district;

    if (!district) {
      skipped++;
      continue;
    }

    const centroid = calculateCentroid(feature.geometry);
    if (!centroid) {
      skipped++;
      continue;
    }

    const distanceKm = haversineDistance(
      centroid.lat,
      centroid.lng,
      LONDON_CENTER.lat,
      LONDON_CENTER.lng
    );

    const commuteMinutes = estimateCommuteTime(distanceKm);

    if (!metrics[district]) {
      metrics[district] = { medianPrice: null, commuteMinutes: null };
    }
    metrics[district].commuteMinutes = commuteMinutes;
    processed++;
  }

  console.log(`Processed ${processed} districts (skipped ${skipped})`);

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metrics, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);

  // Print some statistics
  const commuteTimes = Object.values(metrics)
    .map((m) => m.commuteMinutes)
    .filter((t): t is number => t !== null);

  console.log("");
  console.log("Statistics:");
  console.log(`  Min commute time: ${Math.min(...commuteTimes)} minutes`);
  console.log(`  Max commute time: ${Math.max(...commuteTimes)} minutes`);
  console.log(
    `  Average commute time: ${Math.round(
      commuteTimes.reduce((a, b) => a + b, 0) / commuteTimes.length
    )} minutes`
  );
}

main().catch(console.error);
