"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTrash,
  FaCube,
  FaCircle,
  FaChevronDown,
  FaChevronRight,
  FaTimes,
  FaLayerGroup,
  FaRulerHorizontal,
} from "react-icons/fa";
import {
  DrawnShape,
  Layer,
  DEFAULT_LAYER_ID,
  getShapeBoxParams,
} from "../Editor/types";

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  shapes: DrawnShape[];
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleShapeVisibility: (shapeId: string) => void;
  onAddLayer: (name: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
  onMoveShapeToLayer: (shapeId: string, targetLayerId: string) => void;
  onSelectShape: (shapeId: string) => void;
  onDeleteShape: (shapeId: string) => void;
  canvasScale: number;
  editingShapeId: string | null;
}

function getPositionLabel(shape: DrawnShape, cs: number): string {
  if (shape.type === "sphere") {
    const c = shape.center || [0, 0, 0];
    return `(${(c[0] * cs).toFixed(0)}, ${(c[1] * cs).toFixed(0)}, ${(c[2] * cs).toFixed(0)})`;
  }
  if (shape.type === "measurement") {
    const s = shape.measureStart || [0, 0, 0];
    const e = shape.measureEnd || [0, 0, 0];
    return `(${(s[0] * cs).toFixed(0)},${(s[1] * cs).toFixed(0)},${(s[2] * cs).toFixed(0)})→(${(e[0] * cs).toFixed(0)},${(e[1] * cs).toFixed(0)},${(e[2] * cs).toFixed(0)})`;
  }
  const { center } = getShapeBoxParams(shape);
  return `(${(center.x * cs).toFixed(0)}, ${(center.y * cs).toFixed(0)}, ${(center.z * cs).toFixed(0)})`;
}

function getDimensionsLabel(shape: DrawnShape, cs: number): string {
  if (shape.type === "sphere") {
    return `r=${((shape.radius || 10) * cs).toFixed(1)}`;
  }
  if (shape.type === "measurement") {
    const dist = (shape.measureDistance || 0) * cs;
    if (dist >= 1000) return `${(dist / 1000).toFixed(2)} m`;
    if (dist >= 10) return `${dist.toFixed(2)} mm`;
    return `${dist.toFixed(2)} mm`;
  }
  const { width, depth, absHeight } = getShapeBoxParams(shape);
  return `${(width * cs).toFixed(0)}×${(depth * cs).toFixed(0)}×${(absHeight * cs).toFixed(0)}`;
}

function ShapeIcon({ shape }: { shape: DrawnShape }) {
  if (shape.type === "measurement") {
    return <FaRulerHorizontal size={10} className="text-orange-500 shrink-0" />;
  }
  if (shape.type === "sphere") {
    const color = shape.color || "#ff0000";
    if (shape.entityShape === "cube") {
      return <FaCube size={10} style={{ color }} className="shrink-0" />;
    }
    return <FaCircle size={10} style={{ color }} className="shrink-0" />;
  }
  const color = shape.color || "#3b82f6";
  return <FaCube size={10} style={{ color }} className="shrink-0" />;
}

