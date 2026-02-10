"use client";

import { Line } from "@react-three/drei";

export default function Axes() {
  const length = 10000;
  const mainLineWidth = 4;
  const dashedLineWidth = 2;
  const dashProps = { dashed: true, dashScale: 1, dashSize: 60, gapSize: 30 };

  return (
    <group>
      {/* Oś X (Czerwona) */}
      <Line
        points={[
          [0, 0, 0],
          [length, 0, 0],
        ]}
        color="#ff0000"
        lineWidth={mainLineWidth}
      />
      <group rotation={[0, Math.PI, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [length, 0, 0],
          ]}
          color="#ff0000"
          lineWidth={dashedLineWidth}
          {...dashProps}
        />
      </group>

      {/* Oś Y (Zielona - głębia) */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -length],
        ]}
        color="#00ff00"
        lineWidth={mainLineWidth}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, 0, length],
        ]}
        color="#00ff00"
        lineWidth={dashedLineWidth}
        {...dashProps}
      />

      {/* Oś Z (Niebieska - wysokość) */}
      <Line
        points={[
          [0, 0, 0],
          [0, length, 0],
        ]}
        color="#0000ff"
        lineWidth={mainLineWidth}
      />
      <group rotation={[Math.PI, 0, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [0, length, 0],
          ]}
          color="#0000ff"
          lineWidth={dashedLineWidth}
          {...dashProps}
        />
      </group>
    </group>
  );
}
