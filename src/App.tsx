import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import {
  School,
  SchoolType,
  OfstedRating,
  SCHOOL_TYPES,
  OFSTED_RATINGS,
} from "./types";
import schoolsData from "./data/schools.json";

// Fix Leaflet default marker icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

// Custom marker icon
const schoolIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Highlighted marker icon
const highlightedIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -48],
  shadowSize: [57, 57],
  className: "highlighted-marker",
});

interface Filters {
  types: Set<SchoolType>;
  ofsted: Set<OfstedRating>;
}

// Marker cluster component
function MarkerClusterGroup({
  schools,
  highlightedUrn,
  onMarkerClick,
}: {
  schools: School[];
  highlightedUrn: string | null;
  onMarkerClick: (school: School) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing cluster group
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    // Create new cluster group
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 16,
    });

    // Add markers
    const markers = schools.map((school) => {
      const isHighlighted = school.urn === highlightedUrn;
      const marker = L.marker([school.lat, school.lng], {
        icon: isHighlighted ? highlightedIcon : schoolIcon,
      });

      const ofstedClass = getOfstedClass(school.ofsted);
      marker.bindPopup(`
        <div class="school-popup">
          <h3>${escapeHtml(school.name)}</h3>
          <p><span class="label">Type:</span> ${escapeHtml(school.type)}</p>
          <p><span class="label">Ofsted:</span> <span class="ofsted-badge ${ofstedClass}">${escapeHtml(school.ofsted)}</span></p>
          <p><span class="label">Address:</span> ${escapeHtml(school.address)}</p>
          <p><span class="label">Postcode:</span> ${escapeHtml(school.postcode)}</p>
        </div>
      `);

      marker.on("click", () => onMarkerClick(school));

      return marker;
    });

    cluster.addLayers(markers);
    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [map, schools, highlightedUrn, onMarkerClick]);

  return null;
}

// Map controller for programmatic zoom
function MapController({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1 });
    }
  }, [map, center, zoom]);

  return null;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getOfstedClass(rating: OfstedRating): string {
  const classes: Record<OfstedRating, string> = {
    Outstanding: "ofsted-outstanding",
    Good: "ofsted-good",
    "Requires Improvement": "ofsted-requires-improvement",
    Inadequate: "ofsted-inadequate",
    "Not yet inspected": "ofsted-not-inspected",
  };
  return classes[rating] || "ofsted-not-inspected";
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [schools] = useState<School[]>(schoolsData as School[]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    types: new Set(SCHOOL_TYPES),
    ofsted: new Set(OFSTED_RATINGS),
  });
  const [highlightedUrn, setHighlightedUrn] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  useEffect(() => {
    // Simulate brief loading for data
    setLoading(false);
  }, []);

  // Filter schools based on criteria
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const typeMatch = filters.types.has(school.type as SchoolType);
      const ofstedMatch = filters.ofsted.has(school.ofsted as OfstedRating);
      return typeMatch && ofstedMatch;
    });
  }, [schools, filters]);

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return filteredSchools
      .filter(
        (school) =>
          school.name.toLowerCase().includes(query) ||
          school.postcode.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [filteredSchools, searchQuery]);

  const handleTypeFilter = useCallback((type: SchoolType, checked: boolean) => {
    setFilters((prev) => {
      const newTypes = new Set(prev.types);
      if (checked) {
        newTypes.add(type);
      } else {
        newTypes.delete(type);
      }
      return { ...prev, types: newTypes };
    });
  }, []);

  const handleOfstedFilter = useCallback(
    (rating: OfstedRating, checked: boolean) => {
      setFilters((prev) => {
        const newOfsted = new Set(prev.ofsted);
        if (checked) {
          newOfsted.add(rating);
        } else {
          newOfsted.delete(rating);
        }
        return { ...prev, ofsted: newOfsted };
      });
    },
    []
  );

  const handleSearchSelect = useCallback((school: School) => {
    setHighlightedUrn(school.urn);
    setMapCenter([school.lat, school.lng]);
    setMapZoom(16);
    setSearchQuery("");
  }, []);

  const handleMarkerClick = useCallback((school: School) => {
    setHighlightedUrn(school.urn);
  }, []);

  if (loading) {
    return <div className="loading-overlay">Loading schools data...</div>;
  }

  // England center
  const englandCenter: [number, number] = [52.5, -1.5];

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={englandCenter}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          schools={filteredSchools}
          highlightedUrn={highlightedUrn}
          onMarkerClick={handleMarkerClick}
        />
        <MapController center={mapCenter} zoom={mapZoom} />
      </MapContainer>

      <div className="control-panel">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search schools by name or postcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((school) => (
                <div
                  key={school.urn}
                  className="search-result-item"
                  onClick={() => handleSearchSelect(school)}
                >
                  <div className="search-result-name">{school.name}</div>
                  <div className="search-result-meta">
                    {school.postcode} • {school.type} • {school.ofsted}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filter-panel">
          <div className="filter-section">
            <div className="filter-section-title">School Type</div>
            <div className="filter-options">
              {SCHOOL_TYPES.map((type) => (
                <label key={type} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.types.has(type)}
                    onChange={(e) => handleTypeFilter(type, e.target.checked)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-title">Ofsted Rating</div>
            <div className="filter-options">
              {OFSTED_RATINGS.map((rating) => (
                <label key={rating} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.ofsted.has(rating)}
                    onChange={(e) =>
                      handleOfstedFilter(rating, e.target.checked)
                    }
                  />
                  {rating}
                </label>
              ))}
            </div>
          </div>

          <div className="school-count">
            Showing <strong>{filteredSchools.length.toLocaleString()}</strong>{" "}
            of <strong>{schools.length.toLocaleString()}</strong> schools
          </div>
        </div>
      </div>
    </div>
  );
}
