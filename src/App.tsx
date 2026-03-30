/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AXIOMATIC INTENT:
 * High-performance flowchart visualization requires bypassing the DOM and leveraging GPU-centric 
 * architectures (WebGL2/SDFs) for resolution-independent rendering at 60fps.
 * 
 * AXIOLOGICAL INTENT:
 * We value precision, performance, and aesthetic clarity. The "Neon-Glow" style is chosen 
 * for functional clarity and professional "mission control" feel.
 * 
 * TELEOLOGICAL INTENT:
 * To provide a standalone, modular flowchart studio and viewer that bridges abstract logic 
 * and high-fidelity visualization with unprecedented responsiveness.
 */

import { useEffect } from 'react';
import { FlowchartCanvas } from './widgets/FlowchartCanvas';
import { Toolbar } from './widgets/Toolbar';
import { ControlsHint } from './widgets/ControlsHint';
import { useFlowchartStore } from './shared/utils/store';
import themes from '../themes/color_palettes.json';

export default function App() {
  const { 
    setActiveTool, 
    undo, 
    redo, 
    resetCamera, 
    editingId,
    setEditingId,
    setSelectedId,
    mode,
    themeName
  } = useFlowchartStore();

  useEffect(() => {
    const theme = (themes as any)[themeName];
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value as string);
        
        // Extract RGB for shadows/transparency
        if (typeof value === 'string' && value.startsWith('#')) {
          const r = parseInt(value.slice(1, 3), 16);
          const g = parseInt(value.slice(3, 5), 16);
          const b = parseInt(value.slice(5, 7), 16);
          root.style.setProperty(`--${key}-rgb`, `${r}, ${g}, ${b}`);
        }
      });
    }
  }, [themeName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if we're editing text
      if (editingId) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo/Redo
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === 'z') {
        undo();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === 'y') {
        redo();
        return;
      }

      // Deselect all / Reset tool
      if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedId(null);
        setEditingId(null);
        return;
      }

      // Center camera
      if (e.key === ' ') {
        e.preventDefault();
        resetCamera();
        return;
      }

      // Zoom (handled in canvas but we can trigger it here if needed)
      // For now, let's assume OrbitControls handles +/- if we enable it, 
      // but we'll implement custom zoom logic in canvas.

      // Tool mapping 1-9
      const toolMap: any[] = ['select', 'text', 'box', 'diamond', 'circle', 'vertex', 'link'];
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= toolMap.length) {
        setActiveTool(toolMap[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, undo, redo, resetCamera, setActiveTool, setEditingId, setSelectedId]);

  return (
    <div className="w-full h-screen relative">
      <FlowchartCanvas />
      <Toolbar />
      {mode === 'studio' && <ControlsHint />}
    </div>
  );
}
