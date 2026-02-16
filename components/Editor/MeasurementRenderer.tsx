"use client";

import { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { DrawnShape } from "./types";

interface MeasurementRendererProps {
  measurements: DrawnShape[];
  canvasScale: number;
  hoveredMeasureId?: string | null;
}

/** Pojedynczy wymiar - linia + etykieta + punkty końcowe */
function MeasurementLine({
  shape,
  canvasScale,
  isHovered,
}: {
  shape: DrawnShape;
  canvasScale: number;
  isHovered: boolean;
}) {
  const start = shape.measureStart || [0, 0, 0];
  const end = shape.measureEnd || [0, 0, 0];

  const startVec = useMemo(
    () => new THREE.Vector3(start[0], start[1], start[2]),
    [start],
  );
  const endVec = useMemo(
    () => new THREE.Vector3(end[0], end[1], end[2]),
    [end],
  );

  const distance = startVec.distanceTo(endVec);
  const distanceMM = distance * canvasScale;
  const midPoint = useMemo(
    () => startVec.clone().add(endVec).multiplyScalar(0.5),
    [startVec, endVec],
  );

  // Rozmiar punktów końcowych proporcjonalny do odległości
  const endpointSize = Math.max(0.8, Math.min(distance * 0.03, 3));

  // Kolor
  const lineColor = isHovered ? "#ff6600" : "#ff9800";
  const endpointColor = isHovered ? "#ff4400" : "#e65100";

  // Formatowanie wartości
  const formatDistance = (mm: number): string => {
    if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`;
    if (mm >= 10) return `${mm.toFixed(2)} mm`;
    return `${mm.toFixed(2)} mm`;
  };

  // Kierunek wymiaru dla strzałek (małe linie na końcach)
  const dir = useMemo(() => {
    return endVec.clone().sub(startVec).normalize();
  }, [startVec, endVec]);

  // Perpendicular direction for wing marks
  const perpDir = useMemo(() => {
    // Find a perpendicular vector
    const up = new THREE.Vector3(0, 1, 0);
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.length() < 0.01) {
      perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    perp.normalize();
    return perp;
  }, [dir]);

  const wingSize = Math.max(1.5, Math.min(distance * 0.05, 6));

  if (!shape.visible) return null;

  return (
    <group>
      {/* Główna linia wymiaru */}
      <Line
        points={[startVec, endVec]}
        color={lineColor}
        lineWidth={isHovered ? 6 : 4}
        dashed={false}
        depthTest={false}
      />

      {/* Punkt startowy */}
      <mesh position={startVec}>
        <sphereGeometry args={[endpointSize, 12, 12]} />
        <meshBasicMaterial color={endpointColor} toneMapped={false} />
      </mesh>

      {/* Punkt końcowy */}
      <mesh position={endVec}>
        <sphereGeometry args={[endpointSize, 12, 12]} />
        <meshBasicMaterial color={endpointColor} toneMapped={false} />
      </mesh>

      {/* Znaczniki na końcach (skrzydełka) */}
      <Line
        points={[
          startVec.clone().add(perpDir.clone().multiplyScalar(wingSize)),
          startVec.clone().add(perpDir.clone().multiplyScalar(-wingSize)),
        ]}
        color={lineColor}
        lineWidth={3}
        depthTest={false}
      />
      <Line
        points={[
          endVec.clone().add(perpDir.clone().multiplyScalar(wingSize)),
          endVec.clone().add(perpDir.clone().multiplyScalar(-wingSize)),
        ]}
        color={lineColor}
        lineWidth={3}
        depthTest={false}
      />

      {/* Etykieta z odległością */}
      <Html
        position={[midPoint.x, midPoint.y, midPoint.z]}
        center
        distanceFactor={200}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            backgroundColor: isHovered
              ? "rgba(255, 102, 0, 0.95)"
              : "rgba(255, 152, 0, 0.92)",
            color: "white",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "bold",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.3)",
            userSelect: "none",
            lineHeight: "1.2",
          }}
        >
          {formatDistance(distanceMM)}
        </div>
      </Html>

      {/* Nazwa wymiaru (mniejsza, pod główną etykietą) */}
      {shape.name && (
        <Html
          position={[midPoint.x, midPoint.y - wingSize * 1.5, midPoint.z]}
          center
          distanceFactor={250}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "#ddd",
              padding: "1px 5px",
              borderRadius: "3px",
              fontSize: "9px",
              fontFamily: "sans-serif",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {shape.name}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function MeasurementRenderer({
  measurements,
  canvasScale,
  hoveredMeasureId,
}: MeasurementRendererProps) {
  return (
    <group>
      {measurements.map((m) => (
        <MeasurementLine
          key={m.id}
          shape={m}
          canvasScale={canvasScale}
          isHovered={hoveredMeasureId === m.id}
        />
      ))}
    </group>
  );
}
