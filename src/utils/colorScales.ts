import { ColorScaleConfig, DistrictMetricsMap, HeatMapLayerType } from "../types";

/**
 * Calculate a dynamic color scale based on visible district values.
 * Uses percentiles to avoid outliers skewing the scale.
 */
export function calculateDynamicScale(
  visibleDistricts: string[],
  metrics: DistrictMetricsMap,
  layerType: HeatMapLayerType,
  baseScale: ColorScaleConfig
): ColorScaleConfig {
  if (layerType === "none" || visibleDistricts.length === 0) {
    return baseScale;
  }

  // Collect all non-null values from visible districts
  const values: number[] = [];
  for (const district of visibleDistricts) {
    const districtMetrics = metrics[district];
    if (!districtMetrics) continue;

    const value =
      layerType === "house-prices"
        ? districtMetrics.medianPrice
        : districtMetrics.commuteMinutes;

    if (value !== null) {
      values.push(value);
    }
  }

  // Need at least 3 data points to calculate a meaningful scale
  if (values.length < 3) {
    return baseScale;
  }

  // Sort values to calculate percentiles
  values.sort((a, b) => a - b);

  // Use 5th and 95th percentile to avoid outliers
  const p5Index = Math.floor(values.length * 0.05);
  const p95Index = Math.min(Math.floor(values.length * 0.95), values.length - 1);

  const min = values[p5Index];
  const max = values[p95Index];

  // Ensure we have a meaningful range (at least 10% of base scale range)
  const baseRange = baseScale.max - baseScale.min;
  const dynamicRange = max - min;

  if (dynamicRange < baseRange * 0.1) {
    return baseScale;
  }

  return {
    ...baseScale,
    min,
    max,
  };
}

/**
 * Interpolate between colors based on a value within a range.
 * Uses linear interpolation through the color stops.
 */
export function getColorForValue(
  value: number | null,
  config: ColorScaleConfig
): string {
  if (value === null) {
    return config.noDataColor;
  }

  const { min, max, colors } = config;

  // Clamp value to range
  const clampedValue = Math.max(min, Math.min(max, value));

  // Normalize to 0-1 range
  const normalizedValue = (clampedValue - min) / (max - min);

  // Calculate which color segment we're in
  const segments = colors.length - 1;
  const segmentIndex = Math.min(
    Math.floor(normalizedValue * segments),
    segments - 1
  );

  // Calculate position within segment (0-1)
  const segmentStart = segmentIndex / segments;
  const segmentEnd = (segmentIndex + 1) / segments;
  const segmentPosition =
    (normalizedValue - segmentStart) / (segmentEnd - segmentStart);

  // Interpolate between the two colors
  const startColor = hexToRgb(colors[segmentIndex]);
  const endColor = hexToRgb(colors[segmentIndex + 1]);

  const r = Math.round(
    startColor.r + (endColor.r - startColor.r) * segmentPosition
  );
  const g = Math.round(
    startColor.g + (endColor.g - startColor.g) * segmentPosition
  );
  const b = Math.round(
    startColor.b + (endColor.b - startColor.b) * segmentPosition
  );

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Format a value for display in the legend based on the layer type.
 */
export function formatLegendValue(
  value: number,
  layerType: "house-prices" | "commute-time"
): string {
  if (layerType === "house-prices") {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    return `£${(value / 1000).toFixed(0)}K`;
  } else {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }
}
