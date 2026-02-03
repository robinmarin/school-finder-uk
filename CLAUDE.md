# Claude Code Project Guide

## Project Overview

This is an interactive map visualization of primary schools in England built with React, TypeScript, and Leaflet. It displays ~16,700 schools with search and filter capabilities.

## Architecture

```
src/
├── App.tsx          # Main component with map, search, and filters
├── types.ts         # TypeScript interfaces and constants
├── index.css        # All styles (no CSS modules)
├── main.tsx         # React entry point
├── vite-env.d.ts    # Vite type declarations
└── data/
    └── schools.json # Processed school data (3.6MB)

scripts/
└── process-data.ts  # Data processing pipeline

data/                # Raw data files (not in git)
├── edubase_raw.csv
├── edubase_utf8.csv
└── ofsted_school_level.csv
```

## Key Technical Decisions

1. **Marker Clustering**: Uses `leaflet.markercluster` for performance with 16K+ markers. Clusters are recreated when filters change.

2. **Coordinate System**: School data comes in British National Grid (EPSG:27700). We convert to WGS84 (EPSG:4326) using proj4.

3. **Data Bundling**: School JSON is imported directly and bundled with the app. This creates a large bundle (~800KB gzipped) but simplifies deployment.

4. **Filter State**: Uses `Set<T>` for O(1) filter lookups. Filters are AND-combined.

## Common Tasks

### Update School Data

```bash
# Download fresh GIAS data
curl -o data/edubase_raw.csv "http://ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata$(date +%Y%m%d).csv"

# Convert encoding
iconv -f ISO-8859-1 -t UTF-8 data/edubase_raw.csv > data/edubase_utf8.csv

# Download Ofsted data
curl -L -o data/ofsted_school_level.csv "https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c0c08e6d-c3ef-4408-8193-dcc493b7fa59/csv"

# Process
npm run process-data
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## Data Sources

- **GIAS (Get Information about Schools)**: `ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata[YYYYMMDD].csv`
- **Ofsted Ratings**: `explore-education-statistics.service.gov.uk` dataset c0c08e6d-c3ef-4408-8193-dcc493b7fa59

## School Type Mapping

The raw data has many establishment types. We normalize to 6 categories:

| Category | Includes |
|----------|----------|
| Academy | Academy converter, sponsor led, special |
| Community School | Community school |
| Foundation School | Foundation school |
| Voluntary Aided | Voluntary aided school |
| Voluntary Controlled | Voluntary controlled school |
| Free School | Free schools, studio schools, UTCs |

## Important Files

- `src/App.tsx:64-129` - MarkerClusterGroup component that manages Leaflet clusters
- `src/App.tsx:156-165` - Ofsted rating to CSS class mapping
- `scripts/process-data.ts:40-60` - School type normalization logic
- `src/types.ts` - All TypeScript types and constants

## Performance Considerations

- Markers are clustered to avoid rendering 16K+ DOM elements
- Filtering recreates the cluster group (unavoidable with leaflet.markercluster)
- Search is debounced by requiring 2+ characters
- JSON data is minified in production build

## Potential Improvements

- Lazy load school data or use a spatial index
- Add URL-based state for shareable searches
- Add school catchment area polygons
- Server-side filtering for very large datasets
