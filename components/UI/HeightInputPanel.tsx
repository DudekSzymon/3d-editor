"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { DrawnShape, getShapeBoxParams } from "../Editor/types";

interface HeightInputPanelProps {
  currentHeight: number;
  currentBaseY: number;
  shape: DrawnShape;
  onApply: (updates: {
    height: number;
    baseY: number;
    newWidth?: number;
    newDepth?: number;
  }) => void;
  onCancel: () => void;
  onMove: (dx: number, dy: number, dz: number) => void;
  orientation?: "xz" | "xy" | "yz";
  faceDirection?: number;
  isChild?: boolean;
}

export default function HeightInputPanel({
  currentHeight,
  currentBaseY,
  shape,
  onApply,
  onCancel,
  onMove,
  orientation = "xz",
  faceDirection,
  isChild = false,
}: HeightInputPanelProps) {
  const { width: currentWidth, depth: currentDepth } = useMemo(() => {
    return getShapeBoxParams(shape);
  }, [shape]);

  const [heightValue, setHeightValue] = useState(currentHeight.toString());
  const [baseYValue, setBaseYValue] = useState(currentBaseY.toString());
  const [widthValue, setWidthValue] = useState(currentWidth.toFixed(2));
  const [depthValue, setDepthValue] = useState(currentDepth.toFixed(2));
  const [moveStep, setMoveStep] = useState(1);

  const heightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeightValue(currentHeight.toFixed(2));
    setBaseYValue(currentBaseY.toFixed(2));
    setWidthValue(currentWidth.toFixed(2));
    setDepthValue(currentDepth.toFixed(2));
    setTimeout(() => heightInputRef.current?.select(), 50);
  }, [currentHeight, currentBaseY, currentWidth, currentDepth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const height = parseFloat(heightValue);
    const baseY = parseFloat(baseYValue);
    const newWidth = parseFloat(widthValue);
    const newDepth = parseFloat(depthValue);

    if (
      !isNaN(height) &&
      !isNaN(baseY) &&
      !isNaN(newWidth) &&
      !isNaN(newDepth)
    ) {
      onApply({
        height,
        baseY,
        newWidth,
        newDepth,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleMoveClick = (dir: "up" | "down" | "left" | "right") => {
    const s = moveStep;
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

  return (
    <div className="absolute top-20 left-4 bg-white shadow-xl border-2 border-blue-500 rounded-lg p-4 z-50 w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex justify-between items-center">
        <span>Panel Edycji</span>
        {isChild && (
          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
            NA ŚCIANIE
          </span>
        )}
      </h3>

      {/* AKTUALNE WYMIARY - tylko do odczytu */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-300">
        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 text-center">
          Aktualne wymiary
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] text-gray-500 font-semibold">
              Szerokość
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {currentWidth.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 font-semibold">
              Głębokość
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {currentDepth.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 font-semibold">
              Wysokość
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {Math.abs(currentHeight).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Sekcja przesuwania (D-Pad) - ORYGINALNA BEZ ZMIAN */}
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
        {/* NOWE WYMIARY - do edycji */}
        <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-300">
          <label className="block text-[10px] font-bold text-green-700 uppercase mb-3 text-center">
            Zmień wymiary (mm)
          </label>

          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* Szerokość */}
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

            {/* Głębokość */}
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

          {/* Wysokość - pełna szerokość */}
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

        {/* Pozycja podstawy */}
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

        {/* Przyciski akcji */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors font-semibold"
          >
            ✖ Anuluj
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors font-bold shadow-md"
          >
            ✓ Zastosuj zmiany
          </button>
        </div>
      </form>
    </div>
  );
}
