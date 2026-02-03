import { useEffect, useRef, useCallback, memo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  HeatMapLayerType,
  DistrictMetricsMap,
  ColorScaleConfig,
  HOUSE_PRICE_SCALE,
  COMMUTE_TIME_SCALE,
} from "../types";
import { getColorForValue, calculateDynamicScale } from "../utils/colorScales";

interface HeatMapLayerProps {
  layerType: HeatMapLayerType;
  geojsonData: GeoJSON.FeatureCollection | null;
  metrics: DistrictMetricsMap;
  onScaleChange?: (scale: ColorScaleConfig | null) => void;
}

function HeatMapLayerComponent({
  layerType,
  geojsonData,
  metrics,
  onScaleChange,
}: HeatMapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const paneRef = useRef<HTMLElement | null>(null);
  const currentScaleRef = useRef<ColorScaleConfig | null>(null);

  // Get the base scale for the current layer type
  const getBaseScale = useCallback(() => {
    return layerType === "house-prices" ? HOUSE_PRICE_SCALE : COMMUTE_TIME_SCALE;
  }, [layerType]);

  // Calculate visible districts and update scale
  const updateDynamicScale = useCallback(() => {
    if (!map || !geojsonData || layerType === "none") {
      if (currentScaleRef.current !== null) {
        currentScaleRef.current = null;
        onScaleChange?.(null);
      }
      return null;
    }

    const bounds = map.getBounds();
    const visibleDistricts: string[] = [];

    // Find districts that intersect with viewport
    geojsonData.features.forEach((feature) => {
      if (!feature.properties?.district) return;

      // Get feature bounds
      const featureBounds = L.geoJSON(feature).getBounds();

      // Check if feature intersects with viewport
      if (bounds.intersects(featureBounds)) {
        visibleDistricts.push(feature.properties.district);
      }
    });

    const baseScale = getBaseScale();
    const dynamicScale = calculateDynamicScale(
      visibleDistricts,
      metrics,
      layerType,
      baseScale
    );

    // Only update if scale actually changed
    if (
      !currentScaleRef.current ||
      currentScaleRef.current.min !== dynamicScale.min ||
      currentScaleRef.current.max !== dynamicScale.max
    ) {
      currentScaleRef.current = dynamicScale;
      onScaleChange?.(dynamicScale);

      // Re-style the layer with the new scale
      if (layerRef.current) {
        layerRef.current.setStyle((feature) => {
          if (!feature || !feature.properties) {
            return {
              fillColor: dynamicScale.noDataColor,
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

          const fillColor = getColorForValue(value, dynamicScale);

          return {
            fillColor,
            fillOpacity: 0.6,
            weight: 0.5,
            color: "#666",
            opacity: 0.3,
          };
        });
      }
    }

    return dynamicScale;
  }, [map, geojsonData, metrics, layerType, getBaseScale, onScaleChange]);

  // Set up pane
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

  // Listen for map move events to update scale
  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      updateDynamicScale();
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map, updateDynamicScale]);

  // Create/update the GeoJSON layer
  useEffect(() => {
    if (!map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    // Clear scale when no layer selected
    if (layerType === "none" || !geojsonData) {
      currentScaleRef.current = null;
      onScaleChange?.(null);
      return;
    }

    // Calculate initial scale based on visible area
    const bounds = map.getBounds();
    const visibleDistricts: string[] = [];

    geojsonData.features.forEach((feature) => {
      if (!feature.properties?.district) return;
      const featureBounds = L.geoJSON(feature).getBounds();
      if (bounds.intersects(featureBounds)) {
        visibleDistricts.push(feature.properties.district);
      }
    });

    const baseScale = getBaseScale();
    const scale = calculateDynamicScale(
      visibleDistricts,
      metrics,
      layerType,
      baseScale
    );

    currentScaleRef.current = scale;
    onScaleChange?.(scale);

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
  }, [map, layerType, geojsonData, metrics, getBaseScale, onScaleChange]);

  return null;
}

// Memoize to prevent unnecessary re-renders
export const HeatMapLayer = memo(HeatMapLayerComponent);
