"use client";

import { useState, useEffect, useRef } from "react";

interface HeightInputPanelProps {
  currentHeight: number;
  currentBaseY: number;
  onApply: (height: number, baseY: number) => void;
  onCancel: () => void;
}

export default function HeightInputPanel({
  currentHeight,
  currentBaseY,
  onApply,
  onCancel,
}: HeightInputPanelProps) {
  const [heightValue, setHeightValue] = useState(currentHeight.toString());
  const [baseYValue, setBaseYValue] = useState(currentBaseY.toString());
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

  return (
    <div className="absolute top-20 left-4 bg-white shadow-xl border-2 border-blue-500 rounded-lg p-4 z-50 w-72">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Edycja figury</h3>

      <form onSubmit={handleSubmit}>
        {/* Pozycja podstawy (BaseY) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Pozycja podstawy (mm)
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

        {/* Wysokość bryły (Height) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Wysokość bryły (mm)
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
            Anuluj (Esc)
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-semibold"
          >
            Zastosuj (Enter)
          </button>
        </div>
      </form>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500"></p>
      </div>
    </div>
  );
}
