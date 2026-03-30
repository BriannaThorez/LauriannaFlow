import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFlowchartStore, Shape } from '../shared/utils/store';
import { getMenuOffset } from '../shared/utils/layout';
import { Text, Html } from '@react-three/drei';
import { ShapeSDFVertexShader, ShapeSDFFragmentShader } from '../shared/shaders/ShapeSDFMaterial';
import { RadialMenu } from '../components/RadialMenu';
import { RotateCw } from 'lucide-react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';

const RotateHandle = ({ shapeId, position, rotation }: { shapeId: string, position: [number, number], rotation: number }) => {
  const { setIsRotating, setDragOffset, setIsPanning } = useFlowchartStore();
  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    
    if (e.button === 2) { // Right click
      setIsPanning(true);
      return;
    }

    // For left click, we wait for move to decide if it's rotation
    // But we can set the offset now
    const dx = e.point.x - position[0];
    const dy = e.point.y - position[1];
    const startAngle = Math.atan2(dy, dx);
    setDragOffset([startAngle, rotation || 0]);
  };

  const handlePointerMove = (e: any) => {
    if (!pointerStartRef.current || e.button === 2) return;
    
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5 && !useFlowchartStore.getState().isRotating) {
      setIsRotating(true);
    }
  };

  const handlePointerUp = (e: any) => {
    setIsRotating(false);
    setIsPanning(false);
    pointerStartRef.current = null;
    e.stopPropagation();
  };

  return (
    <mesh 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible hit area - Adjusted to match the visual w-40 (160px) button size at zoom 10 */}
      <circleGeometry args={[8, 32]} />
      <meshBasicMaterial transparent opacity={0} />
      
      {/* Visual handle - matches RadialMenu trigger style */}
      <Html center transform scale={1} zIndexRange={[10000, 10100]} portal={{ current: document.body }}>
        <div className="pointer-events-none w-40 h-40 rounded-full bg-background border-[8px] border-primary text-primary flex items-center justify-center shadow-[0_0_80px_rgba(var(--primary-rgb),0.4)]">
          <div className="scale-[4]">
            <RotateCw size={22} />
          </div>
        </div>
      </Html>
    </mesh>
  );
};

const VertexHandle = ({ position, onDrag, color }: { position: [number, number], onDrag: (pos: [number, number]) => void, color: string }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh 
      position={[position[0], position[1], 0.1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        if (e.buttons === 1) { // Left click dragging
          onDrag([e.point.x, e.point.y]);
        }
      }}
    >
      <circleGeometry args={[0.5, 16]} />
      <meshBasicMaterial color={hovered ? '#fff' : color} />
    </mesh>
  );
};

const isInsideShape = (uv: THREE.Vector2 | undefined, shape: Shape) => {
  if (!uv) return false;
  const uSizeX = shape.size[0] + 12;
  const uSizeY = shape.size[1] + 12;
  const px = (uv.x - 0.5) * uSizeX;
  const py = (uv.y - 0.5) * uSizeY;
  const sx = Math.max(uSizeX - 12.0, 2.0);
  const sy = Math.max(uSizeY - 12.0, 2.0);
  
  let d = 1e10;
  if (shape.type === 'box' || shape.type === 'text' || shape.type === 'cylinder' || shape.type === 'document') {
    const qx = Math.abs(px) - sx * 0.5;
    const qy = Math.abs(py) - sy * 0.5;
    d = Math.sqrt(Math.pow(Math.max(qx, 0.0), 2) + Math.pow(Math.max(qy, 0.0), 2)) + Math.min(Math.max(qx, qy), 0.0);
  } else if (shape.type === 'diamond') {
    d = (Math.abs(px) + Math.abs(py)) - sx * 0.4;
  } else if (shape.type === 'circle' || shape.type === 'hexagon') {
    d = Math.sqrt(px * px + py * py) - sy * 0.4;
  } else if (shape.type === 'parallelogram' || shape.type === 'trapezoid') {
    d = (Math.abs(px) + Math.abs(py)) - sx * 0.5; // Approximation for hit testing
  }
  return d <= 0.1;
};

