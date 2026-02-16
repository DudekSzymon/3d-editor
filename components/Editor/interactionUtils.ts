import * as THREE from "three";
import { DrawnShape, ShapeOrientation, getShapeBoxParams } from "./types";

export interface DrawingFaceState {
  parentId: string;
  orientation: ShapeOrientation;
  faceOffset: number;
  faceDirection: number;
  plane: THREE.Plane;
  point: THREE.Vector3;
}

/**
 * Znajduje ID kształtu, nad którym jest kursor
 */
export const getHoveredShapeId = (
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  pointer: THREE.Vector2,
  shapes: DrawnShape[],
): string | null => {
  raycaster.setFromCamera(pointer, camera);

  interface HitInfo {
    id: string;
    dist: number;
    isChild: boolean;
    area: number;
  }

  const hits: HitInfo[] = [];

  for (const shape of shapes) {
    if (shape.type === "measurement") continue;

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
};

/**
 * Znajduje ID wymiaru (measurement), na który kliknięto.
 * Sprawdza odległość promienia kamery od odcinka wymiaru + od endpointów.
 */
export const getClickedMeasurementId = (
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  pointer: THREE.Vector2,
  shapes: DrawnShape[],
  clickThreshold: number = 8,
): string | null => {
  raycaster.setFromCamera(pointer, camera);

  const measurements = shapes.filter(
    (s) => s.type === "measurement" && s.visible,
  );
  if (measurements.length === 0) return null;

  let closestId: string | null = null;
  let closestDist = Infinity;

  const _segStart = new THREE.Vector3();
  const _segEnd = new THREE.Vector3();

  for (const m of measurements) {
    const ms = m.measureStart || [0, 0, 0];
    const me = m.measureEnd || [0, 0, 0];
    _segStart.set(ms[0], ms[1], ms[2]);
    _segEnd.set(me[0], me[1], me[2]);

    // Odległość promienia od odcinka wymiaru
    const distSq = raycaster.ray.distanceSqToSegment(_segStart, _segEnd);
    const dist = Math.sqrt(distSq);

    if (dist < clickThreshold && dist < closestDist) {
      closestDist = dist;
      closestId = m.id;
    }

    // Endpointy — łatwiej kliknąć
    const endpointThreshold = clickThreshold * 1.5;
    const distToStart = raycaster.ray.distanceToPoint(_segStart);
    if (distToStart < endpointThreshold && distToStart < closestDist) {
      closestDist = distToStart;
      closestId = m.id;
    }
    const distToEnd = raycaster.ray.distanceToPoint(_segEnd);
    if (distToEnd < endpointThreshold && distToEnd < closestDist) {
      closestDist = distToEnd;
      closestId = m.id;
    }
  }

  return closestId;
};

export const getFaceHit = (
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  pointer: THREE.Vector2,
  shapes: DrawnShape[],
): DrawingFaceState | null => {
  raycaster.setFromCamera(pointer, camera);

  let closestDist = Infinity;
  let closestHit: Omit<DrawingFaceState, "point"> | null = null;
  let closestPoint: THREE.Vector3 | null = null;

  for (const shape of shapes) {
    // Pomijamy wymiary
    if (shape.type === "measurement") continue;

    // Pomijamy kule (sfery) — ale NIE sześciany-entity!
    if (shape.type === "sphere" && shape.entityShape !== "cube") continue;

    // Dla rect: musi mieć wysokość
    if (
      shape.type === "rect" &&
      (!shape.height || Math.abs(shape.height) < 0.01)
    )
      continue;

    // Dla cube entity: musi mieć promień (rozmiar)
    if (shape.type === "sphere" && shape.entityShape === "cube") {
      const r = shape.radius || 10;
      if (r < 0.01) continue;
    }

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

    const faces = [
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
    ] as const;

    const sortedFaces = [...faces].sort((a, b) => a.d - b.d);
    const bestFace = sortedFaces[0];

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
      orientation: bestFace.orient as ShapeOrientation,
      faceOffset: bestFace.offset,
      faceDirection: bestFace.dir,
      plane,
    };
  }

  return closestHit ? { ...closestHit, point: closestPoint! } : null;
};

export const getSnappedPosition = (
  rawPoint: THREE.Vector3,
  shapes: DrawnShape[],
) => {
  let closestDist = Infinity;
  let closestPt = rawPoint.clone();
  const snapThreshold = 15;

  if (rawPoint.distanceTo(new THREE.Vector3(0, 0, 0)) < snapThreshold) {
    return { point: new THREE.Vector3(0, 0, 0), isSnapped: true };
  }

  for (const shape of shapes) {
    if (shape.type === "sphere") {
      const center = shape.center || [0, 0, 0];
      const centerPt = new THREE.Vector3(center[0], center[1], center[2]);
      const dist = centerPt.distanceTo(rawPoint);
      if (dist < snapThreshold && dist < closestDist) {
        closestDist = dist;
        closestPt = centerPt;
      }

      // Dla sześcianów-entity: snapuj do narożników i środków ścian
      if (shape.entityShape === "cube") {
        const r = shape.radius || 10;
        const c = shape.center || [0, r, 0];
        const corners = [
          [c[0] - r, c[1] - r, c[2] - r],
          [c[0] + r, c[1] - r, c[2] - r],
          [c[0] - r, c[1] + r, c[2] - r],
          [c[0] + r, c[1] + r, c[2] - r],
          [c[0] - r, c[1] - r, c[2] + r],
          [c[0] + r, c[1] - r, c[2] + r],
          [c[0] - r, c[1] + r, c[2] + r],
          [c[0] + r, c[1] + r, c[2] + r],
        ];
        for (const corner of corners) {
          const pt = new THREE.Vector3(corner[0], corner[1], corner[2]);
          const d = pt.distanceTo(rawPoint);
          if (d < snapThreshold && d < closestDist) {
            closestDist = d;
            closestPt = pt;
          }
        }
        const faceCenters = [
          [c[0], c[1] + r, c[2]],
          [c[0], c[1] - r, c[2]],
          [c[0] + r, c[1], c[2]],
          [c[0] - r, c[1], c[2]],
          [c[0], c[1], c[2] + r],
          [c[0], c[1], c[2] - r],
        ];
        for (const fc of faceCenters) {
          const pt = new THREE.Vector3(fc[0], fc[1], fc[2]);
          const d = pt.distanceTo(rawPoint);
          if (d < snapThreshold && d < closestDist) {
            closestDist = d;
            closestPt = pt;
          }
        }
      }
      continue;
    }

    if (shape.type === "measurement") {
      const ms = shape.measureStart || [0, 0, 0];
      const me = shape.measureEnd || [0, 0, 0];
      const snapPoints = [
        new THREE.Vector3(ms[0], ms[1], ms[2]),
        new THREE.Vector3(me[0], me[1], me[2]),
      ];
      for (const sp of snapPoints) {
        const dist = sp.distanceTo(rawPoint);
        if (dist < snapThreshold && dist < closestDist) {
          closestDist = dist;
          closestPt = sp.clone();
        }
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

export const getDrawingPoint = (
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  pointer: THREE.Vector2,
  plane: THREE.Plane,
): THREE.Vector3 | null => {
  raycaster.setFromCamera(pointer, camera);
  const target = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, target) ? target : null;
};
