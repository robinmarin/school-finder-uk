import { useEffect, useRef, memo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  HeatMapLayerType,
  DistrictMetricsMap,
  HOUSE_PRICE_SCALE,
  COMMUTE_TIME_SCALE,
} from "../types";
import { getColorForValue } from "../utils/colorScales";

interface HeatMapLayerProps {
  layerType: HeatMapLayerType;
  geojsonData: GeoJSON.FeatureCollection | null;
  metrics: DistrictMetricsMap;
}

function HeatMapLayerComponent({
  layerType,
  geojsonData,
  metrics,
}: HeatMapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const paneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create a custom pane for the choropleth layer (below markers)
    if (!map.getPane("choropleth")) {
      paneRef.current = map.createPane("choropleth");
      paneRef.current.style.zIndex = "350";
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    // Don't render if no layer selected or no data
    if (layerType === "none" || !geojsonData) {
      return;
    }

    const scale =
      layerType === "house-prices" ? HOUSE_PRICE_SCALE : COMMUTE_TIME_SCALE;

    // Style function for each feature
    const style = (feature: GeoJSON.Feature | undefined): L.PathOptions => {
      if (!feature || !feature.properties) {
        return {
          fillColor: scale.noDataColor,
          fillOpacity: 0.5,
          weight: 0.5,
          color: "#666",
          opacity: 0.3,
        };
      }

      const district = feature.properties.district as string;
      const districtMetrics = metrics[district];

      let value: number | null = null;
      if (districtMetrics) {
        value =
          layerType === "house-prices"
            ? districtMetrics.medianPrice
            : districtMetrics.commuteMinutes;
      }

      const fillColor = getColorForValue(value, scale);

      return {
        fillColor,
        fillOpacity: 0.6,
        weight: 0.5,
        color: "#666",
        opacity: 0.3,
      };
    };

    // Create GeoJSON layer
    const layer = L.geoJSON(geojsonData, {
      style,
      pane: "choropleth",
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const district = feature.properties.district as string;
          const districtMetrics = metrics[district];

          let tooltipContent = `<strong>${district}</strong>`;

          if (districtMetrics) {
            if (
              layerType === "house-prices" &&
              districtMetrics.medianPrice !== null
            ) {
              tooltipContent += `<br>Median: £${districtMetrics.medianPrice.toLocaleString()}`;
            } else if (
              layerType === "commute-time" &&
              districtMetrics.commuteMinutes !== null
            ) {
              const hours = Math.floor(districtMetrics.commuteMinutes / 60);
              const mins = districtMetrics.commuteMinutes % 60;
              const timeStr =
                hours > 0
                  ? `${hours}h ${mins}m`
                  : `${districtMetrics.commuteMinutes}m`;
              tooltipContent += `<br>Commute: ${timeStr}`;
            }
          } else {
            tooltipContent += "<br>No data";
          }

          layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: "district-tooltip",
          });
        }
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, layerType, geojsonData, metrics]);

  return null;
}

// Memoize to prevent unnecessary re-renders
export const HeatMapLayer = memo(HeatMapLayerComponent);
