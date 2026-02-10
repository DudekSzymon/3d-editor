"use client";

import { useRef, useState } from "react";
import { MdImage } from "react-icons/md";

interface ImportImageButtonProps {
  onImageSelect: (file: File) => void;
}

export default function ImportImageButton({
  onImageSelect,
}: ImportImageButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
    }
  };

  return (
    <div
      style={{ position: "absolute", top: "20px", left: "70px", zIndex: 10 }}
    >
      <button
        onClick={handleClick}
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
          transition: "all 0.2s",
        }}
      >
        <MdImage size={20} color="#333" />
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

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
          Import JPG
        </div>
      )}
    </div>
  );
}
