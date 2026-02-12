"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  EditorMode,
  DrawnShape,
  ShapeOrientation,
  getShapeBoxParams,
} from "./types";
import {
  handleSpherePointerDown,
  handleSpherePointerUp,
  calculateNewRadius,
} from "./sphereHandlers";

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

interface DrawingFaceState {
  parentId: string;
  orientation: ShapeOrientation;
  faceOffset: number;
  faceDirection: number;
  plane: THREE.Plane;
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

  // STANY: Co ciągniemy i w którą stronę (+1/-1)
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragDirection, setDragDirection] = useState<number>(0);

  // Stany dla umieszczania sfery
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

  const getRootId = useCallback(
    (shape: DrawnShape): string => {
      if (!shape.parentId) return shape.id;
      const parent = shapes.find((s) => s.id === shape.parentId);
      return parent ? getRootId(parent) : shape.id;
    },
    [shapes],
  );

  const getHoveredShapeId3D = useCallback(() => {
    raycaster.setFromCamera(pointer, camera);

    interface HitInfo {
      id: string;
      dist: number;
      isChild: boolean;
      area: number;
    }

    const hits: HitInfo[] = [];

    for (const shape of shapes) {
      const { boxArgs, center } = getShapeBoxParams(shape);
      const isHole = !!shape.parentId;
      const hMargin = isHole ? 1.0 : 0.5;
      const vMargin = 0.5;

      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(center.x, center.y, center.z),
        new THREE.Vector3(
          boxArgs[0] + hMargin,
          boxArgs[1] + (isHole ? vMargin : 0.5),
          boxArgs[2] + hMargin,
        ),
      );

      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersection)) {
        hits.push({
          id: shape.id,
          dist: intersection.distanceTo(raycaster.ray.origin),
          isChild: isHole,
          area: boxArgs[0] * boxArgs[2],
        });
      }
    }

    if (hits.length === 0) return null;
    hits.sort((a, b) => {
      if (Math.abs(a.dist - b.dist) < 1) {
        if (a.isChild !== b.isChild) return a.isChild ? -1 : 1;
        return a.area - b.area;
      }
      return a.dist - b.dist;
    });

    return hits[0].id;
  }, [shapes, camera, raycaster, pointer]);

  const getFaceHit = useCallback(() => {
    raycaster.setFromCamera(pointer, camera);

    let closestDist = Infinity;
    let closestHit: DrawingFaceState | null = null;
    let closestPoint: THREE.Vector3 | null = null;

    for (const shape of shapes) {
      // Pomijamy sfery - tylko prostokąty z wysokością
      if (shape.type === "sphere") continue;
      if (!shape.height || Math.abs(shape.height) < 0.01) continue;

      const { boxArgs, center } = getShapeBoxParams(shape);
      const halfW = boxArgs[0] / 2;
      const halfH = boxArgs[1] / 2;
      const halfD = boxArgs[2] / 2;

      const box = new THREE.Box3(
        new THREE.Vector3(center.x - halfW, center.y - halfH, center.z - halfD),
        new THREE.Vector3(center.x + halfW, center.y + halfH, center.z + halfD),
      );

      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectBox(box, intersection)) continue;

      const dist = intersection.distanceTo(raycaster.ray.origin);
      if (dist >= closestDist) continue;

      const faces: {
        face: string;
        d: number;
        orient: ShapeOrientation;
        offset: number;
        dir: number;
      }[] = [
        {
          face: "top",
          d: Math.abs(intersection.y - box.max.y),
          orient: "xz",
          offset: box.max.y,
          dir: 1,
        },
        {
          face: "bottom",
          d: Math.abs(intersection.y - box.min.y),
          orient: "xz",
          offset: box.min.y,
          dir: -1,
        },
        {
          face: "front",
          d: Math.abs(intersection.z - box.max.z),
          orient: "xy",
          offset: box.max.z,
          dir: 1,
        },
        {
          face: "back",
          d: Math.abs(intersection.z - box.min.z),
          orient: "xy",
          offset: box.min.z,
          dir: -1,
        },
        {
          face: "right",
          d: Math.abs(intersection.x - box.max.x),
          orient: "yz",
          offset: box.max.x,
          dir: 1,
        },
        {
          face: "left",
          d: Math.abs(intersection.x - box.min.x),
          orient: "yz",
          offset: box.min.x,
          dir: -1,
        },
      ];

      faces.sort((a, b) => a.d - b.d);
      const bestFace = faces[0];

      let plane: THREE.Plane;
      if (bestFace.orient === "xz") {
        plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bestFace.offset);
      } else if (bestFace.orient === "xy") {
        plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -bestFace.offset);
      } else {
        plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -bestFace.offset);
      }

      closestDist = dist;
      closestPoint = intersection.clone();
      closestHit = {
        parentId: shape.id,
        orientation: bestFace.orient,
        faceOffset: bestFace.offset,
        faceDirection: bestFace.dir,
        plane,
      };
    }

    return closestHit ? { ...closestHit, point: closestPoint! } : null;
  }, [shapes, camera, raycaster, pointer, getRootId]);

  const getSnappedPosition = (rawPoint: THREE.Vector3) => {
    let closestDist = Infinity;
    let closestPt = rawPoint.clone();
    const snapThreshold = 15;

    if (rawPoint.distanceTo(new THREE.Vector3(0, 0, 0)) < snapThreshold) {
      return { point: new THREE.Vector3(0, 0, 0), isSnapped: true };
    }

    for (const shape of shapes) {
      if (shape.type === "sphere") {
        // Dla sfer sprawdzamy środek
        const center = shape.center || [0, 0, 0];
        const centerPt = new THREE.Vector3(center[0], center[1], center[2]);
        const dist = centerPt.distanceTo(rawPoint);
        if (dist < snapThreshold && dist < closestDist) {
          closestDist = dist;
          closestPt = centerPt;
        }
        continue;
      }

      for (const ptArr of shape.points) {
        const orient = shape.orientation || "xz";
        let pt: THREE.Vector3;

        if (orient === "xz")
          pt = new THREE.Vector3(ptArr[0], shape.baseY || 0, ptArr[2]);
        else if (orient === "xy")
          pt = new THREE.Vector3(ptArr[0], ptArr[1], shape.faceOffset || 0);
        else pt = new THREE.Vector3(shape.faceOffset || 0, ptArr[1], ptArr[2]);

        const dist = pt.distanceTo(rawPoint);
        if (dist < snapThreshold && dist < closestDist) {
          closestDist = dist;
          closestPt = pt.clone();
        }

        if (shape.height && Math.abs(shape.height) > 0.1) {
          const topPt = pt.clone();
          if (orient === "xz") topPt.y += shape.height;
          else if (orient === "xy") topPt.z += shape.height;
          else topPt.x += shape.height;

          const topDist = topPt.distanceTo(rawPoint);
          if (topDist < snapThreshold && topDist < closestDist) {
            closestDist = topDist;
            closestPt = topPt;
          }
        }
      }
    }
    return { point: closestPt, isSnapped: closestDist < snapThreshold };
  };

  const getDrawingPoint = (): THREE.Vector3 | null => {
    raycaster.setFromCamera(pointer, camera);
    const target = new THREE.Vector3();
    const plane = drawingFace ? drawingFace.plane : virtualPlane;
    return raycaster.ray.intersectPlane(plane, target) ? target : null;
  };

  const handlePointerMove = () => {
    if (mouseDownPos && !hasMoved) {
      const deltaX = Math.abs(pointer.x - mouseDownPos.x);
      const deltaY = Math.abs(pointer.y - mouseDownPos.y);
      if (deltaX > 0.01 || deltaY > 0.01) setHasMoved(true);
    }

    // PLACE_SPHERE: podczas przeciągania zmieniamy promień (logika w sphereHandlers.ts)
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

    if (
      mode === "EXTRUDE" &&
      editingShapeId &&
      mouseDownPos &&
      hasMoved &&
      !activeExtrudeId
    ) {
      const shape = shapes.find((s) => s.id === editingShapeId);
      if (shape && lastSnapRef.current) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(
          cameraDirection,
          lastSnapRef.current,
        );

        raycaster.setFromCamera(pointer, camera);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const delta = intersection.clone().sub(lastSnapRef.current);

          if (delta.length() > 0.01) {
            if (shape.type === "sphere") {
              // Przesuwanie sfery
              const newCenter: [number, number, number] = [
                shape.center![0] + delta.x,
                shape.center![1] + delta.y,
                shape.center![2] + delta.z,
              ];
              onShapeUpdate(editingShapeId, { center: newCenter });
            } else {
              // Przesuwanie prostokąta
              const newPoints = shape.points.map((p) => [
                p[0] + delta.x,
                p[1] + delta.y,
                p[2] + delta.z,
              ]);
              onShapeUpdate(editingShapeId, {
                points: newPoints as [number, number, number][],
              });
            }

            lastSnapRef.current = intersection.clone();
          }
        }
        return;
      }
    }

    if (mode === "EXTRUDE" && activeExtrudeId && hasMoved) {
      if (dragMode === "HEIGHT" && extrudeStartY !== null) {
        const shape = shapes.find((s) => s.id === activeExtrudeId);
        if (!shape) return;

        const deltaY = (pointer.y - extrudeStartY) * 150;
        let newValue = initialShapeHeight + deltaY;

        // Dla sfer - edytujemy promień (minimum 1mm)
        if (shape.type === "sphere") {
          newValue = Math.max(1, newValue);
          onShapeUpdate(activeExtrudeId, { radius: newValue });
          return;
        }

        // Dla prostokątów - edytujemy height ze snapowaniem
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

      if (
        (dragMode === "SIDE_X" || dragMode === "SIDE_Z") &&
        lastSnapRef.current
      ) {
        const shape = shapes.find((s) => s.id === activeExtrudeId);
        if (!shape) return;

        const dragPlane = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -lastSnapRef.current.y,
        );
        raycaster.setFromCamera(pointer, camera);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          const delta = intersection.clone().sub(lastSnapRef.current);

          if (delta.length() < 0.001) return;

          const { center } = getShapeBoxParams(shape);
          const newPoints = shape.points.map((p) => [...p]) as [
            number,
            number,
            number,
          ][];

          newPoints.forEach((p) => {
            if (dragMode === "SIDE_X") {
              const isTargetSide =
                dragDirection > 0
                  ? p[0] > center.x - 0.1
                  : p[0] < center.x + 0.1;

              if (isTargetSide) {
                p[0] += delta.x * 1.5;
              }
            } else if (dragMode === "SIDE_Z") {
              const isTargetSide =
                dragDirection > 0
                  ? p[2] > center.z - 0.1
                  : p[2] < center.z + 0.1;

              if (isTargetSide) {
                p[2] += delta.z;
              }
            }
          });

          onShapeUpdate(activeExtrudeId, { points: newPoints });
          lastSnapRef.current = intersection;
        }
        return;
      }
    }

    if (mode === "EXTRUDE" && !activeExtrudeId && !editingShapeId) {
      setHoveredShapeId(getHoveredShapeId3D());
      return;
    }

    if (mode === "VIEW") return;

    // PLACE_SPHERE: pokazujemy podgląd pozycji
    if (mode === "PLACE_SPHERE" && !placingSphereId) {
      const rawPoint = getDrawingPoint();
      if (!rawPoint) return;

      const finalPoint = isSnapEnabled
        ? getSnappedPosition(rawPoint).point
        : rawPoint.clone();

      if (!lastSnapRef.current || !finalPoint.equals(lastSnapRef.current)) {
        lastSnapRef.current = finalPoint;
        setSnappedPoint(finalPoint);
        setCurrentPoint(finalPoint);
      }
      return;
    }

    const rawPoint = getDrawingPoint();
    if (!rawPoint) return;

    const finalPoint = isSnapEnabled
      ? getSnappedPosition(rawPoint).point
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

    // PLACE_SPHERE: umieszczanie nowej sfery (logika w sphereHandlers.ts)
    if (mode === "PLACE_SPHERE") {
      const result = handleSpherePointerDown({
        editingShapeId,
        placingSphereId,
        hoveredId: getHoveredShapeId3D(),
        hoveredShape: shapes.find((s) => s.id === getHoveredShapeId3D()),
        faceHit: getFaceHit(),
        rawPoint: getDrawingPoint(),
        isSnapEnabled,
        getSnappedPosition,
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
        const targetId = getHoveredShapeId3D();

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
                // Dla sfery zawsze HEIGHT (zmiana promienia)
                detectedMode = "HEIGHT";
              } else if (Math.abs(targetShape.height) < 0.05) {
                detectedMode = "HEIGHT";
              } else {
                const orient = targetShape.orientation || "xz";

                if (orient === "xz") {
                  if (isHitY) {
                    detectedMode = "HEIGHT";
                  } else if (isHitX) {
                    detectedMode = "SIDE_X";
                    detectedDir = Math.sign(relativeP.x);
                  } else if (isHitZ) {
                    detectedMode = "SIDE_Z";
                    detectedDir = Math.sign(relativeP.z);
                  }
                } else if (orient === "xy") {
                  if (isHitZ) {
                    detectedMode = "HEIGHT";
                  } else if (isHitX) {
                    detectedMode = "SIDE_X";
                    detectedDir = Math.sign(relativeP.x);
                  }
                } else if (orient === "yz") {
                  if (isHitX) {
                    detectedMode = "HEIGHT";
                  } else if (isHitZ) {
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
          const faceHit = getFaceHit();
          if (faceHit) {
            setDrawingFace({
              parentId: faceHit.parentId,
              orientation: faceHit.orientation,
              faceOffset: faceHit.faceOffset,
              faceDirection: faceHit.faceDirection,
              plane: faceHit.plane,
            });
            const finalPoint = isSnapEnabled
              ? getSnappedPosition(faceHit.point).point
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
            if (drawingFace) {
              const { orientation, parentId, faceOffset, faceDirection } =
                drawingFace;
              if (orientation === "xz") {
                newShape = {
                  id: Math.random().toString(36),
                  type: "rect",
                  points: [
                    [p1.x, 0, p1.z],
                    [p2.x, 0, p1.z],
                    [p2.x, 0, p2.z],
                    [p1.x, 0, p2.z],
                  ],
                  height: 0,
                  baseY: faceOffset,
                  parentId,
                  orientation: "xz",
                  faceDirection,
                };
              } else if (orientation === "xy") {
                newShape = {
                  id: Math.random().toString(36),
                  type: "rect",
                  points: [
                    [p1.x, p1.y, 0],
                    [p2.x, p1.y, 0],
                    [p2.x, p2.y, 0],
                    [p1.x, p2.y, 0],
                  ],
                  height: 0,
                  baseY: 0,
                  parentId,
                  orientation: "xy",
                  faceOffset,
                  faceDirection,
                };
              } else {
                newShape = {
                  id: Math.random().toString(36),
                  type: "rect",
                  points: [
                    [0, p1.y, p1.z],
                    [0, p1.y, p2.z],
                    [0, p2.y, p2.z],
                    [0, p2.y, p1.z],
                  ],
                  height: 0,
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
                id: Math.random().toString(36),
                type: "rect",
                points: [
                  [p1.x, 0, p1.z],
                  [p2.x, 0, p1.z],
                  [p2.x, 0, p2.z],
                  [p1.x, 0, p2.z],
                ],
                height: 0,
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

    if (mouseDownPos && hasMoved) {
      onShapesCommit();
    }

    if (activeExtrudeId && mouseDownPos && !hasMoved) {
      setEditingShapeId(activeExtrudeId);
    }

    setActiveExtrudeId(null);
    setExtrudeStartY(null);
    setHoveredShapeId(null);
    setHeightSnapY(null);
    setMouseDownPos(null);
    setHasMoved(false);
    lastSnapRef.current = null;
    setDragMode(null);
  };

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

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
        geometry={invisiblePlaneGeo}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <meshBasicMaterial />
      </mesh>
      {mode !== "VIEW" &&
        mode !== "EXTRUDE" &&
        snappedPoint &&
        isSnapEnabled && (
          <mesh position={snappedPoint}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="magenta" toneMapped={false} />
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
      {previewPoints && (
        <Line
          points={previewPoints}
          color={drawingFace ? "#ff4444" : "black"}
          lineWidth={3}
        />
      )}
      {startPoint && currentPoint && mode === "CALIBRATE" && (
        <Line
          points={[startPoint, currentPoint]}
          color="magenta"
          lineWidth={2}
          dashed={true}
          dashScale={5}
        />
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
