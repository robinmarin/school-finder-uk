/**
 * Download and simplify postcode district boundaries.
 *
 * Data source: UK Postcode Polygons (GitHub)
 * https://github.com/missinglink/uk-postcode-polygons
 * License: CC BY-SA 3.0 (Wikipedia contributors)
 *
 * Usage:
 *   npm run process-boundaries
 *
 * Output:
 *   src/data/postcode-districts.json
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_PATH = path.join(
  import.meta.dirname,
  "../src/data/postcode-districts.json"
);

const GITHUB_API_URL =
  "https://api.github.com/repos/missinglink/uk-postcode-polygons/contents/geojson";
const RAW_BASE_URL =
  "https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson";

interface GitHubFile {
  name: string;
  download_url: string;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

async function fetchFileList(): Promise<string[]> {
  console.log("Fetching list of postcode area files...");

  const response = await fetch(GITHUB_API_URL, {
    headers: {
      "User-Agent": "school-finder-uk",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const files = (await response.json()) as GitHubFile[];
  return files
    .filter((f) => f.name.endsWith(".geojson"))
    .map((f) => f.name.replace(".geojson", ""));
}

async function fetchAreaGeoJSON(area: string): Promise<GeoJSONCollection> {
  const url = `${RAW_BASE_URL}/${area}.geojson`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${area}: ${response.status}`);
  }

  return (await response.json()) as GeoJSONCollection;
}

function simplifyRing(ring: number[][], tolerance: number): number[][] {
  if (ring.length < 4) return ring;

  // Douglas-Peucker simplification
  function rdp(
    points: number[][],
    start: number,
    end: number,
    result: Set<number>
  ): void {
    if (end <= start + 1) return;

    let maxDist = 0;
    let maxIndex = start;

    const startPt = points[start];
    const endPt = points[end];

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], startPt, endPt);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      result.add(maxIndex);
      rdp(points, start, maxIndex, result);
      rdp(points, maxIndex, end, result);
    }
  }

  const keep = new Set<number>([0, ring.length - 1]);
  rdp(ring, 0, ring.length - 1, keep);

  const indices = Array.from(keep).sort((a, b) => a - b);
  return indices.map((i) => ring[i]);
}

function perpendicularDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point[0] - lineStart[0], 2) +
        Math.pow(point[1] - lineStart[1], 2)
    );
  }

  const t =
    ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
    (dx * dx + dy * dy);
  const nearestX = lineStart[0] + t * dx;
  const nearestY = lineStart[1] + t * dy;

  return Math.sqrt(
    Math.pow(point[0] - nearestX, 2) + Math.pow(point[1] - nearestY, 2)
  );
}

function simplifyFeature(
  feature: GeoJSONFeature,
  tolerance: number
): GeoJSONFeature {
  const geom = feature.geometry;

  if (geom.type === "Polygon") {
    const coords = geom.coordinates as number[][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: coords.map((ring) => simplifyRing(ring, tolerance)),
      },
    };
  } else if (geom.type === "MultiPolygon") {
    const coords = geom.coordinates as number[][][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: coords.map((polygon) =>
          polygon.map((ring) => simplifyRing(ring, tolerance))
        ),
      },
    };
  }

  return feature;
}

function roundCoordinates(
  feature: GeoJSONFeature,
  precision: number
): GeoJSONFeature {
  const factor = Math.pow(10, precision);

  function roundCoord(coord: number[]): number[] {
    return [
      Math.round(coord[0] * factor) / factor,
      Math.round(coord[1] * factor) / factor,
    ];
  }

  function roundRing(ring: number[][]): number[][] {
    return ring.map(roundCoord);
  }

  const geom = feature.geometry;

  if (geom.type === "Polygon") {
    const coords = geom.coordinates as number[][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: coords.map(roundRing),
      },
    };
  } else if (geom.type === "MultiPolygon") {
    const coords = geom.coordinates as number[][][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: coords.map((polygon) => polygon.map(roundRing)),
      },
    };
  }

  return feature;
}

function extractDistrictName(feature: GeoJSONFeature): string {
  // The features have properties like { name: "SW1" } or similar
  const props = feature.properties;
  return (props.name as string) || (props.district as string) || "Unknown";
}

async function main() {
  try {
    // Get list of postcode areas
    const areas = await fetchFileList();
    console.log(`Found ${areas.length} postcode areas`);

    // Fetch all areas and merge features
    const allFeatures: GeoJSONFeature[] = [];
    let fetchedCount = 0;

    for (const area of areas) {
      try {
        const geojson = await fetchAreaGeoJSON(area);

        for (const feature of geojson.features) {
          // Normalize the district property
          const district = extractDistrictName(feature);
          allFeatures.push({
            ...feature,
            properties: { district },
          });
        }

        fetchedCount++;
        if (fetchedCount % 20 === 0) {
          console.log(
            `  Fetched ${fetchedCount}/${areas.length} areas (${allFeatures.length} districts)...`
          );
        }
      } catch (err) {
        console.warn(`  Warning: Failed to fetch ${area}:`, err);
      }
    }

    console.log(`Total districts: ${allFeatures.length}`);

    // Simplify geometry (tolerance in degrees, ~0.0005 = ~50m)
    console.log("Simplifying geometry...");
    const simplified = allFeatures.map((f) => simplifyFeature(f, 0.0005));

    // Round coordinates to 4 decimal places (~11m precision)
    const rounded = simplified.map((f) => roundCoordinates(f, 4));

    const geojson: GeoJSONCollection = {
      type: "FeatureCollection",
      features: rounded,
    };

    // Calculate sizes
    const simplifiedSize = JSON.stringify(geojson).length;
    console.log(`Output size: ${(simplifiedSize / 1024 / 1024).toFixed(2)} MB`);

    // Write output
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));
    console.log(`Written to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Error processing boundaries:", error);
    process.exit(1);
  }
}

main();
