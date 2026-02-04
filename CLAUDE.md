# Claude Code Project Guide

## Project Overview

Interactive map of schools in England (~21,500 primary, secondary, state, and independent schools) with search, filters, and heatmap overlays for house prices and commute times.

## Architecture

```
src/
├── App.tsx                    # Main component with map, search, filters
├── types.ts                   # TypeScript interfaces and constants
├── index.css                  # All styles
├── main.tsx                   # React entry point
├── components/
│   ├── HeatMapLayer.tsx       # Choropleth layer with dynamic rescaling
│   └── LayerControls.tsx      # Layer toggle and legend
├── utils/
│   └── colorScales.ts         # Color interpolation and dynamic scale calculation
└── data/
    ├── schools.json           # Processed school data
    ├── postcode-districts.json # GeoJSON boundaries
    └── district-metrics.json  # House prices and commute times

scripts/
├── setup-data.sh              # Downloads and processes all data
├── process-data.ts            # School data processing
├── process-boundaries.ts      # Postcode boundary processing
├── process-house-prices.ts    # Land Registry data (streaming)
└── process-commute-times.ts   # Commute time calculation

data/                          # Raw data files (not in git)
├── edubase_raw.csv
├── edubase_utf8.csv
├── ofsted_school_level.csv
└── price-paid-data.csv        # ~4.5GB
```

## Common Tasks

### Setup / Update Data

```bash
npm run setup                         # Download and process everything
npm run setup -- --skip-house-prices  # Skip the 4.5GB house price file
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Key Technical Decisions

1. **Marker Clustering**: `leaflet.markercluster` for 16K+ markers. Clusters recreated on filter change.

2. **Coordinate System**: British National Grid (EPSG:27700) → WGS84 (EPSG:4326) via proj4.

3. **Dynamic Heatmap Scaling**: Color scale recalculates on zoom/pan based on visible districts (5th-95th percentile).

4. **Streaming CSV**: House price processing streams line-by-line to handle 4.5GB file.

## Data Sources

| Data | Source |
|------|--------|
| Schools | GIAS: `ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata[YYYYMMDD].csv` |
| Ofsted | explore-education-statistics.service.gov.uk dataset c0c08e6d-c3ef-4408-8193-dcc493b7fa59 |
| House prices | Land Registry: `prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-complete.csv` |
| Boundaries | github.com/missinglink/uk-postcode-polygons |

## Important Files

- `src/App.tsx:66-131` - MarkerClusterGroup component
- `src/components/HeatMapLayer.tsx:36-117` - Dynamic scale calculation and map event handling
- `src/utils/colorScales.ts:7-63` - `calculateDynamicScale()` percentile-based rescaling
- `scripts/process-house-prices.ts` - Streaming CSV parser for large files

## Git

Don't mention Claude in commit messages.
