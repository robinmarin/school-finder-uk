# Primary Schools in England - Interactive Map

An interactive map visualization of all ~16,700 primary schools in England with search, filter, and heatmap overlay capabilities.

## Features

- **Full-screen interactive map** with marker clustering for performance
- **Search** by school name or postcode with autocomplete
- **Filter** by school type (Academy, Community School, Foundation School, Voluntary Aided, Voluntary Controlled, Free School)
- **Filter** by Ofsted rating (Outstanding, Good, Requires Improvement, Inadequate, Not yet inspected)
- **Heatmap overlays**:
  - House prices by postcode district (median prices from Land Registry)
  - Commute time to London (estimated travel time)
  - Dynamic rescaling - color scale adjusts based on visible area when zooming
- **Click markers** to see school details (name, type, Ofsted rating, address)
- **Smooth animations** when zooming to search results

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
# Install dependencies
npm install

# Download and process all data
npm run setup

# Or skip the large (~4.5GB) house price download
npm run setup -- --skip-house-prices
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Data Sources

| Data | Source | Size |
|------|--------|------|
| Schools | [GIAS (Get Information about Schools)](https://get-information-schools.service.gov.uk/) | ~52K records |
| Ofsted ratings | [Explore Education Statistics](https://explore-education-statistics.service.gov.uk/) | ~30K records |
| House prices | [HM Land Registry Price Paid](https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads) | ~4.5GB |
| Postcode boundaries | [UK Postcode Polygons](https://github.com/missinglink/uk-postcode-polygons) | ~2.7K districts |

All data is sourced from UK Government Open Data under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

## Technical Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Leaflet** - Mapping library
- **react-leaflet** - React components for Leaflet
- **leaflet.markercluster** - Efficient clustering for large marker sets
- **proj4** - Coordinate transformation

## Data Processing

The setup script (`npm run setup`) handles:

1. **School data**: Downloads GIAS CSV, converts from ISO-8859-1 to UTF-8, filters to open primary schools, converts coordinates from British National Grid to WGS84, joins with Ofsted ratings
2. **Postcode boundaries**: Fetches GeoJSON from GitHub, simplifies polygons for performance
3. **Commute times**: Calculates estimated travel time to central London based on distance
4. **House prices**: Streams the large Land Registry CSV, calculates median price per postcode district from last 2 years of transactions

## Caveats

1. **Ofsted data timing**: Ratings may not reflect the most recent inspections.

2. **"Not yet inspected"**: Includes new schools, URN mismatches, and unmapped rating types.

3. **House prices**: Based on Land Registry transactions from the last 2 years. Some districts may have no data.

4. **Commute times**: Estimated based on distance to London, not actual transit routes. Useful for relative comparison only.
