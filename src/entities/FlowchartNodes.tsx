import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFlowchartStore, Shape } from '../shared/utils/store';
import { getMenuOffset } from '../shared/utils/layout';
import { Text, Html } from '@react-three/drei';
import { ShapeSDFVertexShader, ShapeSDFFragmentShader } from '../shared/shaders/ShapeSDFMaterial';
import { RadialMenu } from '../components/RadialMenu';
import themes from '../shared/themes/color_palettes.json';
import { RotateCw } from 'lucide-react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';

import { SpatialHash } from '../shared/utils/SpatialHash';

const RotateHandle = ({ shapeId, position, rotation }: { shapeId: string, position: [number, number], rotation: number }) => {
  const setIsRotating = useFlowchartStore(state => state.setIsRotating);
  const setDragOffset = useFlowchartStore(state => state.setDragOffset);
  const setIsPanning = useFlowchartStore(state => state.setIsPanning);
  const [hovered, setHovered] = useState(false);
  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    
    if (e.button === 2) { // Right click
      setIsPanning(true);
      return;
    }

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
      useFlowchartStore.getState().pushToHistory();
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
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Visual handle - matches RadialMenu trigger style */}
      <Html 
        center 
        transform 
        scale={1} 
        zIndexRange={[10000, 10100]} 
        portal={{ current: document.body }}
        pointerEvents="none" 
      >
        <div className={`pointer-events-none w-40 h-40 rounded-full bg-background border-[8px] text-text flex items-center justify-center transition-all duration-300 ${
          hovered ? 'border-accent scale-110 shadow-[0_0_100px_rgba(var(--accent-rgb),0.8)]' : 'border-primary shadow-[0_0_80px_rgba(var(--primary-rgb),0.4)]'
        }`}>
          <div className="scale-[4]">
            <RotateCw size={22} className={hovered ? 'text-accent' : 'text-primary'} />
          </div>
        </div>
      </Html>

      {/* Precise hit area */}
      <circleGeometry args={[4, 32]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};

const VertexHandle = ({ position, onDrag, onDragStart, color }: { position: [number, number], onDrag: (pos: [number, number]) => void, onDragStart: () => void, color: string }) => {
  const [hovered, setHovered] = useState(false);
  
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = (themes as any)[themeName];
  
  return (
    <mesh 
      position={[position[0], position[1], 0.1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        if (e.buttons === 1) { // Left click dragging
          onDrag([e.point.x, e.point.y]);
        }
      }}
      scale={hovered ? 1.5 : 1}
    >
      <circleGeometry args={[0.5, 16]} />
      <meshBasicMaterial color={hovered ? '#fff' : currentTheme.accent} />
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
  const setLinkingFrom = useFlowchartStore(state => state.setLinkingFrom);
  const linkingFrom = useFlowchartStore(state => state.linkingFrom);
  const addLink = useFlowchartStore(state => state.addLink);
  const setLinkingTo = useFlowchartStore(state => state.setLinkingTo);
  const setSelectedId = useFlowchartStore(state => state.setSelectedId);
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = (themes as any)[themeName];

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
          color={hovered ? currentTheme.accent : currentTheme.primary} 
          transparent 
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};

const PlacementIndicator = () => {
  const activeTool = useFlowchartStore(state => state.activeTool);
  const pointerPosition = useFlowchartStore(state => state.pointerPosition);
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = (themes as any)[themeName];
  const materialRef = useRef<any>(null);
  
  const isShapeTool = activeTool !== 'select' && activeTool !== 'link' && activeTool !== 'vertex';
  
  useFrame(() => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = performance.now() / 1000;
    }
  });

  if (!isShapeTool || !pointerPosition) return null;
  
  let size: [number, number] = [20, 15];
  if (activeTool === 'text') size = [20, 5];
  else if (activeTool === 'terminal') size = [25, 10];
  else if (activeTool === 'parallelogram') size = [22, 15];
  else if (activeTool === 'hexagon') size = [24, 15];
  else if (activeTool === 'trapezoid') size = [22, 15];
  else if (activeTool === 'display') size = [24, 15];
  const color = new THREE.Color(currentTheme.primary);
  
  const getShapeType = (type: string) => {
    const mapping: Record<string, number> = {
      'box': 0.0, 'text': 0.0,
      'diamond': 1.0,
      'circle': 2.0,
      'parallelogram': 3.0,
      'cylinder': 4.0,
      'document': 5.0,
      'hexagon': 6.0,
      'trapezoid': 7.0,
      'terminal': 8.0,
      'predefined_process': 9.0,
      'internal_storage': 10.0,
      'manual_input': 11.0,
      'display': 12.0,
      'or': 16.0,
      'summing_junction': 17.0,
      'off_page_connector': 18.0
    };
    return mapping[type] ?? 0.0;
  };

  const colorArray = new Float32Array([color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b]);
  const shapeTypeArray = new Float32Array([getShapeType(activeTool), getShapeType(activeTool), getShapeType(activeTool), getShapeType(activeTool)]);
  const isSelectedArray = new Float32Array([1.0, 1.0, 1.0, 1.0]);
  const sizeArray = new Float32Array([size[0] + 12, size[1] + 12, size[0] + 12, size[1] + 12, size[0] + 12, size[1] + 12, size[0] + 12, size[1] + 12]);
  const opacityArray = new Float32Array([0.3, 0.3, 0.3, 0.3]);
  const materialArray = new Float32Array([0.0, 0.0, 0.0, 0.0]);

  return (
    <mesh position={[pointerPosition[0], pointerPosition[1], 0.1]} scale={[size[0] + 12, size[1] + 12, 1]}>
      <planeGeometry args={[1, 1]}>
        <bufferAttribute attach="attributes-aColor" args={[colorArray, 3]} />
        <bufferAttribute attach="attributes-aShapeType" args={[shapeTypeArray, 1]} />
        <bufferAttribute attach="attributes-aIsSelected" args={[isSelectedArray, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizeArray, 2]} />
        <bufferAttribute attach="attributes-aOpacity" args={[opacityArray, 1]} />
        <bufferAttribute attach="attributes-aMaterial" args={[materialArray, 1]} />
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
    </mesh>
  );
};

