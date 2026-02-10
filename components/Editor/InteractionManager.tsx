"use client";

import { useState, useRef, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { EditorMode, DrawnShape } from "./types";

interface InteractionManagerProps {
  mode: EditorMode;
  shapes: DrawnShape[];
  onShapeAdd: (shape: DrawnShape) => void;
  onShapeUpdate: (id: string, updates: Partial<DrawnShape>) => void;
  onCalibrate: (distancePx: number) => void;
  setHoveredShapeId: (id: string | null) => void;
}

export default function InteractionManager({
  mode,
  shapes,
  onShapeAdd,
  onShapeUpdate,
  onCalibrate,
  setHoveredShapeId,
}: InteractionManagerProps) {
  const { camera, raycaster, pointer } = useThree();

  const lastSnapRef = useRef<THREE.Vector3 | null>(null);

  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<THREE.Vector3 | null>(null);

  const [extrudeShapeId, setExtrudeShapeId] = useState<string | null>(null);
  const [extrudeStartY, setExtrudeStartY] = useState<number | null>(null);
  const [initialShapeHeight, setInitialShapeHeight] = useState<number>(0);

  const [heightSnapY, setHeightSnapY] = useState<number | null>(null);

  const invisiblePlaneGeo = useMemo(
    () => new THREE.PlaneGeometry(100000, 100000),
    [],
  );
  const virtualPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  // --- NOWA FUNKCJA: Wykrywanie figury 3D pod kursorem ---
  const getHoveredShapeId3D = () => {
    raycaster.setFromCamera(pointer, camera);

    let closestDist = Infinity;
    let closestId = null;

    // Iterujemy po wszystkich kształtach i tworzymy dla nich wirtualne pudełka (Bounding Box)
    for (const shape of shapes) {
      // Znajdź zakres X i Z na podstawie punktów podstawy
      const xVals = shape.points.map((p) => p[0]);
      const zVals = shape.points.map((p) => p[2]);
      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const minZ = Math.min(...zVals);
      const maxZ = Math.max(...zVals);

      // Znajdź zakres Y (Wysokość)
      const h = shape.height || 0;
      // Uwaga: Dla płaskich figur (h=0) dodajemy minimalną grubość (epsilon),
      // żeby dało się je kliknąć.
      // Dla ujemnych (dziura) box idzie od h do 0.
      const epsilon = 0.1;
      const minY = Math.min(0, h) - (h === 0 ? epsilon : 0);
      const maxY = Math.max(0, h) + (h === 0 ? epsilon : 0);

      // Tworzymy matematyczny Box3
      const box = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ),
      );

      // Sprawdzamy czy promień z myszki przecina ten Box
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersection)) {
        // Obliczamy dystans od kamery, żeby wybrać ten najbliższy
        const dist = intersection.distanceTo(raycaster.ray.origin);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = shape.id;
        }
      }
    }

    return closestId;
  };

  // --- LOGIKA SNAPOWANIA PUNKTÓW ---
  const getSnappedPosition = (rawPoint: THREE.Vector3) => {
    let closestDist = Infinity;
    let closestPt = rawPoint.clone();
    let isSnapped = false;
    const snapThreshold = 15;

    if (rawPoint.distanceTo(new THREE.Vector3(0, 0, 0)) < snapThreshold) {
      return { point: new THREE.Vector3(0, 0, 0), isSnapped: true };
    }

    for (const shape of shapes) {
      for (const ptArr of shape.points) {
        const pt = new THREE.Vector3(ptArr[0], ptArr[1], ptArr[2]);
        if (shape.height && Math.abs(shape.height) > 0.1) {
          const topPt = pt.clone().setY(shape.height);
          const dist = pt.distanceTo(rawPoint);
          if (dist < snapThreshold && dist < closestDist) {
            closestDist = dist;
            closestPt = topPt;
            isSnapped = true;
          }
        } else {
          const dist = pt.distanceTo(rawPoint);
          if (dist < snapThreshold && dist < closestDist) {
            closestDist = dist;
            closestPt = pt;
            isSnapped = true;
          }
        }
      }
    }
    return { point: closestPt, isSnapped };
  };

  // --- OBSŁUGA RUCHU MYSZKĄ ---
  const handlePointerMove = (e: any) => {
    // 1. LOGIKA WYCIĄGANIA (Push/Pull)
    if (mode === "EXTRUDE" && extrudeShapeId && extrudeStartY !== null) {
      const currentMouseY = pointer.y;
      const sensitivity = 120;
      const deltaY = (currentMouseY - extrudeStartY) * sensitivity;
      let newHeight = initialShapeHeight + deltaY;

      const snapThreshold = 1.0;
      let snappedH = null;

      for (const shape of shapes) {
        if (shape.id === extrudeShapeId) continue;
        const h = shape.height || 0;
        if (Math.abs(h) < 0.1) continue;

        if (Math.abs(newHeight - h) < snapThreshold) {
          newHeight = h;
          snappedH = h;
          break;
        }
      }

      if (!snappedH && Math.abs(newHeight) < snapThreshold) {
        newHeight = 0;
        snappedH = 0;
      }

      setHeightSnapY(snappedH);
      onShapeUpdate(extrudeShapeId, { height: newHeight });
      return;
    }

    // 2. LOGIKA PODŚWIETLANIA (Hover) - Używamy nowej funkcji 3D
    if (mode === "EXTRUDE" && !extrudeShapeId) {
      const hoveredId = getHoveredShapeId3D();
      setHoveredShapeId(hoveredId);
      return;
    }

    if (mode === "VIEW") return;

    // 3. LOGIKA RYSOWANIA (Tu nadal używamy płaszczyzny podłogi, bo rysujemy na ziemi)
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(virtualPlane, intersectPoint);

    if (intersectPoint) {
      const { point } = getSnappedPosition(intersectPoint);
      if (!lastSnapRef.current || !point.equals(lastSnapRef.current)) {
        lastSnapRef.current = point;
        setSnappedPoint(point);
        setCurrentPoint(point);
      }
    }
  };

  // --- KLIKNIĘCIE ---
  const handlePointerDown = (e: any) => {
    if (mode === "VIEW") return;
    if (e.button !== 0) return;
    e.stopPropagation();

    if (mode === "EXTRUDE") {
      if (extrudeShapeId) {
        // KONIEC
        setExtrudeShapeId(null);
        setExtrudeStartY(null);
        setHoveredShapeId(null);
        setHeightSnapY(null);
      } else {
        // START - Używamy nowej funkcji 3D do wykrycia co klikamy
        const targetId = getHoveredShapeId3D();

        if (targetId) {
          const targetShape = shapes.find((s) => s.id === targetId);
          if (targetShape) {
            setExtrudeShapeId(targetId);
            setExtrudeStartY(pointer.y);
            setInitialShapeHeight(targetShape.height || 0);
          }
        }
      }
      return;
    }

    if (!snappedPoint) return;

    if (!startPoint) {
      setStartPoint(snappedPoint);
    } else {
      if (mode === "DRAW_RECT") {
        const p1 = startPoint;
        const p2 = snappedPoint;
        if (p1.distanceTo(p2) > 0.1) {
          const newShape: DrawnShape = {
            id: Math.random().toString(36),
            type: "rect",
            points: [
              [p1.x, 0, p1.z],
              [p2.x, 0, p1.z],
              [p2.x, 0, p2.z],
              [p1.x, 0, p2.z],
            ],
            height: 0,
          };
          onShapeAdd(newShape);
        }
      } else if (mode === "CALIBRATE") {
        const dist = startPoint.distanceTo(snappedPoint);
        if (dist > 0) onCalibrate(dist);
      }
      setStartPoint(null);
      setCurrentPoint(null);
      lastSnapRef.current = null;
    }
  };

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
        geometry={invisiblePlaneGeo}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        <meshBasicMaterial />
      </mesh>

      {/* Marker Snapa */}
      {mode !== "VIEW" && mode !== "EXTRUDE" && snappedPoint && (
        <mesh position={snappedPoint}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial color="magenta" toneMapped={false} />
        </mesh>
      )}

      {/* Siatka Snapa Wysokości */}
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

      {startPoint && currentPoint && (
        <>
          {mode === "CALIBRATE" && (
            <Line
              points={[startPoint, currentPoint]}
              color="magenta"
              lineWidth={2}
              dashed={true}
              dashScale={5}
            />
          )}
          {mode === "DRAW_RECT" && (
            <Line
              points={[
                [startPoint.x, 0.5, startPoint.z],
                [currentPoint.x, 0.5, startPoint.z],
                [currentPoint.x, 0.5, currentPoint.z],
                [startPoint.x, 0.5, currentPoint.z],
                [startPoint.x, 0.5, startPoint.z],
              ]}
              color="black"
              lineWidth={3}
            />
          )}
        </>
      )}
    </>
  );
}
