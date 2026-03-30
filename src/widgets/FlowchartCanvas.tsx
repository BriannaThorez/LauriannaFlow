import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { FlowchartNodes } from '../entities/FlowchartNodes';
import { FlowchartLinks } from '../entities/FlowchartLinks';
import { useFlowchartStore } from '../shared/utils/store';
import themes from '../shared/themes/color_palettes.json';
import * as THREE from 'three';
import { useRef, useEffect, useMemo } from 'react';

const FlowchartCanvasInner = () => {
  const { camera, controls, raycaster, mouse, scene } = useThree();
  const themeName = useFlowchartStore(state => state.themeName);
  
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  const isDark = currentTheme.mode === 'dark';
  const bgColor = isDark ? currentTheme.neutral_dark : currentTheme.neutral_light;
  const gridColor = currentTheme.primary;
  const cellColor = isDark ? '#111' : '#ddd';

  const wasLinkingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const wasPanningRef = useRef(false);
  const pointerDownPos = useRef<[number, number] | null>(null);

  const addShape = useFlowchartStore(state => state.addShape);
  const setActiveTool = useFlowchartStore(state => state.setActiveTool);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const mode = useFlowchartStore(state => state.mode);
  const updateShape = useFlowchartStore(state => state.updateShape);
  const selectedId = useFlowchartStore(state => state.selectedId);
  const setSelectedId = useFlowchartStore(state => state.setSelectedId);
  const editingId = useFlowchartStore(state => state.editingId);
  const setEditingId = useFlowchartStore(state => state.setEditingId);
  const deleteShape = useFlowchartStore(state => state.deleteShape);
  const isDragging = useFlowchartStore(state => state.isDragging);
  const setIsDragging = useFlowchartStore(state => state.setIsDragging);
  const isRotating = useFlowchartStore(state => state.isRotating);
  const setIsRotating = useFlowchartStore(state => state.setIsRotating);
  const isPanning = useFlowchartStore(state => state.isPanning);
  const setIsPanning = useFlowchartStore(state => state.setIsPanning);
  const dragOffset = useFlowchartStore(state => state.dragOffset);
  const linkingFrom = useFlowchartStore(state => state.linkingFrom);
  const setLinkingFrom = useFlowchartStore(state => state.setLinkingFrom);
  const setLinkingTo = useFlowchartStore(state => state.setLinkingTo);
  const addLink = useFlowchartStore(state => state.addLink);
  const shouldResetCamera = useFlowchartStore(state => state.shouldResetCamera);
  const setShouldResetCamera = useFlowchartStore(state => state.setShouldResetCamera);
  const setCameraState = useFlowchartStore(state => state.setCameraState);
  const cameraMoveRequest = useFlowchartStore(state => state.cameraMoveRequest);
  const requestCameraMove = useFlowchartStore(state => state.requestCameraMove);

  const targetZoom = useRef(10);
  const zoomVelocity = useRef(0);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Handle camera reset
  useEffect(() => {
    if (shouldResetCamera) {
      targetZoom.current = 10;
      camera.position.set(0, 0, 100);
      (camera as THREE.OrthographicCamera).zoom = 10;
      camera.updateProjectionMatrix();
      if (controls) {
        (controls as any).target.set(0, 0, 0);
        (controls as any).update();
      }
      setShouldResetCamera(false);
    }
  }, [shouldResetCamera, camera, controls, setShouldResetCamera]);

  // Handle external camera move requests (from minimap)
  useEffect(() => {
    if (cameraMoveRequest) {
      const [x, y] = cameraMoveRequest;
      camera.position.x = x;
      camera.position.y = y;
      if (controls) {
        (controls as any).target.set(x, y, 0);
        (controls as any).update();
      }
      requestCameraMove(null);
    }
  }, [cameraMoveRequest, camera, controls, requestCameraMove]);

  const mouseWorldRef = useRef(new THREE.Vector3());
  const moveVectorRef = useRef(new THREE.Vector3());

  // High-fidelity zoom loop
  useFrame((state, delta) => {
    const cam = camera as THREE.OrthographicCamera;
    
    // Apply zoom with crisp lerp
    if (Math.abs(cam.zoom - targetZoom.current) > 0.001) {
      const oldZoom = cam.zoom;
      
      // Crisp zoom without sluggish lerp
      cam.zoom = targetZoom.current;
      
      // Zoom-to-cursor logic: keep the point under the mouse fixed in world space
      const mouseWorld = mouseWorldRef.current.set(mouse.x, mouse.y, 0).unproject(cam);
      const zoomRatio = 1 - oldZoom / cam.zoom;
      const moveVector = moveVectorRef.current
        .subVectors(mouseWorld, cam.position)
        .multiplyScalar(zoomRatio);
      
      moveVector.z = 0; // Ensure camera stays at constant Z depth
      cam.position.add(moveVector);
      if (controls) {
        (controls as any).target.add(moveVector);
        (controls as any).update();
      }
      
      cam.updateProjectionMatrix();
    }

    // Sync atmospheric sphere to camera position
    if (sphereRef.current) {
      sphereRef.current.position.x = cam.position.x;
      sphereRef.current.position.y = cam.position.y;
    }

    // Sync camera state to store for minimap
    const currentPos = cam.position.toArray() as [number, number, number];
    const currentZoom = cam.zoom;
    const worldWidth = state.size.width / currentZoom;
    const worldHeight = state.size.height / currentZoom;
    
    const prevCameraState = useFlowchartStore.getState().cameraState;
    if (
      prevCameraState.position[0] !== currentPos[0] ||
      prevCameraState.position[1] !== currentPos[1] ||
      prevCameraState.position[2] !== currentPos[2] ||
      prevCameraState.zoom !== currentZoom ||
      prevCameraState.worldWidth !== worldWidth ||
      prevCameraState.worldHeight !== worldHeight
    ) {
      setCameraState(currentPos, currentZoom, worldWidth, worldHeight);
    }
  });

  // Handle keyboard and wheel zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.key === '+' || e.key === '=') {
        zoomVelocity.current += 0.05; 
      }
      if (e.key === '-' || e.key === '_') {
        zoomVelocity.current -= 0.05; 
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          deleteShape(selectedId);
          setSelectedId(null);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (editingId) return;
      // Prevent default to stop page scroll, but keep it snappy
      e.preventDefault();
      
      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.002, delta);
      
      targetZoom.current *= zoomFactor;
      targetZoom.current = THREE.MathUtils.clamp(targetZoom.current, 0.5, 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [editingId, selectedId, deleteShape, setSelectedId]);

  const handleClick = (event: any) => {
    if (mode === 'viewer' || wasLinkingRef.current || wasDraggingRef.current || wasPanningRef.current) {
      wasLinkingRef.current = false;
      wasDraggingRef.current = false;
      wasPanningRef.current = false;
      return;
    }

    if (editingId) {
      const shapes = useFlowchartStore.getState().shapes;
      const editingShape = shapes.find(s => s.id === editingId);
      if (editingShape && (!editingShape.text || editingShape.text.trim() === '')) {
        deleteShape(editingId);
      }
      setEditingId(null);
      return;
    }

    if (activeTool === 'select' || activeTool === 'link' || activeTool === 'vertex') return;
    
    if (!event.point) return;

    const position: [number, number] = [event.point.x, event.point.y];
    
    if (activeTool === 'text') {
      const id = Math.random().toString(36);
      addShape({
        id,
        type: 'text',
        position,
        size: [20, 5],
        vertices: [[-10, -2.5], [10, -2.5], [10, 2.5], [-10, 2.5]],
        text: '',
      });
      setEditingId(id);
      return;
    }

    addShape({
      id: Math.random().toString(36),
      type: activeTool as any,
      position,
      size: [20, 15],
      vertices: [[-10, -7.5], [10, -7.5], [10, 7.5], [-10, 7.5]],
    });
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      setIsPanning(false);
      setIsRotating(false);
      setIsDragging(false);
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [setIsPanning, setIsRotating, setIsDragging]);

  const handlePointerMove = (e: any) => {
    if (mode === 'viewer') return;

    const zoom = (camera as THREE.OrthographicCamera).zoom;

    // Handle Rotation
    if (isRotating && selectedId && e.nativeEvent.buttons !== 0) {
      const shapes = useFlowchartStore.getState().shapes;
      const shape = shapes.find(s => s.id === selectedId);
      if (shape) {
        // Project mouse to z=0 plane for consistent rotation calculation
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        e.ray.intersectPlane(plane, intersectPoint);
        
        const dx = intersectPoint.x - shape.position[0];
        const dy = intersectPoint.y - shape.position[1];
        const currentAngle = Math.atan2(dy, dx);
        const [startAngle, startRotation] = dragOffset;
        const delta = currentAngle - startAngle;
        updateShape(selectedId, { rotation: startRotation + delta }, true);
      }
      return;
    }

    // Handle Manual Panning (from Radial Menu or Right Click)
    if (isPanning && e.nativeEvent.buttons !== 0) {
      const dx = e.nativeEvent.movementX / zoom;
      const dy = -e.nativeEvent.movementY / zoom;
      camera.position.x -= dx;
      camera.position.y -= dy;
      if (controls) {
        (controls as any).target.x -= dx;
        (controls as any).target.y -= dy;
      }
      return;
    }

    // Handle Dragging / Linking (with Reach Pan)
    if (isDragging || linkingFrom) {
      const zoom = (camera as THREE.OrthographicCamera).zoom;
      // Use native movement for precise camera tracking
      const dx = e.nativeEvent.movementX / zoom;
      const dy = -e.nativeEvent.movementY / zoom;
      
      camera.position.x += dx;
      camera.position.y += dy;
      if (controls) {
        (controls as any).target.x += dx;
        (controls as any).target.y += dy;
      }
    }

    if (linkingFrom && e.point) {
      setLinkingTo([e.point.x, e.point.y]);
      return;
    }

    const isShapeTool = ['box', 'diamond', 'circle', 'custom', 'text'].includes(activeTool);
    if (!selectedId || (!isShapeTool && activeTool !== 'select') || !isDragging) return;
    
    if (e.point) {
      const GRID_SIZE = 5;
      const targetX = e.point.x - dragOffset[0];
      const targetY = e.point.y - dragOffset[1];
      
      const snappedX = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(targetY / GRID_SIZE) * GRID_SIZE;

      updateShape(selectedId, {
        position: [snappedX, snappedY]
      }, true);
    }
  };

  const handlePointerDown = (e: any) => {
    wasPanningRef.current = false;
    pointerDownPos.current = [e.clientX, e.clientY];

    if (e.button === 2) {
      setIsPanning(true);
      return;
    }
    
    // CRITICAL: If we clicked on a DOM element (like the radial menu), don't deselect.
    // R3F events bubble from the canvas. If the target is not the canvas, it's a DOM overlay.
    if (e.nativeEvent.target.tagName !== 'CANVAS') return;

    if (mode === 'viewer' || activeTool !== 'select') return;
    if (selectedId) setSelectedId(null);
  };

  const handlePointerUp = (e: any) => {
    setIsPanning(false);
    setIsRotating(false);

    let wasStaticClick = false;
    // Check if we actually moved enough to count as a pan/drag
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current[0];
      const dy = e.clientY - pointerDownPos.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        // We moved, so this was likely a pan or drag
      } else {
        // Very small movement, treat as a static click
        wasStaticClick = true;
        wasPanningRef.current = false;
        wasDraggingRef.current = false;
        wasLinkingRef.current = false;
      }
    }

    if (e.button === 2 && wasStaticClick) {
      setActiveTool('select');
    }

    if (linkingFrom) {
      wasLinkingRef.current = true;
      // Raycast to find port under cursor
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const portIntersect = intersects.find(i => i.object.name === 'port');
      
      if (portIntersect) {
        const { shapeId, portType } = portIntersect.object.userData;
        if (shapeId !== linkingFrom.id) {
          addLink(linkingFrom.id, shapeId, linkingFrom.port, portType);
        }
      }
    }

    if (isDragging) {
      wasDraggingRef.current = true;
    }

    setIsDragging(false);
    setLinkingFrom(null);
    setLinkingTo(null);
  };

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={isDark ? 0.5 : 0.8} />
      <directionalLight position={[10, 10, 10]} intensity={isDark ? 1.5 : 1.0} castShadow />
      <Environment preset="city" />
      
      <OrbitControls 
        makeDefault 
        enableRotate={false} 
        enableZoom={false}
        enableDamping={false}
        enabled={!isDragging && !linkingFrom && !isRotating && !isPanning}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
        onStart={() => { wasPanningRef.current = false; }}
        onChange={() => { wasPanningRef.current = true; }}
        onEnd={() => {
          // Keep it true for a moment to let handleClick consume it
          setTimeout(() => {
            if (wasPanningRef.current) wasPanningRef.current = false;
          }, 200);
        }}
      />

      <FlowchartLinks />
      <FlowchartNodes />

      {/* World-space Grid - Aligned with objects */}
      <Grid
        infiniteGrid
        fadeDistance={1000}
        fadeStrength={5}
        cellSize={10}
        sectionSize={50}
        sectionColor={gridColor}
        sectionThickness={1}
        cellColor={cellColor}
        cellThickness={0.5}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -5]}
      />

      {/* Atmospheric Bounding Sphere - Follows camera for depth and leading aesthetic */}
      <mesh ref={sphereRef} position={[0, 0, -500]}>
        <sphereGeometry args={[800, 64, 64]} />
        <meshBasicMaterial 
          color={isDark ? "#0a0a0a" : "#fff"} 
          side={THREE.BackSide}
          transparent
          opacity={isDark ? 0.5 : 0.2}
        />
      </mesh>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={isDark ? 1.0 : 1.5} 
          luminanceSmoothing={0.5} 
          intensity={isDark ? 0.5 : 0.2} 
        />
        <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0005)} />
        <Noise opacity={isDark ? 0.002 : 0.001} />
        <Vignette eskil={false} offset={0.1} darkness={isDark ? 0.8 : 0.2} />
      </EffectComposer>

      {/* Interaction Shield - Captures all events during drag/link/rotate to prevent occlusion and fighting */}
      {(isDragging || linkingFrom || isRotating || isPanning) && (
        <mesh 
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          position={[camera.position.x, camera.position.y, 50]}
        >
          <planeGeometry args={[10000, 10000]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Background for clicks/panning initiation */}
      <mesh 
        onClick={handleClick} 
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        position={[0, 0, -1]}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
};

export const FlowchartCanvas = () => {
  const { setActiveTool } = useFlowchartStore();

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    // Removed setActiveTool('select') to prevent tool deselection on right-click pan
  };

  return (
    <div className="w-full h-full" onContextMenu={handleContextMenu}>
      <Canvas 
        orthographic 
        camera={{ zoom: 10, position: [0, 0, 100], far: 2000, near: -2000 }}
        gl={{ antialias: true }}
      >
        <FlowchartCanvasInner />
      </Canvas>
    </div>
  );
};
