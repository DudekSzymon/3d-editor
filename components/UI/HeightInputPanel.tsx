"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DrawnShape,
  getShapeBoxParams,
  SHAPE_COLORS,
  EntityShape,
} from "../Editor/types";

interface HeightInputPanelProps {
  currentHeight: number;
  currentBaseY: number;
  shape: DrawnShape;
  onApply: (updates: {
    height: number;
    baseY: number;
    newWidth?: number;
    newDepth?: number;
    radius?: number;
    center?: [number, number, number];
  }) => void;
  onCancel: () => void;
  onMove: (dx: number, dy: number, dz: number) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onEntityShapeChange?: (entityShape: EntityShape) => void;
  orientation?: "xz" | "xy" | "yz";
  faceDirection?: number;
  isChild?: boolean;
  canvasScale?: number;
}

export default function HeightInputPanel({
  currentHeight,
  currentBaseY,
  shape,
  onApply,
  onCancel,
  onMove,
  onDelete,
  onColorChange,
  onEntityShapeChange,
  orientation = "xz",
  faceDirection,
  isChild = false,
  canvasScale = 1,
}: HeightInputPanelProps) {
  const isSphere = shape.type === "sphere";
  const cs = canvasScale;

  const { width: currentWidth, depth: currentDepth } = useMemo(() => {
    return getShapeBoxParams(shape);
  }, [shape]);

  const [heightValue, setHeightValue] = useState(
    (currentHeight * cs).toString(),
  );
  const [baseYValue, setBaseYValue] = useState((currentBaseY * cs).toString());
  const [widthValue, setWidthValue] = useState((currentWidth * cs).toFixed(2));
  const [depthValue, setDepthValue] = useState((currentDepth * cs).toFixed(2));
  const [moveStep, setMoveStep] = useState(1);

  const [radiusValue, setRadiusValue] = useState(
    ((shape.radius || 10) * cs).toFixed(2),
  );
  const [centerX, setCenterX] = useState(
    ((shape.center?.[0] || 0) * cs).toFixed(2),
  );
  const [centerY, setCenterY] = useState(
    ((shape.center?.[2] || 0) * cs).toFixed(2),
  );
  const [centerZ, setCenterZ] = useState(
    ((shape.center?.[1] || shape.radius || 10) * cs).toFixed(2),
  );

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(
    shape.color || (isSphere ? "#ff0000" : "#e5e7eb"),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const heightInputRef = useRef<HTMLInputElement>(null);
  const radiusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSphere) {
      setRadiusValue(((shape.radius || 10) * cs).toFixed(2));
      setCenterX(((shape.center?.[0] || 0) * cs).toFixed(2));
      setCenterY(((shape.center?.[2] || 0) * cs).toFixed(2));
      setCenterZ(((shape.center?.[1] || shape.radius || 10) * cs).toFixed(2));
      setTimeout(() => radiusInputRef.current?.select(), 50);
    } else {
      setHeightValue((currentHeight * cs).toFixed(2));
      setBaseYValue((currentBaseY * cs).toFixed(2));
      setWidthValue((currentWidth * cs).toFixed(2));
      setDepthValue((currentDepth * cs).toFixed(2));
      setTimeout(() => heightInputRef.current?.select(), 50);
    }
    setCustomColor(shape.color || (isSphere ? "#ff0000" : "#e5e7eb"));
  }, [
    currentHeight,
    currentBaseY,
    currentWidth,
    currentDepth,
    isSphere,
    shape,
    cs,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSphere) {
      const radiusMM = parseFloat(radiusValue);
      const cxMM = parseFloat(centerX);
      const cyMM = parseFloat(centerY);
      const czMM = parseFloat(centerZ);

      if (!isNaN(radiusMM) && !isNaN(cxMM) && !isNaN(cyMM) && !isNaN(czMM)) {
        onApply({
          height: 0,
          baseY: 0,
          radius: radiusMM / cs,
          center: [cxMM / cs, czMM / cs, cyMM / cs],
        });
      }
    } else {
      const heightMM = parseFloat(heightValue);
      const baseYMM = parseFloat(baseYValue);
      const newWidthMM = parseFloat(widthValue);
      const newDepthMM = parseFloat(depthValue);

      if (
        !isNaN(heightMM) &&
        !isNaN(baseYMM) &&
        !isNaN(newWidthMM) &&
        !isNaN(newDepthMM)
      ) {
        onApply({
          height: heightMM / cs,
          baseY: baseYMM / cs,
          newWidth: newWidthMM / cs,
          newDepth: newDepthMM / cs,
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleMoveClick = (dir: "up" | "down" | "left" | "right") => {
    const s = moveStep / cs;
    if (isSphere) {
      if (dir === "up") onMove(0, s, 0);
      if (dir === "down") onMove(0, -s, 0);
      if (dir === "left") onMove(-s, 0, 0);
      if (dir === "right") onMove(s, 0, 0);
    } else {
      if (orientation === "xz") {
        if (dir === "up") onMove(0, 0, -s);
        if (dir === "down") onMove(0, 0, s);
        if (dir === "left") onMove(-s, 0, 0);
        if (dir === "right") onMove(s, 0, 0);
      } else if (orientation === "xy") {
        if (dir === "up") onMove(0, s, 0);
        if (dir === "down") onMove(0, -s, 0);
        if (dir === "left") onMove(-s, 0, 0);
        if (dir === "right") onMove(s, 0, 0);
      } else if (orientation === "yz") {
        if (dir === "up") onMove(0, s, 0);
        if (dir === "down") onMove(0, -s, 0);
        if (dir === "left") onMove(0, 0, s);
        if (dir === "right") onMove(0, 0, -s);
      }
    }
  };

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    onColorChange(color);
    setShowColorPicker(false);
  };

  const getBaseLabel = () => {
    if (!isChild) return "Pozycja podstawy Y (mm)";
    switch (orientation) {
      case "xz":
        return "Pozycja podstawy Y (mm)";
      case "xy":
        return "Pozycja ściany Z (mm)";
      case "yz":
        return "Pozycja ściany X (mm)";
    }
  };

  const getHeightLabel = () => {
    if (!isChild) return "Wysokość (mm)";
    switch (orientation) {
      case "xz":
        return "Wysokość Y (mm)";
      case "xy":
        return "Głębokość Z (mm)";
      case "yz":
        return "Głębokość X (mm)";
    }
  };

  const getWidthLabel = () => {
    switch (orientation) {
      case "xz":
        return "Szerokość X (mm)";
      case "xy":
        return "Szerokość X (mm)";
      case "yz":
        return "Szerokość Z (mm)";
    }
  };

  const getDepthLabel = () => {
    switch (orientation) {
      case "xz":
        return "Głębokość Z (mm)";
      case "xy":
        return "Wysokość Y (mm)";
      case "yz":
        return "Wysokość Y (mm)";
    }
  };

  const currentEntityShape = shape.entityShape || "sphere";

  return (
    <div className="absolute top-20 left-4 bg-white shadow-xl border-2 border-blue-500 rounded-lg p-4 z-50 w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex justify-between items-center">
        <span>{isSphere ? "Edycja Obiektu" : "Panel Edycji"}</span>
        <div className="flex gap-1">
          {canvasScale !== 1 && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
              1u={cs}mm
            </span>
          )}
          {isSphere && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded">
              {currentEntityShape === "cube" ? "SZEŚCIAN" : "KULA"}
            </span>
          )}
          {!isSphere && isChild && (
            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
              NA ŚCIANIE
            </span>
          )}
        </div>
      </h3>

      {/* ========== KOLOR ========== */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase">
            Kolor obiektu
          </label>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-4 h-4 rounded border border-gray-400"
              style={{ backgroundColor: customColor }}
            />
            <span className="text-[10px] font-mono text-gray-600">
              {customColor}
            </span>
          </button>
        </div>

        {showColorPicker && (
          <div className="mt-2">
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {SHAPE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorSelect(c)}
                  className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                    customColor === c
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onColorChange(e.target.value);
                }}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomColor(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    onColorChange(val);
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 font-mono text-gray-700"
                placeholder="#ff0000"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========== ZMIANA KSZTAŁTU ENTITY ========== */}
      {isSphere && onEntityShapeChange && (
        <div className="mb-4 p-3 bg-purple-50 rounded-md border border-purple-200">
          <label className="block text-[10px] font-bold text-purple-700 uppercase mb-2">
            Kształt obiektu
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEntityShapeChange("sphere")}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-md border-2 transition-all ${
                currentEntityShape === "sphere"
                  ? "border-purple-500 bg-purple-100 text-purple-700"
                  : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" opacity="0.6" />
              </svg>
              <span className="text-[10px] font-bold">Kula</span>
            </button>
            <button
              type="button"
              onClick={() => onEntityShapeChange("cube")}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-md border-2 transition-all ${
                currentEntityShape === "cube"
                  ? "border-purple-500 bg-purple-100 text-purple-700"
                  : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.6" />
              </svg>
              <span className="text-[10px] font-bold">Sześcian</span>
            </button>
          </div>
        </div>
      )}

      {/* AKTUALNE WYMIARY */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-300">
        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 text-center">
          {isSphere ? "Aktualne parametry (mm)" : "Aktualne wymiary (mm)"}
        </label>
        {isSphere ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">
                {currentEntityShape === "cube" ? "Bok/2" : "Promień"}
              </div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {((shape.radius || 10) * cs).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">X</div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {((shape.center?.[0] || 0) * cs).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">Y</div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {((shape.center?.[1] || shape.radius || 10) * cs).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">Z</div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {((shape.center?.[2] || 0) * cs).toFixed(1)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">
                Szerokość
              </div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {(currentWidth * cs).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">
                Głębokość
              </div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {(currentDepth * cs).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-semibold">
                Wysokość
              </div>
              <div className="text-sm font-mono font-bold text-gray-700">
                {(Math.abs(currentHeight) * cs).toFixed(1)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sekcja przesuwania (D-Pad) */}
      <div className="mb-6 p-3 bg-gray-50 rounded-md border border-gray-200">
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 text-center">
          Przesuń element (krok {moveStep}mm)
        </label>
        <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
          <div />
          <button
            type="button"
            onClick={() => handleMoveClick("up")}
            className="p-2 bg-white hover:bg-blue-500 hover:text-white border rounded shadow-sm transition-all"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onClick={() => handleMoveClick("left")}
            className="p-2 bg-white hover:bg-blue-500 hover:text-white border rounded shadow-sm transition-all"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => handleMoveClick("down")}
            className="p-2 bg-white hover:bg-blue-500 hover:text-white border rounded shadow-sm transition-all"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => handleMoveClick("right")}
            className="p-2 bg-white hover:bg-blue-500 hover:text-white border rounded shadow-sm transition-all"
          >
            ▶
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {isSphere ? (
          <div className="mb-4 p-3 bg-red-50 rounded-md border border-red-300">
            <label className="block text-[10px] font-bold text-red-700 uppercase mb-3 text-center">
              Parametry obiektu (mm)
            </label>

            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                {currentEntityShape === "cube"
                  ? "Połowa boku (mm)"
                  : "Promień (mm)"}
              </label>
              <input
                ref={radiusInputRef}
                type="number"
                step="0.01"
                min="0.1"
                value={radiusValue}
                onChange={(e) => setRadiusValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border-2 border-red-300 rounded px-2 py-2 text-center text-base font-mono font-bold focus:border-red-500 focus:outline-none bg-white text-black"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                  Pozycja X
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={centerX}
                  onChange={(e) => setCenterX(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-red-300 rounded px-2 py-2 text-center text-sm font-mono font-bold focus:border-red-500 focus:outline-none bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                  Pozycja Y
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={centerY}
                  onChange={(e) => setCenterY(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-red-300 rounded px-2 py-2 text-center text-sm font-mono font-bold focus:border-red-500 focus:outline-none bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                  Pozycja Z
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={centerZ}
                  onChange={(e) => setCenterZ(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-red-300 rounded px-2 py-2 text-center text-sm font-mono font-bold focus:border-red-500 focus:outline-none bg-white text-black"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-300">
              <label className="block text-[10px] font-bold text-green-700 uppercase mb-3 text-center">
                Zmień wymiary (mm)
              </label>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                    {getWidthLabel()}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={widthValue}
                    onChange={(e) => setWidthValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full border-2 border-green-300 rounded px-2 py-2 text-center text-base font-mono font-bold focus:border-green-500 focus:outline-none bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                    {getDepthLabel()}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={depthValue}
                    onChange={(e) => setDepthValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full border-2 border-green-300 rounded px-2 py-2 text-center text-base font-mono font-bold focus:border-green-500 focus:outline-none bg-white text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                  {getHeightLabel()}
                </label>
                <input
                  ref={heightInputRef}
                  type="number"
                  step="0.01"
                  value={heightValue}
                  onChange={(e) => setHeightValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-green-300 rounded px-2 py-2 text-center text-base font-mono font-bold focus:border-green-500 focus:outline-none bg-white text-black"
                />
              </div>
            </div>

            {!isChild && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  {getBaseLabel()}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseYValue}
                  onChange={(e) => setBaseYValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-center text-base font-mono focus:border-blue-500 focus:outline-none text-black"
                />
              </div>
            )}
          </>
        )}

        {/* Przyciski akcji */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors font-semibold"
          >
            ✖ Anuluj
          </button>
          <button
            type="submit"
            className={`flex-1 px-4 py-3 text-sm text-white rounded transition-colors font-bold shadow-md ${
              isSphere
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            ✓ Zastosuj
          </button>
        </div>
      </form>

      {/* ========== PRZYCISK USUWANIA ========== */}
      <div className="border-t border-gray-200 pt-3">
        {showDeleteConfirm ? (
          <div className="p-3 bg-red-50 rounded-md border border-red-300">
            <p className="text-xs text-red-700 font-semibold mb-2 text-center">
              Na pewno usunąć ten obiekt?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded transition-colors font-semibold"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors font-bold"
              >
                Tak, usuń
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Usuń obiekt
          </button>
        )}
      </div>
    </div>
  );
}
