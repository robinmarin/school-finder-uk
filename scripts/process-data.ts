import { parse } from "csv-parse/sync";
import * as fs from "fs";
import proj4 from "proj4";

// Define coordinate systems
// British National Grid (EPSG:27700)
const BNG =
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs";
// WGS84 (EPSG:4326)
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

interface RawSchool {
  URN: string;
  "EstablishmentName": string;
  "TypeOfEstablishment (name)": string;
  "EstablishmentStatus (name)": string;
  "PhaseOfEducation (name)": string;
  Easting: string;
  Northing: string;
  Street: string;
  Locality: string;
  Address3: string;
  Town: string;
  "County (name)": string;
  Postcode: string;
}

interface OfstedRecord {
  school_urn: string;
  ofsted_overall_effectiveness: string;
}

interface ProcessedSchool {
  urn: string;
  name: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  address: string;
  postcode: string;
  ofsted: string;
}

function normalizeSchoolType(type: string): string {
  // Map various school types to our filter categories
  const typeMap: Record<string, string> = {
    "Academy converter": "Academy",
    "Academy sponsor led": "Academy",
    "Academy special converter": "Academy",
    "Academy special sponsor led": "Academy",
    "Academy alternative provision converter": "Academy",
    "Academy alternative provision sponsor led": "Academy",
    "Community school": "Community School",
    "Foundation school": "Foundation School",
    "Voluntary aided school": "Voluntary Aided",
    "Voluntary controlled school": "Voluntary Controlled",
    "Free schools": "Free School",
    "Free schools alternative provision": "Free School",
    "Free schools special": "Free School",
    "Studio schools": "Free School",
    "University technical college": "Free School",
  };
  return typeMap[type] || "Other";
}

function normalizeOfstedRating(rating: string): string {
  const ratingMap: Record<string, string> = {
    Outstanding: "Outstanding",
    Good: "Good",
    "Requires improvement": "Requires Improvement",
    "Requires Improvement": "Requires Improvement",
    Inadequate: "Inadequate",
    "Serious Weaknesses": "Inadequate",
    "Special Measures": "Inadequate",
  };
  return ratingMap[rating] || "Not yet inspected";
}

function buildAddress(school: RawSchool): string {
  const parts = [
    school.Street,
    school.Locality,
    school.Address3,
    school.Town,
    school["County (name)"],
  ].filter((p) => p && p.trim() !== "");
  return parts.join(", ");
}

async function processData() {
  console.log("Reading GIAS data...");
  const giasData = fs.readFileSync("data/edubase_utf8.csv", "utf-8");
  const giasRecords: RawSchool[] = parse(giasData, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  console.log(`Total records: ${giasRecords.length}`);

  // Filter for primary schools that are open
  const primarySchools = giasRecords.filter((school) => {
    const phase = school["PhaseOfEducation (name)"];
    const status = school["EstablishmentStatus (name)"];
    return (
      phase === "Primary" && (status === "Open" || status === "Open, but proposed to close")
    );
  });

  console.log(`Primary schools: ${primarySchools.length}`);

  // Read Ofsted data
  console.log("Reading Ofsted data...");
  const ofstedData = fs.readFileSync("data/ofsted_school_level.csv", "utf-8");
  const ofstedRecords: OfstedRecord[] = parse(ofstedData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  // Create Ofsted lookup map
  const ofstedMap = new Map<string, string>();
  for (const record of ofstedRecords) {
    ofstedMap.set(record.school_urn, record.ofsted_overall_effectiveness);
  }
  console.log(`Ofsted records loaded: ${ofstedMap.size}`);

  // Process and convert coordinates
  console.log("Processing schools and converting coordinates...");
  const processedSchools: ProcessedSchool[] = [];
  let skippedNoCoords = 0;
  let skippedInvalidCoords = 0;

  for (const school of primarySchools) {
    const easting = parseFloat(school.Easting);
    const northing = parseFloat(school.Northing);

    if (isNaN(easting) || isNaN(northing)) {
      skippedNoCoords++;
      continue;
    }

    if (easting < 0 || easting > 700000 || northing < 0 || northing > 1300000) {
      skippedInvalidCoords++;
      continue;
    }

    try {
      // Convert from British National Grid to WGS84
      const [lng, lat] = proj4(BNG, WGS84, [easting, northing]);

      // Validate coordinates are within England bounds
      if (lat < 49.8 || lat > 55.9 || lng < -6.5 || lng > 2) {
        skippedInvalidCoords++;
        continue;
      }

      const ofstedRating = ofstedMap.get(school.URN) || "";

      processedSchools.push({
        urn: school.URN,
        name: school.EstablishmentName,
        type: normalizeSchoolType(school["TypeOfEstablishment (name)"]),
        status: school["EstablishmentStatus (name)"],
        lat: Math.round(lat * 1000000) / 1000000, // 6 decimal places
        lng: Math.round(lng * 1000000) / 1000000,
        address: buildAddress(school),
        postcode: school.Postcode,
        ofsted: normalizeOfstedRating(ofstedRating),
      });
    } catch (e) {
      skippedInvalidCoords++;
    }
  }

  console.log(`Processed schools: ${processedSchools.length}`);
  console.log(`Skipped (no coordinates): ${skippedNoCoords}`);
  console.log(`Skipped (invalid coordinates): ${skippedInvalidCoords}`);

  // Generate statistics
  const typeStats = new Map<string, number>();
  const ofstedStats = new Map<string, number>();
  for (const school of processedSchools) {
    typeStats.set(school.type, (typeStats.get(school.type) || 0) + 1);
    ofstedStats.set(school.ofsted, (ofstedStats.get(school.ofsted) || 0) + 1);
  }

  console.log("\nSchool types:");
  for (const [type, count] of typeStats.entries()) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nOfsted ratings:");
  for (const [rating, count] of ofstedStats.entries()) {
    console.log(`  ${rating}: ${count}`);
  }

  // Write output
  const outputPath = "src/data/schools.json";
  fs.mkdirSync("src/data", { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(processedSchools));
  console.log(`\nOutput written to ${outputPath}`);

  // Also create a smaller version for development
  const samplePath = "src/data/schools-sample.json";
  const sample = processedSchools.slice(0, 1000);
  fs.writeFileSync(samplePath, JSON.stringify(sample, null, 2));
  console.log(`Sample (1000 schools) written to ${samplePath}`);
}

processData().catch(console.error);
