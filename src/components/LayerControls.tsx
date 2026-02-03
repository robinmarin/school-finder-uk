import { memo } from "react";
import {
  HeatMapLayerType,
  HOUSE_PRICE_SCALE,
  COMMUTE_TIME_SCALE,
  ColorScaleConfig,
} from "../types";
import { formatLegendValue } from "../utils/colorScales";

interface LayerControlsProps {
  selectedLayer: HeatMapLayerType;
  onLayerChange: (layer: HeatMapLayerType) => void;
  dynamicScale?: ColorScaleConfig | null;
}

const LAYER_OPTIONS: { value: HeatMapLayerType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "house-prices", label: "House Prices" },
  { value: "commute-time", label: "Commute to London" },
];

function GradientLegend({
  scale,
  layerType,
}: {
  scale: ColorScaleConfig;
  layerType: "house-prices" | "commute-time";
}) {
  const gradientStyle = {
    background: `linear-gradient(to right, ${scale.colors.join(", ")})`,
  };

  return (
    <div className="legend-container">
      <div className="legend-gradient" style={gradientStyle} />
      <div className="legend-labels">
        <span>{formatLegendValue(scale.min, layerType)}</span>
        <span>{formatLegendValue(scale.max, layerType)}</span>
      </div>
    </div>
  );
}

function LayerControlsComponent({
  selectedLayer,
  onLayerChange,
  dynamicScale,
}: LayerControlsProps) {
  // Use dynamic scale if provided, otherwise fall back to default scales
  const housePriceScale =
    selectedLayer === "house-prices" && dynamicScale
      ? dynamicScale
      : HOUSE_PRICE_SCALE;

  const commuteTimeScale =
    selectedLayer === "commute-time" && dynamicScale
      ? dynamicScale
      : COMMUTE_TIME_SCALE;

  return (
    <div className="layer-controls">
      <div className="layer-controls-title">Map Overlays</div>
      <div className="layer-options">
        {LAYER_OPTIONS.map((option) => (
          <label key={option.value} className="layer-option">
            <input
              type="radio"
              name="heatmap-layer"
              value={option.value}
              checked={selectedLayer === option.value}
              onChange={() => onLayerChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      {selectedLayer === "house-prices" && (
        <GradientLegend scale={housePriceScale} layerType="house-prices" />
      )}

      {selectedLayer === "commute-time" && (
        <GradientLegend scale={commuteTimeScale} layerType="commute-time" />
      )}
    </div>
  );
}

export const LayerControls = memo(LayerControlsComponent);
