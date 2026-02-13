import { useState } from "react";
import {
  Layer,
  DEFAULT_LAYER_ID,
  createDefaultLayers,
} from "../components/Editor/types";

const LAYER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function useLayersManager(
  onRemoveLayer?: (layerId: string) => void,
) {
  const [layers, setLayers] = useState<Layer[]>(createDefaultLayers());
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    );
  };

  const handleAddLayer = (name: string) => {
    const colorIndex = layers.length % LAYER_COLORS.length;
    const newLayer: Layer = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      visible: true,
      color: LAYER_COLORS[colorIndex],
    };
    setLayers((prev) => [...prev, newLayer]);
  };

  const handleRemoveLayer = (layerId: string) => {
    if (layerId === DEFAULT_LAYER_ID) return;
    onRemoveLayer?.(layerId);
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
  };

  const handleRenameLayer = (layerId: string, newName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, name: newName } : l)),
    );
  };

  const hiddenLayerIds = new Set(
    layers.filter((l) => !l.visible).map((l) => l.id),
  );

  return {
    layers,
    isLayersPanelOpen,
    setIsLayersPanelOpen,
    hiddenLayerIds,
    handleToggleLayerVisibility,
    handleAddLayer,
    handleRemoveLayer,
    handleRenameLayer,
  };
}
