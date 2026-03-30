import React, { useMemo, useRef, useState } from 'react';
import { useFlowchartStore } from '../shared/utils/store';
import { SmartTooltip } from '../shared/components/SmartTooltip';
import { Map } from 'lucide-react';

export const Minimap: React.FC = () => {
  const shapes = useFlowchartStore(state => state.shapes);
  const links = useFlowchartStore(state => state.links);
  const cameraState = useFlowchartStore(state => state.cameraState);
  const requestCameraMove = useFlowchartStore(state => state.requestCameraMove);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [localZoom, setLocalZoom] = useState(0.375); 
  const [localCenter, setLocalCenter] = useState<[number, number]>([0, 0]);
  const lastMousePos = useRef<[number, number]>([0, 0]);

  // Initial auto-center on shapes
  useMemo(() => {
    if (shapes.length > 0 && localCenter[0] === 0 && localCenter[1] === 0) {
      let avgX = 0;
      let avgY = 0;
      shapes.forEach(s => {
        avgX += s.position[0];
        avgY += s.position[1];
      });
      setLocalCenter([avgX / shapes.length, avgY / shapes.length]);
    }
  }, [shapes.length]);

  // Viewport rectangle calculation in world units
  const viewport = useMemo(() => {
    const { position, worldWidth, worldHeight } = cameraState;
    const [camX, camY] = position;
    
    return {
      x: camX - worldWidth / 2,
      y: camY - worldHeight / 2,
      width: worldWidth,
      height: worldHeight
    };
  }, [cameraState]);

  // Calculate the viewBox
  const viewSize = 200 / localZoom;
  const viewBox = {
    minX: localCenter[0] - viewSize / 2,
    minY: -localCenter[1] - viewSize / 2,
    width: viewSize,
    height: viewSize
  };

  const getInteractionCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const xPercent = (clientX - rect.left) / rect.width;
    const yPercent = (clientY - rect.top) / rect.height;
    
    const svgX = viewBox.minX + xPercent * viewBox.width;
    const svgY = viewBox.minY + yPercent * viewBox.height;
    const worldX = svgX;
    const worldY = -svgY;

    return { worldX, worldY, svgX, svgY, clientX, clientY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getInteractionCoords(e);
    if (!coords) return;

    const { worldX, svgY, clientX, clientY } = coords;

    if (e.button === 2 || e.button === 1) {
      setIsPanning(true);
      lastMousePos.current = [clientX, clientY];
    } else if (e.button === 0) {
      setIsDraggingViewport(true);
      requestCameraMove([worldX, -svgY]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current[0];
      const dy = e.clientY - lastMousePos.current[1];
      
      const rect = svgRef.current!.getBoundingClientRect();
      const worldDx = (dx / rect.width) * viewBox.width;
      const worldDy = (dy / rect.height) * viewBox.height;
      
      setLocalCenter(prev => [prev[0] - worldDx, prev[1] + worldDy]);
      lastMousePos.current = [e.clientX, e.clientY];
    } else if (isDraggingViewport) {
      const coords = getInteractionCoords(e);
      if (coords) {
        requestCameraMove([coords.worldX, coords.worldY]);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY;
    const zoomFactor = 1.1;
    if (delta > 0) {
      setLocalZoom(prev => Math.max(0.01, prev / zoomFactor));
    } else {
      setLocalZoom(prev => Math.min(5.0, prev * zoomFactor));
    }
  };

  return (
    <div 
      id="minimap-container"
      className="w-48 h-48 bg-background/95 backdrop-blur-xl border border-text/10 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] pointer-events-auto group transition-all duration-300 hover:border-primary/40"
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => { setIsDraggingViewport(false); setIsPanning(false); }}
        onMouseLeave={() => { setIsDraggingViewport(false); setIsPanning(false); }}
        onTouchStart={(e) => {
          const coords = getInteractionCoords(e);
          if (coords) {
            setIsDraggingViewport(true);
            requestCameraMove([coords.worldX, coords.worldY]);
          }
        }}
        onTouchMove={(e) => {
          if (isDraggingViewport) {
            const coords = getInteractionCoords(e);
            if (coords) requestCameraMove([coords.worldX, coords.worldY]);
          }
        }}
        onTouchEnd={() => setIsDraggingViewport(false)}
      >
        {/* Grid lines - Perfectly anchored to world (0,0) */}
        <defs>
          <pattern 
            id="minimap-grid-stable" 
            width="100" 
            height="100" 
            patternUnits="userSpaceOnUse"
          >
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--text)" strokeOpacity="0.12" strokeWidth="2" />
          </pattern>
        </defs>
        
        {/* Infinite-feeling grid background */}
        <rect 
          x={viewBox.minX - 500} 
          y={viewBox.minY - 500} 
          width={viewBox.width + 1000} 
          height={viewBox.height + 1000} 
          fill="url(#minimap-grid-stable)" 
        />

        {/* Links */}
        {links.map(link => {
          const from = shapes.find(s => s.id === link.from);
          const to = shapes.find(s => s.id === link.to);
          if (!from || !to) return null;
          return (
            <line
              key={link.id}
              x1={from.position[0]}
              y1={-from.position[1]}
              x2={to.position[0]}
              y2={-to.position[1]}
              stroke="var(--primary)"
              strokeWidth="2"
              opacity="0.25"
              strokeLinecap="round"
            />
          );
        })}

        {/* Shapes */}
        {shapes.map(shape => (
          <rect
            key={shape.id}
            x={shape.position[0] - shape.size[0] / 2}
            y={-shape.position[1] - shape.size[1] / 2}
            width={shape.size[0]}
            height={shape.size[1]}
            fill="var(--primary)"
            opacity="0.5"
            rx="2"
            className="transition-opacity duration-200 group-hover:opacity-70"
          />
        ))}

        {/* Viewport Rectangle */}
        <rect
          x={viewport.x}
          y={-viewport.y - viewport.height}
          width={viewport.width}
          height={viewport.height}
          fill="var(--accent)"
          fillOpacity="0.15"
          stroke="var(--accent)"
          strokeWidth={2 / localZoom}
          strokeDasharray={`${4 / localZoom} ${2 / localZoom}`}
          opacity="0.9"
          className="pointer-events-none"
        />
      </svg>
      
      {/* HUD Overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
        <Map size={12} className="text-text drop-shadow-[0_0_8px_var(--primary)]" />
      </div>

      <div className="absolute bottom-2 left-2 flex items-center gap-2 pointer-events-none">
        <span className="text-[8px] font-mono text-text/60 uppercase tracking-widest">
          Z:{localZoom.toFixed(2)}
        </span>
        <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">
          {cameraState.zoom.toFixed(1)}x
        </span>
      </div>
      
      {/* Quick-center button */}
      <div className="absolute bottom-2 right-2">
        <SmartTooltip content="Recenter Minimap" description="Align the minimap center with the current camera viewport." position="left">
          <button 
            onClick={() => setLocalCenter([cameraState.position[0], cameraState.position[1]])}
            className="p-1 rounded bg-secondary/20 border border-primary/10 hover:bg-primary/20 hover:border-primary/40 transition-all group/btn"
          >
            <div className="w-2 h-2 border border-primary/60 group-hover/btn:border-primary" />
          </button>
        </SmartTooltip>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent/40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent/40" />
    </div>
  );
};