const Port = ({ position, type, shapeId }: { position: [number, number], type: any, shapeId: string }) => {
  const [hovered, setHovered] = useState(false);
  const { setLinkingFrom, linkingFrom, addLink, setLinkingTo, setSelectedId } = useFlowchartStore();

  const handlePointerDown = (e: any) => {
    if (e.button === 2) return; // Ignore right click
    e.stopPropagation();
    setLinkingFrom({ id: shapeId, port: type });
    setLinkingTo([e.point.x, e.point.y]);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (linkingFrom && linkingFrom.id !== shapeId) {
      addLink(linkingFrom.id, shapeId, linkingFrom.port, type);
    }
    setLinkingFrom(null);
    setLinkingTo(null);
  };

  return (
    <group position={[position[0], position[1], 0.15]}>
      {/* Black outline for visibility */}
      <mesh scale={[1.15, 1.15, 1]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
      <mesh
        name="port"
        userData={{ shapeId, portType: type }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(shapeId);
        }}
      >
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial 
          color={hovered ? '#39ff14' : '#22d3ee'} 
          transparent 
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};

export const FlowchartNodes = () => {
  const { shapes, selectedId, setSelectedId, activeTool, updateShape, editingId, setEditingId, linkingFrom } = useFlowchartStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);

  // Instanced Attributes
  const colorArray = useMemo(() => new Float32Array(shapes.length * 3), [shapes.length]);
  const shapeTypeArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const isSelectedArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const sizeArray = useMemo(() => new Float32Array(shapes.length * 2), [shapes.length]);
  const opacityArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);

  const getShapeType = (type: string) => {
    if (type === 'box') return 0.0;
    if (type === 'diamond') return 1.0;
    if (type === 'circle') return 2.0;
    if (type === 'parallelogram') return 3.0;
    if (type === 'cylinder') return 4.0;
    if (type === 'document') return 5.0;
    if (type === 'hexagon') return 6.0;
    if (type === 'trapezoid') return 7.0;
    return 0.0;
  };

  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (!meshRef.current) return;

    const tempMatrix = new THREE.Matrix4();
    const tempRotation = new THREE.Quaternion();
    const tempPosition = new THREE.Vector3();
    const tempScale = new THREE.Vector3(1, 1, 1);

    shapes.forEach((shape, i) => {
      tempPosition.set(shape.position[0], shape.position[1], 0);
      tempRotation.setFromEuler(new THREE.Euler(0, 0, shape.rotation || 0));
      
      // Set scale to match shape size + padding
      tempScale.set(shape.size[0] + 12, shape.size[1] + 12, 1);
      
      tempMatrix.compose(tempPosition, tempRotation, tempScale);
      meshRef.current!.setMatrixAt(i, tempMatrix);

      const color = new THREE.Color(shape.color || '#22d3ee');
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;

      shapeTypeArray[i] = getShapeType(shape.type);
      isSelectedArray[i] = selectedId === shape.id ? 1.0 : 0.0;
      sizeArray[i * 2] = shape.size[0] + 12;
      sizeArray[i * 2 + 1] = shape.size[1] + 12;
      opacityArray[i] = shape.type === 'text' ? 0.0 : 1.0;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aColor) meshRef.current.geometry.attributes.aColor.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aShapeType) meshRef.current.geometry.attributes.aShapeType.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aIsSelected) meshRef.current.geometry.attributes.aIsSelected.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aSize) meshRef.current.geometry.attributes.aSize.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aOpacity) meshRef.current.geometry.attributes.aOpacity.needsUpdate = true;
  });

  const handleNodePointerDown = (e: any, id: string) => {
    if (e.button === 2) return; // Ignore right click
    
    const shape = shapes.find(s => s.id === id);
    if (!shape || !isInsideShape(e.uv, shape)) return;

    e.stopPropagation();
    setSelectedId(id);

    // Start dragging
    const isShapeTool = ['box', 'diamond', 'circle', 'custom', 'text'].includes(activeTool);
    if (shape && (activeTool === 'select' || isShapeTool)) {
      useFlowchartStore.getState().setIsDragging(true);
      useFlowchartStore.getState().setDragOffset([
        e.point.x - shape.position[0],
        e.point.y - shape.position[1]
      ]);
    }
  };

  const handleNodeDoubleClick = (e: any, id: string) => {
    const shape = shapes.find(s => s.id === id);
    if (!shape || !isInsideShape(e.uv, shape)) return;

    e.stopPropagation();
    if (activeTool === 'select' || activeTool === 'text' || shape.type === 'text') {
      setEditingId(id);
    }
  };

  const handleVertexDrag = (shapeId: string, vertexIndex: number, newPos: [number, number]) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const newVertices = [...shape.vertices];
    // Convert world space to local space
    newVertices[vertexIndex] = [
      newPos[0] - shape.position[0],
      newPos[1] - shape.position[1]
    ];
    
    updateShape(shapeId, { vertices: newVertices });
  };

  return (
    <group>
      {/* Phase 1: High-Performance Instanced SDFs */}
      <instancedMesh
        key={shapes.length} // Recreate if count changes for simplicity, though dynamic update is possible
        ref={meshRef}
        args={[null as any, null as any, shapes.length]}
        frustumCulled={false}
        onPointerDown={(e) => {
          if (e.instanceId !== undefined) {
            handleNodePointerDown(e, shapes[e.instanceId].id);
          }
        }}
        onDoubleClick={(e) => {
          if (e.instanceId !== undefined) {
            handleNodeDoubleClick(e, shapes[e.instanceId].id);
          }
        }}
        onClick={(e) => {
          if (e.instanceId !== undefined) {
            const shape = shapes[e.instanceId];
            if (!isInsideShape(e.uv, shape)) return;
            e.stopPropagation();
            setSelectedId(shape.id);
          }
        }}
      >
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aColor" args={[colorArray, 3]} />
          <instancedBufferAttribute attach="attributes-aShapeType" args={[shapeTypeArray, 1]} />
          <instancedBufferAttribute attach="attributes-aIsSelected" args={[isSelectedArray, 1]} />
          <instancedBufferAttribute attach="attributes-aSize" args={[sizeArray, 2]} />
          <instancedBufferAttribute attach="attributes-aOpacity" args={[opacityArray, 1]} />
        </planeGeometry>
        <CustomShaderMaterial
          ref={materialRef}
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={ShapeSDFVertexShader}
          fragmentShader={ShapeSDFFragmentShader}
          transparent
          roughness={0.1}
          metalness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          uniforms={{
            uTime: { value: 0.0 },
          }}
        />
      </instancedMesh>

      {/* Individual Overlays (Text, Menu, Ports) */}
      {shapes.map((shape) => {
        const menuOffset = getMenuOffset(shape, shapes);
        
        return (
          <group 
            key={shape.id} 
            position={[shape.position[0], shape.position[1], 0]}
            rotation={[0, 0, shape.rotation || 0]}
          >
            {selectedId === shape.id && !editingId && (
              <>
                <Html center transform scale={1} position={[menuOffset.x, menuOffset.y, 0.2]} zIndexRange={[10000, 10100]} portal={{ current: document.body }}>
                  <RadialMenu shapeId={shape.id} />
                </Html>
                
                {/* Rotate Handle - Opposite the Radial Menu */}
                <group position={[-menuOffset.x, -menuOffset.y, 0.2]}>
                  <RotateHandle 
                    shapeId={shape.id} 
                    position={shape.position} 
                    rotation={shape.rotation || 0} 
                  />
                </group>
              </>
            )}

            {editingId === shape.id ? (
              <Html center transform scale={1}>
                <input
                  autoFocus
                  className="bg-transparent text-white border-none outline-none text-center font-bold"
                  style={{
                    fontSize: '20px',
                    width: 'auto',
                    minWidth: '100px',
                    textShadow: '0 0 10px rgba(34,211,238,0.5)'
                  }}
                  value={shape.text || ''}
                  onChange={(e) => updateShape(shape.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingId(null);
                  }}
                />
              </Html>
            ) : (
              shape.text && (
                <Text
                  position={[0, 0, 0.1]}
                  fontSize={2}
                  color="#fff"
                  anchorX="center"
                  anchorY="middle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(shape.id);
                  }}
                  maxWidth={shape.type === 'text' ? 100 : shape.size[0] * 0.8}
                  onSync={(mesh) => {
                    if (shape.type === 'text' && mesh.geometry.boundingBox) {
                      const box = mesh.geometry.boundingBox;
                      const width = (box.max.x - box.min.x) + 4;
                      const height = (box.max.y - box.min.y) + 2;
                      if (Math.abs(shape.size[0] - width) > 0.1 || Math.abs(shape.size[1] - height) > 0.1) {
                        updateShape(shape.id, { size: [width, height] });
                      }
                    }
                  }}
                >
                  {shape.text}
                </Text>
              )
            )}

            {/* Ports for linking */}
            {(selectedId === shape.id || activeTool === 'link' || !!linkingFrom) && shape.type !== 'text' && (
              <>
                <Port position={[0, shape.size[1] / 2]} type="top" shapeId={shape.id} />
                <Port position={[0, -shape.size[1] / 2]} type="bottom" shapeId={shape.id} />
                <Port position={[-shape.size[0] / 2, 0]} type="left" shapeId={shape.id} />
                <Port position={[shape.size[0] / 2, 0]} type="right" shapeId={shape.id} />
              </>
            )}

            {activeTool === 'vertex' && selectedId === shape.id && shape.vertices.map((vertex, index) => (
              <VertexHandle
                key={index}
                position={[vertex[0], vertex[1]]}
                onDrag={(pos) => handleVertexDrag(shape.id, index, pos)}
                color="#39ff14"
              />
            ))}
          </group>
        );
      })}
    </group>
  );
};
