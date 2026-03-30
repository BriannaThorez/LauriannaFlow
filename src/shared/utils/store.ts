import { create } from 'zustand';

/**
 * Inspiration Source: https://en.wikipedia.org/wiki/Flowchart#Building_blocks
 * This source is used to ensure a full variety of standard flowchart shapes.
 */
export type ShapeType = 
  | 'box' | 'diamond' | 'circle' | 'parallelogram' | 'cylinder' | 'document' 
  | 'hexagon' | 'trapezoid' | 'terminal' | 'predefined_process' 
  | 'internal_storage' | 'manual_input' | 'display' | 'or' 
  | 'summing_junction' | 'off_page_connector' | 'custom' | 'text';

export type PortType = 'top' | 'bottom' | 'left' | 'right';

export interface Link {
  id: string;
  from: string; // Shape ID
  to: string;   // Shape ID
  fromPort?: PortType;
  toPort?: PortType;
}

export interface Shape {
  id: string;
  type: ShapeType;
  position: [number, number];
  size: [number, number];
  vertices: [number, number][]; // Relative to position
  text?: string;
  color?: string; // Legacy/Override
  themeColors?: Record<string, string>; // themeName -> hexColor
  material?: 'plastic' | 'glass';
  rotation?: number; // in radians
}

export interface FlowchartState {
  shapes: Shape[];
  links: Link[];
  activeTool: ShapeType | 'link' | 'select' | 'vertex';
  mode: 'studio' | 'viewer';
  selectedId: string | null;
  editingId: string | null;
  isDragging: boolean;
  isRotating: boolean;
  isPanning: boolean;
  dragOffset: [number, number];
  
  // Drag-to-link state
  linkingFrom: { id: string, port: PortType } | null;
  linkingTo: [number, number] | null;
  
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>, skipHistory?: boolean) => void;
  deleteShape: (id: string) => void;
  addLink: (from: string, to: string, fromPort?: PortType, toPort?: PortType) => void;
  setActiveTool: (tool: FlowchartState['activeTool']) => void;
  setMode: (mode: FlowchartState['mode']) => void;
  setSelectedId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsRotating: (isRotating: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setDragOffset: (offset: [number, number]) => void;
  setLinkingFrom: (linking: { id: string, port: PortType } | null) => void;
  setLinkingTo: (pos: [number, number] | null) => void;
  resolveAllOverlaps: () => void;
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  resetCamera: () => void;
  shouldResetCamera: boolean;
  setShouldResetCamera: (val: boolean) => void;
  
  // Camera tracking for minimap
  cameraState: {
    position: [number, number, number];
    zoom: number;
    worldWidth: number;
    worldHeight: number;
  };
  setCameraState: (pos: [number, number, number], zoom: number, worldWidth: number, worldHeight: number) => void;
  
  // Camera movement request from minimap
  cameraMoveRequest: [number, number] | null;
  requestCameraMove: (pos: [number, number] | null) => void;
  
  // Pointer tracking for placement indicator
  pointerPosition: [number, number] | null;
  setPointerPosition: (pos: [number, number] | null) => void;
  
  // Theme state
  themeName: string;
  setThemeName: (name: string) => void;
  
  // Tooltip deconfliction
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
}

const getAABB = (shape: Shape) => {
  const rotation = shape.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const [vx, vy] of shape.vertices) {
    const rx = vx * cos - vy * sin;
    const ry = vx * sin + vy * cos;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  }
  
  return {
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  };
};

const checkOverlap = (s1: Shape, s2: Shape) => {
  const aabb1 = getAABB(s1);
  const aabb2 = getAABB(s2);

  const cx1 = s1.position[0] + aabb1.cx;
  const cy1 = s1.position[1] + aabb1.cy;
  const cx2 = s2.position[0] + aabb2.cx;
  const cy2 = s2.position[1] + aabb2.cy;

  // Add a small padding to prevent perfectly touching edges from being considered overlapping if desired,
  // but here we use strict AABB.
  return (
    Math.abs(cx1 - cx2) < (aabb1.w + aabb2.w) / 2 - 0.1 &&
    Math.abs(cy1 - cy2) < (aabb1.h + aabb2.h) / 2 - 0.1
  );
};

const findBestPosition = (shape: Shape, allShapes: Shape[]): [number, number] => {
  const [startX, startY] = shape.position;
  const others = allShapes.filter(s => s.id !== shape.id);
  
  if (!others.some(s => checkOverlap({ ...shape, position: [startX, startY] }, s))) {
    return [startX, startY];
  }

  // Spiral search for nearest free spot
  const step = 5;
  const maxIterations = 200; // Prevent infinite loops
  
  for (let i = 1; i < maxIterations; i++) {
    // Check points in a square ring of radius i*step
    // This approximates a spiral search
    for (let dx = -i; dx <= i; dx++) {
      for (let dy = -i; dy <= i; dy++) {
        if (Math.abs(dx) !== i && Math.abs(dy) !== i) continue;
        
        const nx = startX + dx * step;
        const ny = startY + dy * step;
        const testShape = { ...shape, position: [nx, ny] as [number, number] };
        
        if (!others.some(s => checkOverlap(testShape, s))) {
          return [nx, ny];
        }
      }
    }
  }
  
  return [startX, startY];
};

interface HistoryState {
  shapes: Shape[];
  links: Link[];
}