function ShapeItem({
  shape,
  cs,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDelete,
  onDragStart,
}: {
  shape: DrawnShape;
  cs: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, shapeId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, shape.id)}
      onClick={onSelect}
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all text-xs
        hover:bg-gray-100 select-none group
        ${isSelected ? "bg-blue-50 border border-blue-300" : "border border-transparent"}
        ${!shape.visible ? "opacity-40" : ""}
      `}
      title={`${shape.name}\nPozycja: ${getPositionLabel(shape, cs)}\nWymiary: ${getDimensionsLabel(shape, cs)}`}
    >
      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
        ⠿
      </div>
      <ShapeIcon shape={shape} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-700 truncate text-[11px]">
          {shape.name}
        </div>
        <div className="text-[9px] text-gray-400 font-mono">
          {shape.type === "measurement"
            ? getDimensionsLabel(shape, cs)
            : `${getPositionLabel(shape, cs)} · ${getDimensionsLabel(shape, cs)}`}
        </div>
      </div>
      {/* Usuń obiekt */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-0.5 rounded text-gray-200 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        title="Usuń obiekt"
      >
        <FaTrash size={9} />
      </button>
      {/* Toggle widoczności */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
        className={`p-0.5 rounded transition-colors shrink-0 ${
          shape.visible
            ? "text-gray-300 hover:text-blue-500"
            : "text-red-400 hover:text-red-600"
        }`}
        title={shape.visible ? "Ukryj obiekt" : "Pokaż obiekt"}
      >
        {shape.visible ? <FaEye size={10} /> : <FaEyeSlash size={10} />}
      </button>
    </div>
  );
}

function LayerSection({
  layer,
  structures,
  entities,
  measurements,
  cs,
  editingShapeId,
  onSelectShape,
  onToggleVisibility,
  onToggleShapeVisibility,
  onDeleteShape,
  onRemove,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  isDefault,
}: {
  layer: Layer;
  structures: DrawnShape[];
  entities: DrawnShape[];
  measurements: DrawnShape[];
  cs: number;
  editingShapeId: string | null;
  onSelectShape: (id: string) => void;
  onToggleVisibility: () => void;
  onToggleShapeVisibility: (shapeId: string) => void;
  onDeleteShape: (shapeId: string) => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onDragStart: (e: React.DragEvent, shapeId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDefault: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(layer.name);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNameSubmit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== layer.name) {
      onRename(trimmed);
    } else {
      setNameValue(layer.name);
    }
    setIsEditing(false);
  };

  const totalCount = structures.length + entities.length + measurements.length;

  return (
    <div
      className={`
        border rounded-lg transition-all mb-2
        ${isDragTarget ? "border-blue-400 bg-blue-50/50" : "border-gray-200"}
        ${!layer.visible ? "opacity-50" : ""}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragTarget(true);
        onDragOver(e);
      }}
      onDragLeave={() => setIsDragTarget(false)}
      onDrop={(e) => {
        setIsDragTarget(false);
        onDrop(e);
      }}
    >
      <div className="flex items-center gap-1 px-2 py-2 bg-gray-50 rounded-t-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 p-0.5"
        >
          {isExpanded ? (
            <FaChevronDown size={8} />
          ) : (
            <FaChevronRight size={8} />
          )}
        </button>

        <div
          className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
          style={{ backgroundColor: layer.color }}
        />

        {isEditing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") {
                setNameValue(layer.name);
                setIsEditing(false);
              }
            }}
            className="flex-1 text-xs font-semibold bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none text-gray-800"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-xs font-semibold text-gray-700 cursor-pointer hover:text-blue-600 truncate"
            onDoubleClick={() => {
              setNameValue(layer.name);
              setIsEditing(true);
            }}
          >
            {layer.name}
          </span>
        )}

        <span className="text-[9px] text-gray-400 font-mono">{totalCount}</span>

        <button
          onClick={onToggleVisibility}
          className={`p-1 rounded transition-colors ${
            layer.visible
              ? "text-blue-500 hover:text-blue-700"
              : "text-gray-300 hover:text-gray-500"
          }`}
          title={layer.visible ? "Ukryj warstwę" : "Pokaż warstwę"}
        >
          {layer.visible ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
        </button>

        {!isDefault && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
            title="Usuń warstwę"
          >
            <FaTrash size={10} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="px-1 py-1">
          {totalCount === 0 && (
            <div className="text-[10px] text-gray-400 text-center py-3 italic">
              Przeciągnij tu obiekt
            </div>
          )}

          {structures.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-1 px-2 py-1">
                <FaCube size={8} className="text-blue-400" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Struktury ({structures.length})
                </span>
              </div>
              {structures.map((s) => (
                <ShapeItem
                  key={s.id}
                  shape={s}
                  cs={cs}
                  isSelected={editingShapeId === s.id}
                  onSelect={() => onSelectShape(s.id)}
                  onToggleVisibility={() => onToggleShapeVisibility(s.id)}
                  onDelete={() => onDeleteShape(s.id)}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}

          {entities.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-1 px-2 py-1">
                <FaCircle size={8} className="text-red-400" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Obiekty ({entities.length})
                </span>
              </div>
              {entities.map((s) => (
                <ShapeItem
                  key={s.id}
                  shape={s}
                  cs={cs}
                  isSelected={editingShapeId === s.id}
                  onSelect={() => onSelectShape(s.id)}
                  onToggleVisibility={() => onToggleShapeVisibility(s.id)}
                  onDelete={() => onDeleteShape(s.id)}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}

          {measurements.length > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 py-1">
                <FaRulerHorizontal size={8} className="text-orange-400" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Wymiary ({measurements.length})
                </span>
              </div>
              {measurements.map((s) => (
                <ShapeItem
                  key={s.id}
                  shape={s}
                  cs={cs}
                  isSelected={editingShapeId === s.id}
                  onSelect={() => onSelectShape(s.id)}
                  onToggleVisibility={() => onToggleShapeVisibility(s.id)}
                  onDelete={() => onDeleteShape(s.id)}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LayersPanel({
  isOpen,
  onClose,
  layers,
  shapes,
  onToggleLayerVisibility,
  onToggleShapeVisibility,
  onAddLayer,
  onRemoveLayer,
  onRenameLayer,
  onMoveShapeToLayer,
  onSelectShape,
  onDeleteShape,
  canvasScale,
  editingShapeId,
}: LayersPanelProps) {
  const [newLayerName, setNewLayerName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const draggedShapeRef = useRef<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, shapeId: string) => {
    draggedShapeRef.current = shapeId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", shapeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (targetLayerId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const shapeId =
        draggedShapeRef.current || e.dataTransfer.getData("text/plain");
      if (shapeId) {
        onMoveShapeToLayer(shapeId, targetLayerId);
      }
      draggedShapeRef.current = null;
    },
    [onMoveShapeToLayer],
  );

  const handleAddLayer = () => {
    const trimmed = newLayerName.trim();
    if (trimmed) {
      onAddLayer(trimmed);
      setNewLayerName("");
      setShowAddForm(false);
    }
  };

  if (!isOpen) return null;

  const structureCount = shapes.filter((s) => s.type === "rect").length;
  const entityCount = shapes.filter((s) => s.type === "sphere").length;
  const measureCount = shapes.filter((s) => s.type === "measurement").length;

  return (
    <div className="absolute top-0 right-0 w-72 h-full bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <FaLayerGroup size={14} className="text-blue-600" />
          <h2 className="text-sm font-bold text-gray-800">Warstwy</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {structureCount}S · {entityCount}O · {measureCount}W
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={12} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        {showAddForm ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddLayer();
                if (e.key === "Escape") setShowAddForm(false);
              }}
              placeholder="Nazwa warstwy..."
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400 text-gray-800"
              autoFocus
            />
            <button
              onClick={handleAddLayer}
              className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Dodaj
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <FaTimes size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <FaPlus size={10} />
            <span>Nowa warstwa</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {layers.map((layer) => {
          const layerShapes = shapes.filter((s) => s.layerId === layer.id);
          const structures = layerShapes.filter((s) => s.type === "rect");
          const entities = layerShapes.filter((s) => s.type === "sphere");
          const measurements = layerShapes.filter(
            (s) => s.type === "measurement",
          );

          return (
            <LayerSection
              key={layer.id}
              layer={layer}
              structures={structures}
              entities={entities}
              measurements={measurements}
              cs={canvasScale}
              editingShapeId={editingShapeId}
              onSelectShape={onSelectShape}
              onToggleVisibility={() => onToggleLayerVisibility(layer.id)}
              onToggleShapeVisibility={onToggleShapeVisibility}
              onDeleteShape={onDeleteShape}
              onRemove={() => onRemoveLayer(layer.id)}
              onRename={(name) => onRenameLayer(layer.id, name)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop(layer.id)}
              isDefault={layer.id === DEFAULT_LAYER_ID}
            />
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{layers.length} warstw</span>
          <span>
            {shapes.length} obiektów ({structureCount} struktur, {entityCount}{" "}
            obiektów, {measureCount} wymiarów)
          </span>
        </div>
      </div>
    </div>
  );
}
