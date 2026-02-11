"use client";

import { useState, useEffect, useRef } from "react";

interface HeightInputPanelProps {
  currentHeight: number;
  currentBaseY: number;
  onApply: (height: number, baseY: number) => void;
  onCancel: () => void;
  onMove: (dx: number, dy: number, dz: number) => void;
  orientation?: "xz" | "xy" | "yz";
  faceDirection?: number;
  isChild?: boolean;
}

export default function HeightInputPanel({
  currentHeight,
  currentBaseY,
  onApply,
  onCancel,
  onMove,
  orientation = "xz",
  faceDirection,
  isChild = false,
}: HeightInputPanelProps) {
  const [heightValue, setHeightValue] = useState(currentHeight.toString());
  const [baseYValue, setBaseYValue] = useState(currentBaseY.toString());
  const [moveStep, setMoveStep] = useState(1);
  const heightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeightValue(currentHeight.toFixed(2));
    setBaseYValue(currentBaseY.toFixed(2));
    setTimeout(() => heightInputRef.current?.select(), 50);
  }, [currentHeight, currentBaseY]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const height = parseFloat(heightValue);
    const baseY = parseFloat(baseYValue);
    if (!isNaN(height) && !isNaN(baseY)) {
      onApply(height, baseY);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  // Logika mapowania przycisków na osie 3D w zależności od orientacji ściany
  const handleMoveClick = (dir: "up" | "down" | "left" | "right") => {
    const s = moveStep;
    if (orientation === "xz") {
      // Podłoga/Sufit: góra/dół to oś Z, lewo/prawo to oś X
      if (dir === "up") onMove(0, 0, -s);
      if (dir === "down") onMove(0, 0, s);
      if (dir === "left") onMove(-s, 0, 0);
      if (dir === "right") onMove(s, 0, 0);
    } else if (orientation === "xy") {
      // Ściana front/tył: góra/dół to oś Y, lewo/prawo to oś X
      if (dir === "up") onMove(0, s, 0);
      if (dir === "down") onMove(0, -s, 0);
      if (dir === "left") onMove(-s, 0, 0);
      if (dir === "right") onMove(s, 0, 0);
    } else if (orientation === "yz") {
      // Ściana lewo/prawo: góra/dół to oś Y, lewo/prawo to oś Z
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

  return (
    <div className="absolute top-20 left-4 bg-white shadow-xl border-2 border-blue-500 rounded-lg p-4 z-50 w-72">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex justify-between items-center">
        <span>Edycja figury</span>
        {isChild && (
          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
            NA ŚCIANIE
          </span>
        )}
      </h3>

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
        {!isChild && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              {getBaseLabel()}
            </label>
            <input
              type="number"
              step="0.1"
              value={baseYValue}
              onChange={(e) => setBaseYValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border-2 border-gray-300 rounded px-3 py-2 text-center text-lg font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {getHeightLabel()}
          </label>
          <input
            ref={heightInputRef}
            type="number"
            step="0.1"
            value={heightValue}
            onChange={(e) => setHeightValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-center text-lg font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-semibold"
          >
            Zastosuj
          </button>
        </div>
      </form>
    </div>
  );
}
