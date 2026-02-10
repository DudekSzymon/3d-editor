"use client";

import { useState } from "react";
import { AiOutlineReload } from "react-icons/ai";

interface ResetViewButtonProps {
  onReset: () => void;
}

export default function ResetViewButton({ onReset }: ResetViewButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10 }}
    >
      <button
        onClick={onReset}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: showTooltip ? "#f5f5f5" : "white",
          border: showTooltip ? "1px solid #999" : "1px solid #d1d1d1",
          borderRadius: "4px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          transition: "all 0.2s",
        }}
      >
        <AiOutlineReload size={20} color="#333" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "45px",
            left: "0",
            padding: "4px 8px",
            backgroundColor: "#333",
            color: "white",
            fontSize: "12px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Reset View
        </div>
      )}
    </div>
  );
}
