# Primary Schools in England - Interactive Map

An interactive map visualization of all ~16,700 primary schools in England with search and filter capabilities.

## Features

- **Full-screen interactive map** with marker clustering for performance
- **Search** by school name or postcode with autocomplete
- **Filter** by school type (Academy, Community School, Foundation School, Voluntary Aided, Voluntary Controlled, Free School)
- **Filter** by Ofsted rating (Outstanding, Good, Requires Improvement, Inadequate, Not yet inspected)
- **Real-time updates** - filters apply instantly, no "apply" button needed
- **Click markers** to see school details (name, type, Ofsted rating, address)
- **Smooth animations** when zooming to search results

## How to Run

### Prerequisites

- Node.js 18+ and npm

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Data Sources

### School Data

Downloaded from the UK Government's **Get Information about Schools (GIAS)** service:
- URL: `http://ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata[YYYYMMDD].csv`
- This data is updated daily and contains all educational establishments in England
- Documentation: https://get-information-schools.service.gov.uk/

### Ofsted Ratings

Downloaded from **Explore Education Statistics**:
- Dataset: "Quality of school places - Ofsted Rating at school level"
- URL: https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c0c08e6d-c3ef-4408-8193-dcc493b7fa59

## Data Processing Steps

1. **Download** the full GIAS establishments CSV (~52,000 records)
2. **Convert encoding** from ISO-8859-1 to UTF-8
3. **Filter** to only include schools where:
   - `PhaseOfEducation` = "Primary"
   - `EstablishmentStatus` = "Open" or "Open, but proposed to close"
4. **Convert coordinates** from British National Grid (EPSG:27700) to WGS84 (EPSG:4326) using proj4
5. **Join** with Ofsted data using URN (Unique Reference Number)
6. **Normalize** school types into 6 main categories:
   - Academy (includes converter, sponsor led, special)
   - Community School
   - Foundation School
   - Voluntary Aided
   - Voluntary Controlled
   - Free School (includes studio schools, UTCs)
7. **Export** to JSON for the web app

### Reprocessing Data

To update the data with a fresh download:

```bash
# Download latest GIAS data (replace date)
curl -o data/edubase_raw.csv "http://ea-edubase-api-prod.azurewebsites.net/edubase/edubasealldata$(date +%Y%m%d).csv"

# Convert encoding
iconv -f ISO-8859-1 -t UTF-8 data/edubase_raw.csv > data/edubase_utf8.csv

# Download latest Ofsted data
curl -L -o data/ofsted_school_level.csv "https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c0c08e6d-c3ef-4408-8193-dcc493b7fa59/csv"

# Run processing script
npm run process-data
```

## Technical Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Leaflet** - Mapping library
- **react-leaflet** - React components for Leaflet
- **leaflet.markercluster** - Efficient clustering for large marker sets
- **proj4** - Coordinate transformation

## Data Statistics

After processing:
- **Total schools**: 16,707

### By Type
| Type | Count |
|------|-------|
| Academy | 7,883 |
| Community School | 4,798 |
| Voluntary Aided | 1,917 |
| Voluntary Controlled | 1,350 |
| Foundation School | 463 |
| Free School | 296 |

### By Ofsted Rating
| Rating | Count |
|--------|-------|
| Good | 11,149 |
| Outstanding | 2,342 |
| Not yet inspected | 2,154 |
| Requires Improvement | 1,003 |
| Inadequate | 59 |

## Caveats

1. **Ofsted data timing**: The Ofsted ratings dataset may not reflect the most recent inspections. Schools with recent inspections may show as "Not yet inspected" if the data hasn't been updated.

2. **"Not yet inspected"**: This category includes:
   - Genuinely new schools not yet inspected
   - Schools where the URN couldn't be matched between datasets
   - Schools with ratings not in our normalization map

3. **Coordinate accuracy**: Coordinates are derived from Easting/Northing in the GIAS data. A small number of schools may have slightly inaccurate positions.

4. **School type categorization**: Schools are mapped to 6 main categories for filtering. Some specialized types (e.g., "Other independent school") are excluded from the main filters.

## License

Data sourced from UK Government Open Data under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
