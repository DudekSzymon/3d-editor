import React, { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { EditorMode } from "./types";
import { DrawingFaceState } from "./interactionUtils";

interface InteractionOverlaysProps {
  mode: EditorMode;
  snappedPoint: THREE.Vector3 | null;
  isSnapEnabled: boolean;
  heightSnapY: number | null;
  startPoint: THREE.Vector3 | null;
  currentPoint: THREE.Vector3 | null;
  drawingFace: DrawingFaceState | null;
  invisiblePlaneGeo: THREE.PlaneGeometry;
  onPointerMove: () => void;
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
  // Measure
  measureStartPoint?: THREE.Vector3 | null;
  measureCurrentPoint?: THREE.Vector3 | null;
  canvasScale?: number;
}

export default function InteractionOverlays({
  mode,
  snappedPoint,
  isSnapEnabled,
  heightSnapY,
  startPoint,
  currentPoint,
  drawingFace,
  invisiblePlaneGeo,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  measureStartPoint,
  measureCurrentPoint,
  canvasScale = 1,
}: InteractionOverlaysProps) {
  const previewPoints = useMemo(() => {
    if (!startPoint || !currentPoint || mode !== "DRAW_RECT") return null;
    if (drawingFace) {
      const p1 = startPoint;
      const p2 = currentPoint;
      const off = 0.1 * drawingFace.faceDirection;
      if (drawingFace.orientation === "xz") {
        const y = drawingFace.faceOffset + off;
        return [
          [p1.x, y, p1.z],
          [p2.x, y, p1.z],
          [p2.x, y, p2.z],
          [p1.x, y, p2.z],
          [p1.x, y, p1.z],
        ] as [number, number, number][];
      } else if (drawingFace.orientation === "xy") {
        const z = drawingFace.faceOffset + off;
        return [
          [p1.x, p1.y, z],
          [p2.x, p1.y, z],
          [p2.x, p2.y, z],
          [p1.x, p2.y, z],
          [p1.x, p1.y, z],
        ] as [number, number, number][];
      } else {
        const x = drawingFace.faceOffset + off;
        return [
          [x, p1.y, p1.z],
          [x, p1.y, p2.z],
          [x, p2.y, p2.z],
          [x, p2.y, p1.z],
          [x, p1.y, p1.z],
        ] as [number, number, number][];
      }
    }
    return [
      [startPoint.x, 0.5, startPoint.z],
      [currentPoint.x, 0.5, startPoint.z],
      [currentPoint.x, 0.5, currentPoint.z],
      [startPoint.x, 0.5, currentPoint.z],
      [startPoint.x, 0.5, startPoint.z],
    ] as [number, number, number][];
  }, [startPoint, currentPoint, mode, drawingFace]);

  // Podgląd wymiaru (measure preview)
  const measurePreviewDistance = useMemo(() => {
    if (!measureStartPoint || !measureCurrentPoint) return 0;
    return measureStartPoint.distanceTo(measureCurrentPoint);
  }, [measureStartPoint, measureCurrentPoint]);

  const measureMidPoint = useMemo(() => {
    if (!measureStartPoint || !measureCurrentPoint) return null;
    return measureStartPoint
      .clone()
      .add(measureCurrentPoint)
      .multiplyScalar(0.5);
  }, [measureStartPoint, measureCurrentPoint]);

  const formatDistance = (mm: number): string => {
    if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`;
    if (mm >= 10) return `${mm.toFixed(2)} mm`;
    return `${mm.toFixed(2)} mm`;
  };

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
        geometry={invisiblePlaneGeo}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <meshBasicMaterial />
      </mesh>

      {/* Snap point indicator */}
      {mode !== "VIEW" &&
        mode !== "EXTRUDE" &&
        snappedPoint &&
        isSnapEnabled && (
          <mesh position={snappedPoint}>
            <sphereGeometry args={[mode === "MEASURE" ? 1.5 : 2, 16, 16]} />
            <meshBasicMaterial
              color={mode === "MEASURE" ? "#ff9800" : "magenta"}
              toneMapped={false}
            />
          </mesh>
        )}

      {mode === "EXTRUDE" && heightSnapY !== null && (
        <group position={[0, heightSnapY, 0]}>
          <gridHelper args={[1000, 10, "magenta", "magenta"]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial
              color="magenta"
              transparent
              opacity={0.05}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Podgląd rysowania PROSTOKĄTA */}
      {previewPoints && (
        <Line
          points={previewPoints}
          color={drawingFace ? "#ff4444" : "black"}
          lineWidth={3}
        />
      )}

      {/* Linia KALIBRACJI */}
      {startPoint && currentPoint && mode === "CALIBRATE" && (
        <Line
          points={[startPoint, currentPoint]}
          color="yellow"
          lineWidth={8}
          dashed={true}
          dashScale={10}
        />
      )}

      {/* === MEASURE PREVIEW === */}
      {mode === "MEASURE" && measureStartPoint && (
        <>
          {/* Punkt startowy wymiaru */}
          <mesh position={measureStartPoint}>
            <sphereGeometry args={[1.5, 12, 12]} />
            <meshBasicMaterial color="#ff9800" toneMapped={false} />
          </mesh>
        </>
      )}

      {mode === "MEASURE" &&
        measureStartPoint &&
        measureCurrentPoint &&
        measurePreviewDistance > 0.1 && (
          <>
            {/* Linia podglądu wymiaru */}
            <Line
              points={[measureStartPoint, measureCurrentPoint]}
              color="#ff9800"
              lineWidth={3}
              dashed={true}
              dashScale={5}
              dashSize={3}
              gapSize={2}
            />

            {/* Punkt końcowy podglądu */}
            <mesh position={measureCurrentPoint}>
              <sphereGeometry args={[1.5, 12, 12]} />
              <meshBasicMaterial color="#ff9800" toneMapped={false} />
            </mesh>

            {/* Etykieta z odległością (podgląd) */}
            {measureMidPoint && (
              <Html
                position={[
                  measureMidPoint.x,
                  measureMidPoint.y,
                  measureMidPoint.z,
                ]}
                center
                distanceFactor={200}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    backgroundColor: "rgba(255, 152, 0, 0.85)",
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
                  }}
                >
                  {formatDistance(measurePreviewDistance * canvasScale)}
                </div>
              </Html>
            )}
          </>
        )}

      {drawingFace && mode === "DRAW_RECT" && (
        <mesh
          position={
            drawingFace.orientation === "xz"
              ? [
                  0,
                  drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                  0,
                ]
              : drawingFace.orientation === "xy"
                ? [
                    0,
                    0,
                    drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                  ]
                : [
                    drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                    0,
                    0,
                  ]
          }
          rotation={
            drawingFace.orientation === "xz"
              ? [-Math.PI / 2, 0, 0]
              : drawingFace.orientation === "xy"
                ? [0, 0, 0]
                : [0, Math.PI / 2, 0]
          }
        >
          <planeGeometry args={[500, 500]} />
          <meshBasicMaterial
            color="#ff4444"
            transparent
            opacity={0.03}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}