export const FlowchartNodes = () => {
  const shapes = useFlowchartStore(state => state.shapes);
  const selectedId = useFlowchartStore(state => state.selectedId);
  const setSelectedId = useFlowchartStore(state => state.setSelectedId);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const updateShape = useFlowchartStore(state => state.updateShape);
  const editingId = useFlowchartStore(state => state.editingId);
  const setEditingId = useFlowchartStore(state => state.setEditingId);
  const linkingFrom = useFlowchartStore(state => state.linkingFrom);
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const portMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const { camera, size } = useThree();
  const themeName = useFlowchartStore(state => state.themeName);

  // Reusable THREE objects to avoid GC pressure in hot loops
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempRotation = useRef(new THREE.Quaternion());
  const tempPosition = useRef(new THREE.Vector3());
  const tempScale = useRef(new THREE.Vector3(1, 1, 1));
  const tempEuler = useRef(new THREE.Euler());
  const tempColor = useRef(new THREE.Color());

  // Phase 3: Spatial Hash Engine
  // Build hash once per change, query per frame for virtualization
  const spatialHash = useMemo(() => {
    const hash = new SpatialHash(100);
    shapes.forEach(s => hash.insert(s.id, s.position[0], s.position[1], s.size[0], s.size[1]));
    return hash;
  }, [shapes]);

  // Determine visible shapes for React overlay virtualization
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const lastVisibleIdsRef = useRef<Set<string>>(new Set());
  const lastCameraPos = useRef(new THREE.Vector3());
  const lastCameraZoom = useRef(0);

  useFrame(() => {
    // Only query if camera moved or zoomed significantly to save CPU
    const dist = camera.position.distanceTo(lastCameraPos.current);
    const zoomDiff = Math.abs(camera.zoom - lastCameraZoom.current);
    
    if (dist < 1.0 && zoomDiff < 0.05 && visibleIds.size > 0) return;
    
    lastCameraPos.current.copy(camera.position);
    lastCameraZoom.current = camera.zoom;

    // Calculate viewport bounds in world coordinates
    const cam = camera as THREE.OrthographicCamera;
    const vWidth = (cam.right - cam.left) / cam.zoom;
    const vHeight = (cam.top - cam.bottom) / cam.zoom;
    
    const queryIds = spatialHash.query(camera.position.x, camera.position.y, vWidth * 1.5, vHeight * 1.5);
    
    // Only update if the set of IDs has changed to avoid React churn
    const hasChanged = queryIds.size !== lastVisibleIdsRef.current.size || 
                     [...queryIds].some(id => !lastVisibleIdsRef.current.has(id));
                     
    if (hasChanged) {
      lastVisibleIdsRef.current = queryIds;
      setVisibleIds(queryIds);
    }
  });

  // Instanced Attributes
  const colorArray = useMemo(() => new Float32Array(shapes.length * 3), [shapes.length]);
  const shapeTypeArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const isSelectedArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const sizeArray = useMemo(() => new Float32Array(shapes.length * 2), [shapes.length]);
  const opacityArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const materialArray = useMemo(() => new Float32Array(shapes.length), [shapes.length]);
  const portColorArray = useMemo(() => new Float32Array(shapes.length * 4 * 3), [shapes.length]);

  const getShapeType = (type: string) => {
    const mapping: Record<string, number> = {
      'box': 0.0, 'text': 0.0,
      'diamond': 1.0,
      'circle': 2.0,
      'parallelogram': 3.0,
      'cylinder': 4.0,
      'document': 5.0,
      'hexagon': 6.0,
      'trapezoid': 7.0,
      'terminal': 8.0,
      'predefined_process': 9.0,
      'internal_storage': 10.0,
      'manual_input': 11.0,
      'display': 12.0,
      'or': 16.0,
      'summing_junction': 17.0,
      'off_page_connector': 18.0
    };
    return mapping[type] ?? 0.0;
  };

  useFrame(() => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = performance.now() / 1000;
    }
  });

  useEffect(() => {
    if (!meshRef.current) return;

    shapes.forEach((shape, i) => {
      tempPosition.current.set(shape.position[0], shape.position[1], 0);
      tempEuler.current.set(0, 0, shape.rotation || 0);
      tempRotation.current.setFromEuler(tempEuler.current);
      
      // Set scale to match shape size + padding
      tempScale.current.set(shape.size[0] + 12, shape.size[1] + 12, 1);
      
      tempMatrix.current.compose(tempPosition.current, tempRotation.current, tempScale.current);
      meshRef.current!.setMatrixAt(i, tempMatrix.current);

      // Resolve color: per-theme override > global color > theme primary
      const themeColor = shape.themeColors?.[themeName];
      const resolvedColor = themeColor || shape.color || (themes as any)[themeName].primary;
      tempColor.current.set(resolvedColor);
      
      colorArray[i * 3] = tempColor.current.r;
      colorArray[i * 3 + 1] = tempColor.current.g;
      colorArray[i * 3 + 2] = tempColor.current.b;

      shapeTypeArray[i] = getShapeType(shape.type);
      isSelectedArray[i] = selectedId === shape.id ? 1.0 : 0.0;
      sizeArray[i * 2] = shape.size[0] + 12;
      sizeArray[i * 2 + 1] = shape.size[1] + 12;
      opacityArray[i] = shape.type === 'text' ? 0.0 : 1.0;
      materialArray[i] = shape.material === 'glass' ? 1.0 : 0.0;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
    meshRef.current.computeBoundingBox();
    if (meshRef.current.geometry.attributes.aColor) meshRef.current.geometry.attributes.aColor.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aShapeType) meshRef.current.geometry.attributes.aShapeType.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aIsSelected) meshRef.current.geometry.attributes.aIsSelected.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aSize) meshRef.current.geometry.attributes.aSize.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aOpacity) meshRef.current.geometry.attributes.aOpacity.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aMaterial) meshRef.current.geometry.attributes.aMaterial.needsUpdate = true;
  }, [shapes, themeName, selectedId, colorArray, shapeTypeArray, isSelectedArray, sizeArray, opacityArray, materialArray]);

  const handleNodePointerDown = (e: any, id: string) => {
    if (e.button === 2) return; // Ignore right click
    
    const shape = shapes.find(s => s.id === id);
    if (!shape || !isInsideShape(e.uv, shape)) return;

    e.stopPropagation();
    
    if (editingId && editingId !== id) {
      const editingShape = shapes.find(s => s.id === editingId);
      if (editingShape && (!editingShape.text || editingShape.text.trim() === '')) {
        useFlowchartStore.getState().deleteShape(editingId);
      }
      setEditingId(null);
    }

    setSelectedId(id);

    // Start dragging
    const isDraggableTool = activeTool !== 'link' && activeTool !== 'vertex';
    if (shape && isDraggableTool) {
      useFlowchartStore.getState().pushToHistory();
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
    
    updateShape(shapeId, { vertices: newVertices }, true);
  };

  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (editingId) {
      const interval = setInterval(() => {
        setCursorVisible(v => !v);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(true);
    }
  }, [editingId]);

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
          <instancedBufferAttribute attach="attributes-aMaterial" args={[materialArray, 1]} />
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

      {/* Individual Overlays (Text, Menu, Ports) - Virtualized via Spatial Hash */}
      {shapes.filter(s => visibleIds.has(s.id) || s.id === selectedId).map((shape) => {
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

            {/* Text Rendering */}
            {(shape.text || editingId === shape.id) && (
              <Text
                position={[0, 0, 0.1]}
                fontSize={2}
                color={(themes as any)[themeName].mode === 'dark' ? (themes as any)[themeName].neutral_light : (themes as any)[themeName].neutral_dark}
                anchorX="center"
                anchorY="middle"
                visible={true}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(shape.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'select' || activeTool === 'text' || shape.type === 'text') {
                    setEditingId(shape.id);
                  }
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
                {shape.text || ''}{(editingId === shape.id && cursorVisible) ? '_' : ''}
              </Text>
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
                onDragStart={() => useFlowchartStore.getState().pushToHistory()}
                onDrag={(pos) => handleVertexDrag(shape.id, index, pos)}
                color="#39ff14"
              />
            ))}
          </group>
        );
      })}
      <PlacementIndicator />
    </group>
  );
};
