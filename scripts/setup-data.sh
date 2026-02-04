#!/bin/bash
#
# Download and process all data for the school finder app.
#
# Usage:
#   ./scripts/setup-data.sh           # Download everything
#   ./scripts/setup-data.sh --skip-house-prices   # Skip the 4.5GB house price file
#

set -e

cd "$(dirname "$0")/.."

SKIP_HOUSE_PRICES=false
for arg in "$@"; do
  case $arg in
    --skip-house-prices)
      SKIP_HOUSE_PRICES=true
      ;;
  esac
done

echo "=== School Finder UK - Data Setup ==="
echo ""

# Create data directory
mkdir -p data

# 1. Download GIAS (schools) data
echo "[1/4] Downloading GIAS school data..."

# Helper to get date N days ago (works on both macOS and Linux)
get_date_days_ago() {
  local days=$1
  date -v-${days}d +%Y%m%d 2>/dev/null || date -d "$days days ago" +%Y%m%d
}

# Try downloading from today going back up to 7 days
GIAS_DOWNLOADED=false
for days_ago in 0 1 2 3 4 5 6 7; do
  DATE=$(get_date_days_ago $days_ago)
  URL="http://ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata${DATE}.csv"
  echo "  Trying date $DATE..."

  if curl -s -f -o data/edubase_raw.csv "$URL"; then
    # Check file has actual content (should be at least 1MB for valid data)
    FILE_SIZE=$(wc -c < data/edubase_raw.csv | tr -d ' ')
    if [ "$FILE_SIZE" -gt 1000000 ]; then
      echo "  Success! Downloaded $(( FILE_SIZE / 1024 / 1024 ))MB"
      GIAS_DOWNLOADED=true
      break
    else
      echo "  File too small (${FILE_SIZE} bytes), trying earlier date..."
    fi
  fi
done

if [ "$GIAS_DOWNLOADED" = false ]; then
  echo "  ERROR: Could not download GIAS data from the last 7 days."
  echo "  Please check https://get-information-schools.service.gov.uk/ for data availability."
  exit 1
fi

echo "  Converting encoding..."
iconv -f ISO-8859-1 -t UTF-8 data/edubase_raw.csv > data/edubase_utf8.csv

# 2. Download Ofsted data
echo "[2/4] Downloading Ofsted ratings..."
curl -L -f -o data/ofsted_school_level.csv \
  "https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c0c08e6d-c3ef-4408-8193-dcc493b7fa59/csv"

# 3. Download house price data (optional, very large)
if [ "$SKIP_HOUSE_PRICES" = true ]; then
  echo "[3/4] Skipping house price data (--skip-house-prices)"
else
  echo "[3/4] Downloading house price data (~4.5GB, this will take a while)..."
  curl -L -f -o data/price-paid-data.csv \
    "http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-complete.csv"
fi

# 4. Process all data
echo "[4/4] Processing data..."
echo "  Processing school data..."
npm run process-data

echo "  Processing postcode boundaries..."
npm run process-boundaries

echo "  Processing commute times..."
npm run process-commute-times

if [ "$SKIP_HOUSE_PRICES" = false ] && [ -f data/price-paid-data.csv ]; then
  echo "  Processing house prices..."
  npm run process-house-prices
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Run 'npm run dev' to start the development server."
