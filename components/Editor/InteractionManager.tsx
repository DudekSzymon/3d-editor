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
  // NOWE PROPSY DO OBSŁUGI HISTORII I PŁYNNOŚCI
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

  // UWAGA: Usunęliśmy lokalny extrudeShapeId, teraz używamy activeExtrudeId z propsów
  const [extrudeStartY, setExtrudeStartY] = useState<number | null>(null);
  const [initialShapeHeight, setInitialShapeHeight] = useState<number>(0);
  const [mouseDownPos, setMouseDownPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [heightSnapY, setHeightSnapY] = useState<number | null>(null);

  // === NAPRAWA "WISZĄCYCH" LINII (ESC / ZMIANA TRYBU) ===
  useEffect(() => {
    setStartPoint(null);
    setCurrentPoint(null);
    setSnappedPoint(null);
    setDrawingFace(null);
    setActiveExtrudeId(null);
    setHeightSnapY(null);
    setMouseDownPos(null);
    setHasMoved(false);
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
    }

    const hits: HitInfo[] = [];

    for (const shape of shapes) {
      const { boxArgs, center } = getShapeBoxParams(shape);
      const halfW = boxArgs[0] / 2;
      const halfH = boxArgs[1] / 2;
      const halfD = boxArgs[2] / 2;

      const flatEps = Math.abs(shape.height) < 0.1 ? 3.0 : 0;

      const box = new THREE.Box3(
        new THREE.Vector3(
          center.x - halfW - flatEps,
          center.y - halfH - flatEps,
          center.z - halfD - flatEps,
        ),
        new THREE.Vector3(
          center.x + halfW + flatEps,
          center.y + halfH + flatEps,
          center.z + halfD + flatEps,
        ),
      );

      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersection)) {
        hits.push({
          id: shape.id,
          dist: intersection.distanceTo(raycaster.ray.origin),
          isChild: !!shape.parentId,
        });
      }
    }

    if (hits.length === 0) return null;

    hits.sort((a, b) => a.dist - b.dist);

    const closest = hits[0];

    if (!closest.isChild) {
      const nearbyChild = hits.find(
        (h) => h.isChild && Math.abs(h.dist - closest.dist) < 5.0,
      );
      if (nearbyChild) return nearbyChild.id;
    }

    return closest.id;
  }, [shapes, camera, raycaster, pointer]);

  const getFaceHit = useCallback(() => {
    raycaster.setFromCamera(pointer, camera);

    let closestDist = Infinity;
    let closestHit: DrawingFaceState | null = null;
    let closestPoint: THREE.Vector3 | null = null;

    for (const shape of shapes) {
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

    if (mode === "EXTRUDE" && activeExtrudeId && extrudeStartY !== null) {
      const deltaY = (pointer.y - extrudeStartY) * 120;
      let newHeight = initialShapeHeight + deltaY;

      const snapThreshold = 1.0;
      let snappedH: number | null = null;

      for (const shape of shapes) {
        if (shape.id === activeExtrudeId) continue;
        const h = shape.height || 0;
        if (Math.abs(h) < 0.1) continue;
        if (Math.abs(newHeight - h) < snapThreshold) {
          newHeight = h;
          snappedH = h;
          break;
        }
      }
      if (snappedH === null && Math.abs(newHeight) < snapThreshold) {
        newHeight = 0;
        snappedH = 0;
      }
      setHeightSnapY(snappedH);
      onShapeUpdate(activeExtrudeId, { height: newHeight });
      return;
    }

    if (mode === "EXTRUDE" && !activeExtrudeId && !editingShapeId) {
      setHoveredShapeId(getHoveredShapeId3D());
      return;
    }

    if (mode === "VIEW") return;

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

    if (mode === "EXTRUDE") {
      if (activeExtrudeId) {
        onShapesCommit(); // ZAPISUJEMY HISTORIĘ PO KLIKNIĘCIU KOŃCZĄCYM
        setActiveExtrudeId(null);
        setExtrudeStartY(null);
        setHoveredShapeId(null);
        setHeightSnapY(null);
        setMouseDownPos(null);
        setHasMoved(false);
      } else if (!editingShapeId) {
        const targetId = getHoveredShapeId3D();
        if (targetId) {
          const targetShape = shapes.find((s) => s.id === targetId);
          if (targetShape) {
            setMouseDownPos({ x: pointer.x, y: pointer.y });
            setHasMoved(false);
            setActiveExtrudeId(targetId);
            setExtrudeStartY(pointer.y);
            setInitialShapeHeight(targetShape.height || 0);
          }
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
    if (mode !== "EXTRUDE") return;
    if (e.button !== 0) return;

    if (activeExtrudeId && mouseDownPos) {
      if (!hasMoved) {
        setEditingShapeId(activeExtrudeId);
      } else {
        onShapesCommit(); // ZAPISUJEMY HISTORIĘ PO PRZECIĄGANIU MYSZKĄ
      }
      setActiveExtrudeId(null);
      setExtrudeStartY(null);
      setHoveredShapeId(null);
      setHeightSnapY(null);
    }
    setMouseDownPos(null);
    setHasMoved(false);
  };

  // Logika previewPoints pozostaje taka sama
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
