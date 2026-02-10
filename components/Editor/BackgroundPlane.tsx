"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { BackgroundImageData } from "./types";
import { DrawnShape } from "./types";

interface BackgroundPlaneProps {
  data: BackgroundImageData;
  shapes: DrawnShape[];
}

export default function BackgroundPlane({
  data,
  shapes,
}: BackgroundPlaneProps) {
  const texture = useLoader(THREE.TextureLoader, data.url);

  const clippedGeometry = useMemo(() => {
    const baseGeo = new THREE.PlaneGeometry(data.width, data.height);
    baseGeo.rotateX(-Math.PI / 2);

    const holes = shapes.filter((s) => s.height < 0);

    if (holes.length === 0) {
      return baseGeo;
    }

    const evaluator = new Evaluator();
    let resultBrush = new Brush(baseGeo);

    for (const hole of holes) {
      const x1 = hole.points[0][0];
      const z1 = hole.points[0][2];
      const x2 = hole.points[2][0];
      const z2 = hole.points[2][2];

      const width = Math.abs(x1 - x2);
      const depth = Math.abs(z1 - z2);
      const centerX = (x1 + x2) / 2;
      const centerZ = (z1 + z2) / 2;

      const holeGeo = new THREE.BoxGeometry(width, 10, depth);
      const holeBrush = new Brush(holeGeo);
      holeBrush.position.set(centerX, 0, centerZ);
      holeBrush.updateMatrixWorld();

      resultBrush.updateMatrixWorld();
      resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    }

    return resultBrush.geometry;
  }, [data.width, data.height, shapes]);

  return (
    <mesh position={[0, -0.2, 0]} renderOrder={-1} geometry={clippedGeometry}>
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
