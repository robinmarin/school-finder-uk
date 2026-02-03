/**
 * Process HM Land Registry Price Paid Data to get median house prices by postcode district.
 *
 * Data source: HM Land Registry Price Paid Data
 * https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
 *
 * Download the complete CSV file and place it in data/price-paid-data.csv
 *
 * Usage:
 *   npm run process-house-prices
 *
 * Output:
 *   Updates src/data/district-metrics.json with medianPrice values
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT_PATH = path.join(import.meta.dirname, "../data/price-paid-data.csv");
const OUTPUT_PATH = path.join(
  import.meta.dirname,
  "../src/data/district-metrics.json"
);

interface DistrictMetrics {
  medianPrice: number | null;
  commuteMinutes: number | null;
}

function extractPostcodeDistrict(postcode: string): string | null {
  // Postcode format: "SW1A 1AA" -> "SW1A" or "B1 1AA" -> "B1"
  const trimmed = postcode.trim().toUpperCase();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    // No space, might be malformed
    return null;
  }

  return trimmed.substring(0, spaceIndex);
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

async function main() {
  // Check if input file exists
  if (!fs.existsSync(INPUT_PATH)) {
    console.log(`Input file not found: ${INPUT_PATH}`);
    console.log("");
    console.log("To download the HM Land Registry Price Paid data:");
    console.log(
      "1. Visit: https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads"
    );
    console.log('2. Download the "Single file" CSV (complete dataset)');
    console.log("3. Save as data/price-paid-data.csv");
    console.log("");
    console.log(
      "Alternatively, for a smaller dataset, download just the current year."
    );

    // Create empty metrics file if it doesn't exist
    if (!fs.existsSync(OUTPUT_PATH)) {
      const emptyMetrics: Record<string, DistrictMetrics> = {};
      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(emptyMetrics, null, 2));
      console.log(`Created empty metrics file at ${OUTPUT_PATH}`);
    }
    return;
  }

  console.log("Processing price paid data (streaming)...");

  // Group prices by postcode district
  const pricesByDistrict: Map<string, number[]> = new Map();

  // Only consider transactions from the last 2 years for more relevant pricing
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  let processed = 0;
  let skipped = 0;
  let lineCount = 0;

  // Stream the file line by line
  const fileStream = fs.createReadStream(INPUT_PATH, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 1000000 === 0) {
      console.log(`  Processed ${(lineCount / 1000000).toFixed(0)}M lines...`);
    }

    // Price Paid Data CSV has no headers, columns are:
    // Transaction unique identifier, Price, Date of Transfer, Postcode,
    // Property Type, Old/New, Duration, PAON, SAON, Street, Locality,
    // Town/City, District, County, PPD Category Type, Record Status
    const fields = parseCSVLine(line);

    if (fields.length < 4) {
      skipped++;
      continue;
    }

    const price = parseInt(fields[1], 10);
    const dateStr = fields[2]; // Format: YYYY-MM-DD HH:MM
    const postcode = fields[3];

    // Skip invalid records
    if (!postcode || isNaN(price) || price <= 0) {
      skipped++;
      continue;
    }

    // Parse date and filter by recency
    const date = new Date(dateStr);
    if (date < twoYearsAgo) {
      skipped++;
      continue;
    }

    const district = extractPostcodeDistrict(postcode);
    if (!district) {
      skipped++;
      continue;
    }

    if (!pricesByDistrict.has(district)) {
      pricesByDistrict.set(district, []);
    }
    pricesByDistrict.get(district)!.push(price);
    processed++;
  }

  console.log(
    `Processed ${processed.toLocaleString()} transactions (skipped ${skipped.toLocaleString()})`
  );
  console.log(`Found ${pricesByDistrict.size} postcode districts`);

  // Load existing metrics or create new
  let metrics: Record<string, DistrictMetrics> = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    metrics = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
  }

  // Calculate median prices
  for (const [district, prices] of pricesByDistrict) {
    if (!metrics[district]) {
      metrics[district] = { medianPrice: null, commuteMinutes: null };
    }
    metrics[district].medianPrice = calculateMedian(prices);
  }

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metrics, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);

  // Print some statistics
  const medianPrices = Object.values(metrics)
    .map((m) => m.medianPrice)
    .filter((p): p is number => p !== null);

  if (medianPrices.length > 0) {
    console.log("");
    console.log("Statistics:");
    console.log(`  Min median price: £${Math.min(...medianPrices).toLocaleString()}`);
    console.log(`  Max median price: £${Math.max(...medianPrices).toLocaleString()}`);
    console.log(
      `  Overall median: £${calculateMedian(medianPrices).toLocaleString()}`
    );
  }
}

main().catch(console.error);
