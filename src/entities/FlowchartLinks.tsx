import { useMemo } from 'react';
import { useFlowchartStore, PortType } from '../shared/utils/store';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import themes from '../shared/themes/color_palettes.json';

const getPortPosition = (shape: any, port?: PortType): [number, number, number] => {
  const [x, y] = shape.position;
  if (!port) return [x, y, 0];
  
  const [w, h] = shape.size;
  const rotation = shape.rotation || 0;
  
  let localX = 0;
  let localY = 0;
  
  switch (port) {
    case 'top': localY = h / 2; break;
    case 'bottom': localY = -h / 2; break;
    case 'left': localX = -w / 2; break;
    case 'right': localX = w / 2; break;
  }
  
  // Rotate local coordinates
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;
  
  return [x + rotatedX, y + rotatedY, 0];
};

const getBezierPoints = (
  start: [number, number, number], 
  end: [number, number, number], 
  startPort?: PortType, 
  endPort?: PortType,
  startRotation: number = 0,
  endRotation: number = 0
) => {
  const getOffset = (port?: PortType, rotation: number = 0) => {
    if (!port) return [0, 0];
    let ox = 0;
    let oy = 0;
    switch (port) {
      case 'top': oy = 10; break;
      case 'bottom': oy = -10; break;
      case 'left': ox = -10; break;
      case 'right': ox = 10; break;
    }
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [ox * cos - oy * sin, ox * sin + oy * cos];
  };

  const startOffset = getOffset(startPort, startRotation);
  const endOffset = getOffset(endPort, endRotation);

  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(start[0] + startOffset[0], start[1] + startOffset[1], 0),
    new THREE.Vector3(end[0] + endOffset[0], end[1] + endOffset[1], 0),
    new THREE.Vector3(...end)
  );
  return curve.getPoints(50);
};

export const FlowchartLinks = () => {
  const links = useFlowchartStore(state => state.links);
  const shapes = useFlowchartStore(state => state.shapes);
  const linkingFrom = useFlowchartStore(state => state.linkingFrom);
  const linkingTo = useFlowchartStore(state => state.linkingTo);
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = (themes as any)[themeName];

  // Create a map for O(1) shape lookups
  const shapeMap = useMemo(() => {
    const map = new Map();
    shapes.forEach(s => map.set(s.id, s));
    return map;
  }, [shapes]);

  return (
    <group>
      {links.map((link) => {
        const fromShape = shapeMap.get(link.from);
        const toShape = shapeMap.get(link.to);

        if (!fromShape || !toShape) return null;

        const start = getPortPosition(fromShape, link.fromPort);
        const end = getPortPosition(toShape, link.toPort);
        const points = getBezierPoints(
          start, 
          end, 
          link.fromPort, 
          link.toPort,
          fromShape.rotation || 0,
          toShape.rotation || 0
        );

        return (
          <Line
            key={link.id}
            points={points}
            color={currentTheme.mode === 'dark' ? currentTheme.neutral_light : currentTheme.neutral_dark}
            lineWidth={2.5}
            transparent
            opacity={0.9}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}

      {linkingFrom && linkingTo && (
        <Line
          points={getBezierPoints(
            getPortPosition(shapes.find(s => s.id === linkingFrom.id), linkingFrom.port),
            [linkingTo[0], linkingTo[1], 0],
            linkingFrom.port,
            undefined,
            shapes.find(s => s.id === linkingFrom.id)?.rotation || 0
          )}
          color={currentTheme.mode === 'dark' ? currentTheme.neutral_light : currentTheme.neutral_dark}
          lineWidth={1.5}
          dashed
          transparent
          opacity={0.5}
        />
      )}
    </group>
  );
};
