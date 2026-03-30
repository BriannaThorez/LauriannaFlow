import { useFlowchartStore, FlowchartState, PortType } from '../shared/utils/store';
import { 
  MousePointer2, Square, Diamond, Circle, Link, Eye, Edit3, 
  Download, Palette, Check, Database, FileText, Hexagon, 
  Grid3X3, Type, ArrowRightLeft, Package, BoxSelect 
} from 'lucide-react';
import { Minimap } from './Minimap';
import { SmartTooltip } from '../shared/components/SmartTooltip';
import { generateSVG } from '../shared/utils/svgExport';
import { useMemo, useState } from 'react';
import themes from '../shared/themes/color_palettes.json';

export const Toolbar = () => {
  const setActiveTool = useFlowchartStore(state => state.setActiveTool);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const mode = useFlowchartStore(state => state.mode);
  const setMode = useFlowchartStore(state => state.setMode);
  const shapes = useFlowchartStore(state => state.shapes);
  const links = useFlowchartStore(state => state.links);
  const themeName = useFlowchartStore(state => state.themeName);
  const setThemeName = useFlowchartStore(state => state.setThemeName);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Dynamically create SVG on each change
  const currentTheme = useMemo(() => themes[themeName as keyof typeof themes], [themeName]);
  const currentSVG = useMemo(() => generateSVG(shapes, links, currentTheme), [shapes, links, currentTheme]);

  const tools: { id: FlowchartState['activeTool'], icon: any, label: string, description: string, shortcut: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select', description: 'Select and manipulate existing elements on the canvas.', shortcut: '1' },
    { id: 'text', icon: Type, label: 'Free-Text', description: 'Place resolution-independent text anywhere on the infinite canvas.', shortcut: '2' },
    { id: 'box', icon: Square, label: 'Box', description: 'Create a standard rectangular process node.', shortcut: '3' },
    { id: 'diamond', icon: Diamond, label: 'Diamond', description: 'Create a decision node for conditional logic flows.', shortcut: '4' },
    { id: 'circle', icon: Circle, label: 'Circle', description: 'Create a start/end node or a circular process step.', shortcut: '5' },
    { id: 'parallelogram', icon: ArrowRightLeft, label: 'Data', description: 'Input/Output node for data operations.', shortcut: '6' },
    { id: 'cylinder', icon: Database, label: 'Database', description: 'Storage or database node.', shortcut: '7' },
    { id: 'document', icon: FileText, label: 'Document', description: 'Document or report output node.', shortcut: '8' },
    { id: 'hexagon', icon: Hexagon, label: 'Preparation', description: 'Preparation or setup node.', shortcut: '9' },
    { id: 'trapezoid', icon: Package, label: 'Manual', description: 'Manual operation node.', shortcut: '0' },
    { id: 'vertex', icon: BoxSelect, label: 'Vertex Edit', description: 'Manually adjust the geometry of selected shapes.', shortcut: 'V' },
    { id: 'link', icon: Link, label: 'Link', description: 'Connect nodes with smart, dynamically updating linkages.', shortcut: 'L' },
  ];

  const handleExport = () => {
    if (shapes.length === 0) return;

    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laurianna-flow-export-${new Date().getTime()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-4 items-start z-50">
      {/* Mode Switcher & Export */}
      <div className="bg-background/90 backdrop-blur-xl p-1.5 rounded-xl border border-text/10 flex gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] items-center relative z-50">
        <SmartTooltip content="Studio Mode" description="Full creative control. Create, edit, and link nodes." position="bottom">
          <button
            onClick={() => setMode('studio')}
            className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${mode === 'studio' ? 'bg-primary text-background shadow-[0_0_15px_var(--primary)]' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
          >
            <Edit3 size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>
        
        <SmartTooltip content="Viewer Mode" description="Clean presentation mode. All editing tools are hidden." position="bottom">
          <button
            onClick={() => setMode('viewer')}
            className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${mode === 'viewer' ? 'bg-primary text-background shadow-[0_0_15px_var(--primary)]' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
          >
            <Eye size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>

        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />

        <div className="relative">
          <SmartTooltip content="Switch Theme" description="Choose a color palette for the entire flowchart studio." position="bottom">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${showThemeMenu ? 'bg-primary/10 text-primary' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
            >
              <Palette size={18} strokeWidth={2} />
            </button>
          </SmartTooltip>

          {showThemeMenu && (
            <div 
              onMouseLeave={() => setShowThemeMenu(false)}
              className="absolute top-full mt-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1 min-w-[160px] z-[100]"
            >
              <div className="px-2 py-1 border-b border-primary/5 mb-1">
                <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">Select Theme</span>
              </div>
              {Object.keys(themes).map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setThemeName(name);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    themeName === name 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-text/60 hover:text-text hover:bg-primary/5'
                  }`}
                >
                  <span className="capitalize">{name.replace('_', ' ')}</span>
                  {themeName === name && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <SmartTooltip content="Export Data" description="Download the current flowchart as a structured JSON file." position="bottom">
          <button
            onClick={handleExport}
            className="p-2 rounded-lg text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
          >
            <Download size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>
      </div>

      {/* GUI components hidden in Viewer mode */}
      {mode === 'studio' && (
        <>
          {/* Minimap */}
          <Minimap />

          {/* Toolbox */}
          <div className="bg-background/90 backdrop-blur-xl p-1 rounded-xl border border-text/10 flex flex-col gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="px-1 py-0.5 border-b border-text/5 mb-0.5">
              <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">Toolbox</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {tools.map((tool) => (
                <SmartTooltip 
                  key={tool.id} 
                  content={tool.label} 
                  description={tool.description}
                  shortcut={tool.shortcut}
                  position="right"
                >
                  <button
                    onClick={() => setActiveTool(tool.id)}
                    className={`p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center ${activeTool === tool.id ? 'bg-primary text-background shadow-[0_0_15px_var(--primary)] scale-110' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
                  >
                    <tool.icon size={16} strokeWidth={1.5} />
                  </button>
                </SmartTooltip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
