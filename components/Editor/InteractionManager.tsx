"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EditorMode, DrawnShape, getShapeBoxParams } from "./types";
import {
  handleSpherePointerDown,
  handleSpherePointerUp,
  calculateNewRadius,
} from "./sphereHandlers";
import {
  getHoveredShapeId,
  getFaceHit,
  getSnappedPosition,
  getDrawingPoint,
  DrawingFaceState,
} from "./interactionUtils";
import InteractionOverlays from "./InteractionOverlays";

interface InteractionManagerProps {
  mode: EditorMode;
  shapes: DrawnShape[];
  onShapeAdd: (shape: DrawnShape) => void;
  onShapeUpdate: (id: string, updates: Partial<DrawnShape>) => void;
  onCalibrate: (distancePx: number) => void;
  setHoveredShapeId: (id: string | null) => void;
  isSnapEnabled: boolean;
  editingShapeId: string | null;
  setEditingShapeId: (id: string | null) => void;
  activeExtrudeId: string | null;
  setActiveExtrudeId: (id: string | null) => void;
  onShapesCommit: () => void;
}

type DragMode = "HEIGHT" | "SIDE_X" | "SIDE_Z" | null;

export default function InteractionManager({
  mode,
  shapes,
  onShapeAdd,
  onShapeUpdate,
  onCalibrate,
  setHoveredShapeId,
  isSnapEnabled,
  editingShapeId,
  setEditingShapeId,
  activeExtrudeId,
  setActiveExtrudeId,
  onShapesCommit,
}: InteractionManagerProps) {
  const { camera, raycaster, pointer } = useThree();

  const lastSnapRef = useRef<THREE.Vector3 | null>(null);
  // NOWE REF-Y: Zapamiętują stan w momencie kliknięcia
  const dragStartIntersectRef = useRef<THREE.Vector3 | null>(null);
  const dragStartShapeValueRef = useRef<any>(null);

  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<THREE.Vector3 | null>(null);

  const [drawingFace, setDrawingFace] = useState<DrawingFaceState | null>(null);

  const [extrudeStartY, setExtrudeStartY] = useState<number | null>(null);
  const [initialShapeHeight, setInitialShapeHeight] = useState<number>(0);
  const [mouseDownPos, setMouseDownPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [heightSnapY, setHeightSnapY] = useState<number | null>(null);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragDirection, setDragDirection] = useState<number>(0);

  const [placingSphereId, setPlacingSphereId] = useState<string | null>(null);
  const [sphereStartPoint, setSphereStartPoint] =
    useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    setStartPoint(null);
    setCurrentPoint(null);
    setSnappedPoint(null);
    setDrawingFace(null);
    setActiveExtrudeId(null);
    setHeightSnapY(null);
    setMouseDownPos(null);
    setHasMoved(false);
    setDragMode(null);
    setPlacingSphereId(null);
    setSphereStartPoint(null);
  }, [mode, setActiveExtrudeId]);

  const invisiblePlaneGeo = useMemo(
    () => new THREE.PlaneGeometry(100000, 100000),
    [],
  );
  const virtualPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );

  const handlePointerMove = () => {
    if (mouseDownPos && !hasMoved) {
      const deltaX = Math.abs(pointer.x - mouseDownPos.x);
      const deltaY = Math.abs(pointer.y - mouseDownPos.y);
      if (deltaX > 0.01 || deltaY > 0.01) setHasMoved(true);
    }

    // PLACE_SPHERE: zmiana promienia przy tworzeniu
    if (
      mode === "PLACE_SPHERE" &&
      placingSphereId &&
      sphereStartPoint &&
      hasMoved
    ) {
      if (!mouseDownPos) return;
      const newRadius = calculateNewRadius(mouseDownPos.y, pointer.y);
      onShapeUpdate(placingSphereId, { radius: newRadius });
      return;
    }

    // PRZESUWANIE CAŁYCH BRYŁ (Wspólne dla EXTRUDE i PLACE_SPHERE)
    // POPRAWIONE: Używamy dragStartIntersectRef zamiast lastSnapRef dla płynności
    if (
      (mode === "EXTRUDE" || (mode === "PLACE_SPHERE" && !placingSphereId)) &&
      editingShapeId &&
      mouseDownPos &&
      hasMoved &&
      !activeExtrudeId
    ) {
      const shape = shapes.find((s) => s.id === editingShapeId);
      if (shape && dragStartIntersectRef.current) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(
          cameraDirection,
          dragStartIntersectRef.current,
        );
        raycaster.setFromCamera(pointer, camera);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Obliczamy całkowity wektor przesunięcia od momentu kliknięcia
          const totalDelta = intersection
            .clone()
            .sub(dragStartIntersectRef.current);

          if (shape.type === "sphere") {
            const startCenter = dragStartShapeValueRef.current;
            const newCenter: [number, number, number] = [
              startCenter[0] + totalDelta.x,
              startCenter[1] + totalDelta.y,
              startCenter[2] + totalDelta.z,
            ];
            onShapeUpdate(editingShapeId, { center: newCenter });
          } else {
            const startPoints = dragStartShapeValueRef.current;
            const newPoints = startPoints.map((p: any) => [
              p[0] + totalDelta.x,
              p[1] + totalDelta.y,
              p[2] + totalDelta.z,
            ]);
            onShapeUpdate(editingShapeId, {
              points: newPoints as [number, number, number][],
            });
          }
        }
        return;
      }
    }

    // Pozostała logika EXTRUDE (ciągnięcie ścian / zmiana promienia sfery w Extrude)
    if (mode === "EXTRUDE" && activeExtrudeId && hasMoved) {
      if (dragMode === "HEIGHT" && extrudeStartY !== null) {
        const shape = shapes.find((s) => s.id === activeExtrudeId);
        if (!shape) return;

        const deltaY = (pointer.y - extrudeStartY) * 150;
        let newValue = initialShapeHeight + deltaY;

        if (shape.type === "sphere") {
          newValue = Math.max(1, newValue);
          onShapeUpdate(activeExtrudeId, { radius: newValue });
          return;
        }

        const snapThreshold = 1.0;
        let snappedH: number | null = null;
        for (const s of shapes) {
          if (s.id === activeExtrudeId) continue;
          const h = s.height || 0;
          if (Math.abs(h) < 0.1) continue;
          if (Math.abs(newValue - h) < snapThreshold) {
            newValue = h;
            snappedH = h;
            break;
          }
        }
        if (snappedH === null && Math.abs(newValue) < snapThreshold) {
          newValue = 0;
          snappedH = 0;
        }
        setHeightSnapY(snappedH);
        onShapeUpdate(activeExtrudeId, { height: newValue });
        return;
      }

      // POPRAWIONE: Logika SIDE_X i SIDE_Z również na "absolute dragging"
      if (
        (dragMode === "SIDE_X" || dragMode === "SIDE_Z") &&
        dragStartIntersectRef.current
      ) {
        const shape = shapes.find((s) => s.id === activeExtrudeId);
        if (!shape) return;

        const dragPlane = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -dragStartIntersectRef.current.y,
        );
        raycaster.setFromCamera(pointer, camera);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          const totalDelta = intersection
            .clone()
            .sub(dragStartIntersectRef.current);

          const startPoints = dragStartShapeValueRef.current as [
            number,
            number,
            number,
          ][];
          const minX = Math.min(...startPoints.map((p) => p[0]));
          const maxX = Math.max(...startPoints.map((p) => p[0]));
          const minZ = Math.min(...startPoints.map((p) => p[2]));
          const maxZ = Math.max(...startPoints.map((p) => p[2]));
          const startCenterX = (minX + maxX) / 2;
          const startCenterZ = (minZ + maxZ) / 2;

          const newPoints = startPoints.map((p) => {
            const newP = [...p] as [number, number, number];
            if (dragMode === "SIDE_X") {
              const isTargetSide =
                dragDirection > 0
                  ? p[0] > startCenterX - 0.1
                  : p[0] < startCenterX + 0.1;
              if (isTargetSide) newP[0] += totalDelta.x * 1.5;
            } else if (dragMode === "SIDE_Z") {
              const isTargetSide =
                dragDirection > 0
                  ? p[2] > startCenterZ - 0.1
                  : p[2] < startCenterZ + 0.1;
              if (isTargetSide) newP[2] += totalDelta.z;
            }
            return newP;
          });
          onShapeUpdate(activeExtrudeId, { points: newPoints });
        }
        return;
      }
    }

    if (mode === "EXTRUDE" && !activeExtrudeId && !editingShapeId) {
      setHoveredShapeId(getHoveredShapeId(raycaster, camera, pointer, shapes));
      return;
    }

    if (mode === "VIEW") return;

    if (mode === "PLACE_SPHERE" && !placingSphereId && !editingShapeId) {
      const rawPoint = getDrawingPoint(
        raycaster,
        camera,
        pointer,
        virtualPlane,
      );
      if (!rawPoint) return;
      const finalPoint = isSnapEnabled
        ? getSnappedPosition(rawPoint, shapes).point
        : rawPoint.clone();

      if (!lastSnapRef.current || !finalPoint.equals(lastSnapRef.current)) {
        lastSnapRef.current = finalPoint;
        setSnappedPoint(finalPoint);
        setCurrentPoint(finalPoint);
      }
      return;
    }

    const rawPoint = getDrawingPoint(
      raycaster,
      camera,
      pointer,
      drawingFace ? drawingFace.plane : virtualPlane,
    );
    if (!rawPoint) return;
    const finalPoint = isSnapEnabled
      ? getSnappedPosition(rawPoint, shapes).point
      : rawPoint.clone();

    if (!lastSnapRef.current || !finalPoint.equals(lastSnapRef.current)) {
      lastSnapRef.current = finalPoint;
      setSnappedPoint(finalPoint);
      setCurrentPoint(finalPoint);
    }
  };

  const handlePointerDown = (e: any) => {
    if (mode === "VIEW" || e.button !== 0) return;
    e.stopPropagation();

    if (mode === "PLACE_SPHERE") {
      const hoveredId = getHoveredShapeId(raycaster, camera, pointer, shapes);
      const hoveredShape = shapes.find((s) => s.id === hoveredId);

      if (
        hoveredId &&
        hoveredShape &&
        hoveredShape.type === "sphere" &&
        !placingSphereId
      ) {
        setEditingShapeId(hoveredId);
        setMouseDownPos({ x: pointer.x, y: pointer.y });
        setHasMoved(false);

        raycaster.setFromCamera(pointer, camera);
        const { boxArgs, center } = getShapeBoxParams(hoveredShape);
        const box = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(center.x, center.y, center.z),
          new THREE.Vector3(boxArgs[0], boxArgs[1], boxArgs[2]),
        );
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectBox(box, intersection)) {
          lastSnapRef.current = intersection.clone();
          // POPRAWIONE: Inicjalizacja refów dla przesuwania sfery
          dragStartIntersectRef.current = intersection.clone();
          dragStartShapeValueRef.current = [...hoveredShape.center!];
        }
        return;
      }

      const result = handleSpherePointerDown({
        editingShapeId,
        placingSphereId,
        hoveredId: getHoveredShapeId(raycaster, camera, pointer, shapes),
        hoveredShape: shapes.find(
          (s) => s.id === getHoveredShapeId(raycaster, camera, pointer, shapes),
        ),
        faceHit: getFaceHit(raycaster, camera, pointer, shapes),
        rawPoint: getDrawingPoint(raycaster, camera, pointer, virtualPlane),
        isSnapEnabled,
        getSnappedPosition: (p) => getSnappedPosition(p, shapes),
      });

      switch (result.action) {
        case "CLOSE_PANEL":
          setEditingShapeId(null);
          return;
        case "COMMIT":
          onShapesCommit();
          setPlacingSphereId(null);
          setSphereStartPoint(null);
          setMouseDownPos(null);
          setHasMoved(false);
          return;
        case "EDIT":
          setEditingShapeId(result.shapeId!);
          return;
        case "CREATE":
          if (result.newSphere && result.point) {
            onShapeAdd(result.newSphere);
            setPlacingSphereId(result.newSphere.id);
            setSphereStartPoint(result.point);
            setMouseDownPos({ x: pointer.x, y: pointer.y });
            setHasMoved(false);
          }
          return;
        case "NONE":
          return;
      }
    }

    if (mode === "EXTRUDE") {
      if (activeExtrudeId) {
        onShapesCommit();
        setActiveExtrudeId(null);
        setExtrudeStartY(null);
        setHoveredShapeId(null);
        setHeightSnapY(null);
        setMouseDownPos(null);
        setHasMoved(false);
        lastSnapRef.current = null;
        setDragMode(null);
      } else {
        const targetId = getHoveredShapeId(raycaster, camera, pointer, shapes);
        if (targetId) {
          const targetShape = shapes.find((s) => s.id === targetId);
          if (targetShape) {
            setMouseDownPos({ x: pointer.x, y: pointer.y });
            setHasMoved(false);

            raycaster.setFromCamera(pointer, camera);
            const { boxArgs, center } = getShapeBoxParams(targetShape);
            const box = new THREE.Box3().setFromCenterAndSize(
              new THREE.Vector3(center.x, center.y, center.z),
              new THREE.Vector3(boxArgs[0], boxArgs[1], boxArgs[2]),
            );

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectBox(box, intersection)) {
              lastSnapRef.current = intersection.clone();
              // POPRAWIONE: Inicjalizacja refów dla przesuwania/edycji boków
              dragStartIntersectRef.current = intersection.clone();
              if (targetShape.type === "sphere") {
                dragStartShapeValueRef.current = [...targetShape.center!];
              } else {
                dragStartShapeValueRef.current = targetShape.points.map((p) => [
                  ...p,
                ]);
              }

              const epsilon = 0.15;
              const relativeP = intersection
                .clone()
                .sub(new THREE.Vector3(center.x, center.y, center.z));
              const halfW = boxArgs[0] / 2;
              const halfH = boxArgs[1] / 2;
              const halfD = boxArgs[2] / 2;

              const isHitY = Math.abs(Math.abs(relativeP.y) - halfH) < epsilon;
              const isHitX = Math.abs(Math.abs(relativeP.x) - halfW) < epsilon;
              const isHitZ = Math.abs(Math.abs(relativeP.z) - halfD) < epsilon;

              let detectedMode: DragMode = null;
              let detectedDir = 0;

              if (targetShape.type === "sphere") {
                detectedMode = "HEIGHT";
              } else if (Math.abs(targetShape.height) < 0.05) {
                detectedMode = "HEIGHT";
              } else {
                const orient = targetShape.orientation || "xz";
                if (orient === "xz") {
                  if (isHitY) detectedMode = "HEIGHT";
                  else if (isHitX) {
                    detectedMode = "SIDE_X";
                    detectedDir = Math.sign(relativeP.x);
                  } else if (isHitZ) {
                    detectedMode = "SIDE_Z";
                    detectedDir = Math.sign(relativeP.z);
                  }
                } else if (orient === "xy") {
                  if (isHitZ) detectedMode = "HEIGHT";
                  else if (isHitX) {
                    detectedMode = "SIDE_X";
                    detectedDir = Math.sign(relativeP.x);
                  }
                } else if (orient === "yz") {
                  if (isHitX) detectedMode = "HEIGHT";
                  else if (isHitZ) {
                    detectedMode = "SIDE_Z";
                    detectedDir = Math.sign(relativeP.z);
                  }
                }
              }
              if (!detectedMode) detectedMode = "HEIGHT";
              setDragMode(detectedMode);
              setDragDirection(detectedDir);
            }

            if (!editingShapeId) {
              setActiveExtrudeId(targetId);
              setExtrudeStartY(pointer.y);
              if (targetShape.type === "sphere") {
                setInitialShapeHeight(targetShape.radius || 10);
              } else {
                setInitialShapeHeight(targetShape.height || 0);
              }
            }
          }
        } else {
          setEditingShapeId(null);
          lastSnapRef.current = null;
        }
      }
      return;
    }

    if (mode === "DRAW_RECT" || mode === "CALIBRATE") {
      if (!startPoint) {
        if (mode === "DRAW_RECT") {
          const faceHit = getFaceHit(raycaster, camera, pointer, shapes);
          if (faceHit) {
            setDrawingFace(faceHit);
            const finalPoint = isSnapEnabled
              ? getSnappedPosition(faceHit.point, shapes).point
              : faceHit.point.clone();
            setStartPoint(finalPoint);
            setSnappedPoint(finalPoint);
            return;
          }
        }
        if (!snappedPoint) return;
        setDrawingFace(null);
        setStartPoint(snappedPoint);
      } else {
        const endPoint = snappedPoint || currentPoint;
        if (!endPoint) return;

        if (mode === "DRAW_RECT") {
          const p1 = startPoint;
          const p2 = endPoint;
          if (p1.distanceTo(p2) > 0.1) {
            let newShape: DrawnShape;
            const commonProps = {
              id: Math.random().toString(36),
              type: "rect" as const,
              height: 0,
            };

            if (drawingFace) {
              const { orientation, parentId, faceOffset, faceDirection } =
                drawingFace;
              if (orientation === "xz") {
                newShape = {
                  ...commonProps,
                  points: [
                    [p1.x, 0, p1.z],
                    [p2.x, 0, p1.z],
                    [p2.x, 0, p2.z],
                    [p1.x, 0, p2.z],
                  ],
                  baseY: faceOffset,
                  parentId,
                  orientation: "xz",
                  faceDirection,
                };
              } else if (orientation === "xy") {
                newShape = {
                  ...commonProps,
                  points: [
                    [p1.x, p1.y, 0],
                    [p2.x, p1.y, 0],
                    [p2.x, p2.y, 0],
                    [p1.x, p2.y, 0],
                  ],
                  baseY: 0,
                  parentId,
                  orientation: "xy",
                  faceOffset,
                  faceDirection,
                };
              } else {
                newShape = {
                  ...commonProps,
                  points: [
                    [0, p1.y, p1.z],
                    [0, p1.y, p2.z],
                    [0, p2.y, p2.z],
                    [0, p2.y, p1.z],
                  ],
                  baseY: 0,
                  parentId,
                  orientation: "yz",
                  faceOffset,
                  faceDirection,
                };
              }
              onShapeAdd(newShape);
            } else {
              onShapeAdd({
                ...commonProps,
                points: [
                  [p1.x, 0, p1.z],
                  [p2.x, 0, p1.z],
                  [p2.x, 0, p2.z],
                  [p1.x, 0, p2.z],
                ],
                baseY: 0,
              });
            }
          }
        } else if (mode === "CALIBRATE") {
          const dist = startPoint.distanceTo(endPoint);
          if (dist > 0) onCalibrate(dist);
        }
        setStartPoint(null);
        setCurrentPoint(null);
        setDrawingFace(null);
        lastSnapRef.current = null;
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (mode === "PLACE_SPHERE") {
      if (editingShapeId && hasMoved && !placingSphereId) {
        onShapesCommit();
        setMouseDownPos(null);
        setHasMoved(false);
        return;
      }

      const result = handleSpherePointerUp({
        placingSphereId,
        hasMoved,
      });

      switch (result.action) {
        case "COMMIT":
          onShapesCommit();
          setPlacingSphereId(null);
          setSphereStartPoint(null);
          break;
        case "OPEN_EDIT_PANEL":
          setEditingShapeId(result.shapeId!);
          setPlacingSphereId(null);
          setSphereStartPoint(null);
          break;
      }
      setMouseDownPos(null);
      setHasMoved(false);
      return;
    }

    if (mode !== "EXTRUDE") return;
    if (e.button !== 0) return;

    if (mouseDownPos && hasMoved) onShapesCommit();
    if (activeExtrudeId && mouseDownPos && !hasMoved)
      setEditingShapeId(activeExtrudeId);

    setActiveExtrudeId(null);
    setExtrudeStartY(null);
    setHoveredShapeId(null);
    setHeightSnapY(null);
    setMouseDownPos(null);
    setHasMoved(false);
    lastSnapRef.current = null;
    setDragMode(null);
  };

  return (
    <InteractionOverlays
      mode={mode}
      snappedPoint={snappedPoint}
      isSnapEnabled={isSnapEnabled}
      heightSnapY={heightSnapY}
      startPoint={startPoint}
      currentPoint={currentPoint}
      drawingFace={drawingFace}
      invisiblePlaneGeo={invisiblePlaneGeo}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  );
}