export const useFlowchartStore = create<FlowchartState>((set, get) => {
  const history: HistoryState[] = [];
  const redoStack: HistoryState[] = [];

  const pushToHistory = () => {
    const { shapes, links } = get();
    history.push(JSON.parse(JSON.stringify({ shapes, links })));
    if (history.length > 50) history.shift();
    redoStack.length = 0; // Clear redo stack on new action
  };

  return {
    shapes: [
      {
        id: 'default-node',
        type: 'box',
        position: [0, 0],
        size: [20, 15],
        vertices: [[-10, -7.5], [10, -7.5], [10, 7.5], [-10, 7.5]],
        text: 'Start',
      }
    ],
    links: [],
    activeTool: 'select',
    mode: 'studio',
    selectedId: null,
    editingId: null,
    isDragging: false,
    isRotating: false,
    isPanning: false,
    dragOffset: [0, 0],
    linkingFrom: null,
    linkingTo: null,
    shouldResetCamera: false,
    
    addShape: (shape) => {
      pushToHistory();
      set((state) => {
        const safePos = findBestPosition(shape, state.shapes);
        return { shapes: [...state.shapes, { ...shape, position: safePos }] };
      });
    },
    updateShape: (id, updates, skipHistory = false) => {
      if (!skipHistory) {
        pushToHistory();
      }
      set((state) => {
        return {
          shapes: state.shapes.map(s => {
            if (s.id === id) {
              const newShape = { ...s, ...updates };
              // If size was updated, update vertices to match the new size
              if (updates.size && (!s.size || updates.size[0] !== s.size[0] || updates.size[1] !== s.size[1])) {
                const [w, h] = updates.size;
                newShape.vertices = [
                  [-w / 2, -h / 2],
                  [w / 2, -h / 2],
                  [w / 2, h / 2],
                  [-w / 2, h / 2]
                ];
              }
              return newShape;
            }
            return s;
          })
        };
      });
    },
    deleteShape: (id) => {
      pushToHistory();
      set((state) => ({
        shapes: state.shapes.filter(s => s.id !== id),
        links: state.links.filter(l => l.from !== id && l.to !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        editingId: state.editingId === id ? null : state.editingId
      }));
    },
    addLink: (from, to, fromPort, toPort) => {
      pushToHistory();
      set((state) => {
        const exists = state.links.some(l => 
          l.from === from && l.to === to && l.fromPort === fromPort && l.toPort === toPort
        );
        if (exists) return state;
        return {
          links: [...state.links, { id: Math.random().toString(36), from, to, fromPort, toPort }]
        };
      });
    },
    setActiveTool: (tool) => set({ activeTool: tool }),
    setMode: (mode) => set({ mode }),
    setSelectedId: (id) => set({ selectedId: id }),
    setEditingId: (id) => set({ editingId: id }),
    setIsDragging: (isDragging) => {
      const state = get();
      if (!isDragging && state.isDragging && state.selectedId) {
        // Finalize position on drop
        const shape = state.shapes.find(s => s.id === state.selectedId);
        if (shape) {
          const safePos = findBestPosition(shape, state.shapes);
          state.updateShape(shape.id, { position: safePos });
        }
      }
      set({ isDragging });
    },
    setIsRotating: (isRotating) => {
      const state = get();
      if (!isRotating && state.isRotating && state.selectedId) {
        // Finalize position on drop
        const shape = state.shapes.find(s => s.id === state.selectedId);
        if (shape) {
          const safePos = findBestPosition(shape, state.shapes);
          state.updateShape(shape.id, { position: safePos });
        }
      }
      set({ isRotating });
    },
    setIsPanning: (isPanning) => set({ isPanning }),
    setDragOffset: (dragOffset) => set({ dragOffset }),
    setLinkingFrom: (linkingFrom) => set({ linkingFrom }),
    setLinkingTo: (linkingTo) => set({ linkingTo }),
    resolveAllOverlaps: () => {
      const state = get();
      let newShapes = [...state.shapes];
      let changed = false;
      
      for (let i = 0; i < newShapes.length; i++) {
        const shape = newShapes[i];
        const safePos = findBestPosition(shape, newShapes);
        if (safePos[0] !== shape.position[0] || safePos[1] !== shape.position[1]) {
          newShapes[i] = { ...shape, position: safePos };
          changed = true;
        }
      }
      
      if (changed) {
        pushToHistory();
        set({ shapes: newShapes });
      }
    },
    undo: () => {
      if (history.length > 0) {
        const { shapes, links } = get();
        redoStack.push(JSON.parse(JSON.stringify({ shapes, links })));
        const previous = history.pop()!;
        set({ shapes: previous.shapes, links: previous.links });
      }
    },
    redo: () => {
      if (redoStack.length > 0) {
        const { shapes, links } = get();
        history.push(JSON.parse(JSON.stringify({ shapes, links })));
        const next = redoStack.pop()!;
        set({ shapes: next.shapes, links: next.links });
      }
    },
    pushToHistory: () => pushToHistory(),
    resetCamera: () => set({ shouldResetCamera: true }),
    setShouldResetCamera: (val) => set({ shouldResetCamera: val }),
    
    cameraState: {
      position: [0, 0, 100],
      zoom: 10,
      worldWidth: 20,
      worldHeight: 20,
    },
    setCameraState: (position, zoom, worldWidth, worldHeight) => set({ 
      cameraState: { position, zoom, worldWidth, worldHeight } 
    }),
    
    cameraMoveRequest: null,
    requestCameraMove: (cameraMoveRequest) => set({ cameraMoveRequest }),
    
    pointerPosition: null,
    setPointerPosition: (pointerPosition) => set({ pointerPosition }),
    
    // Theme state
    themeName: 'cozy_cabin',
    setThemeName: (themeName) => set({ themeName }),
    
    // Tooltip deconfliction
    activeTooltipId: null,
    setActiveTooltipId: (activeTooltipId) => set({ activeTooltipId }),
  };
});
