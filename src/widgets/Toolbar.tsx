import { useFlowchartStore, FlowchartState, PortType } from '../shared/utils/store';
import { 
  MousePointer2, Square, Diamond, Circle, Link, Eye, Edit3, 
  Download, Palette, Check, Database, FileText, Hexagon, 
  Grid3X3, Type, ArrowRightLeft, Package, BoxSelect,
  RectangleHorizontal, Component, Archive, Keyboard, Monitor, Clock, 
  Combine, Split, PlusCircle, CircleDot, Flag, VectorSquare,
  Filter, SquareSlash, Pill, HardDrive
} from 'lucide-react';
import { Minimap } from './Minimap';
import { SmartTooltip } from '../shared/components/SmartTooltip';
import { generateSVG } from '../shared/utils/svgExport';
import { useMemo, useState } from 'react';
import themes from '../shared/themes/color_palettes.json';

const ManualOperatorIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="2,6 22,6 18,18 6,18" /></svg>
);
const ParallelogramIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="4,18 18,18 20,6 6,6" /></svg>
);
const CylinderIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4,5 v14 a8,3 0 0,0 16,0 v-14" /></svg>
);
const DocumentIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4,4 h16 v12 q-4,4 -8,0 t-8,0 z" /></svg>
);
const TerminatorIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="6" width="20" height="12" rx="6" /></svg>
);
const PredefinedProcessIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="4" width="20" height="16" /><line x1="6" y1="4" x2="6" y2="20" /><line x1="18" y1="4" x2="18" y2="20" /></svg>
);
const InternalStorageIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="4" width="20" height="16" /><line x1="2" y1="8" x2="22" y2="8" /><line x1="6" y1="4" x2="6" y2="20" /></svg>
);
const ManualInputIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="2,12 22,4 22,20 2,20" /></svg>
);
const DisplayIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6,4 h10 a8,8 0 0,1 0,16 h-10 l-4,-8 z" /></svg>
);
const OrIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
);
const SummingJunctionIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /><line x1="5.6" y1="18.4" x2="18.4" y2="5.6" /></svg>
);
const OffPageConnectorIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="4,4 20,4 20,14 12,22 4,14" /></svg>
);

export const Toolbar = () => {
  const setActiveTool = useFlowchartStore(state => state.setActiveTool);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const mode = useFlowchartStore(state => state.mode);
  const setMode = useFlowchartStore(state => state.setMode);
  const themeName = useFlowchartStore(state => state.themeName);
  const setThemeName = useFlowchartStore(state => state.setThemeName);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleExport = () => {
    const state = useFlowchartStore.getState();
    const shapes = state.shapes;
    const links = state.links;
    
    if (shapes.length === 0) return;

    const currentTheme = themes[themeName as keyof typeof themes];
    const svg = generateSVG(shapes, links, currentTheme, themeName);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laurianna-flow-export-${new Date().getTime()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tools = useMemo(() => [
    { id: 'select' as const, icon: MousePointer2, label: 'Select', description: 'Select and manipulate existing elements on the canvas.', shortcut: '1' },
    { id: 'text' as const, icon: Type, label: 'Free-Text', description: 'Place resolution-independent text anywhere on the infinite canvas.', shortcut: '2' },
    { id: 'box' as const, icon: Square, label: 'Box', description: 'Create a standard rectangular process node.', shortcut: '3' },
    { id: 'diamond' as const, icon: Diamond, label: 'Decision', description: 'Create a decision node for conditional logic flows.', shortcut: '4' },
    { id: 'circle' as const, icon: Circle, label: 'Circle', description: 'Create a start/end node or a circular process step.', shortcut: '5' },
    { id: 'parallelogram' as const, icon: ParallelogramIcon, label: 'Data', description: 'Input/Output node for data operations.', shortcut: '6' },
    { id: 'cylinder' as const, icon: CylinderIcon, label: 'Database', description: 'Storage or database node.', shortcut: '7' },
    { id: 'document' as const, icon: DocumentIcon, label: 'Document', description: 'Document or report output node.', shortcut: '8' },
    { id: 'hexagon' as const, icon: Hexagon, label: 'Preparation', description: 'Preparation or setup node.', shortcut: '9' },
    { id: 'trapezoid' as const, icon: ManualOperatorIcon, label: 'Manual Operator', description: 'Manual operation node.', shortcut: '0' },
    { id: 'terminal' as const, icon: TerminatorIcon, label: 'Terminal', description: 'Start or end point of a process.', shortcut: 'T' },
    { id: 'predefined_process' as const, icon: PredefinedProcessIcon, label: 'Predefined', description: 'A process defined elsewhere.', shortcut: 'P' },
    { id: 'internal_storage' as const, icon: InternalStorageIcon, label: 'Storage', description: 'Internal storage node.', shortcut: 'S' },
    { id: 'manual_input' as const, icon: ManualInputIcon, label: 'Manual Input', description: 'Manual data entry node.', shortcut: 'I' },
    { id: 'display' as const, icon: DisplayIcon, label: 'Display', description: 'Information display node.', shortcut: 'D' },
    { id: 'or' as const, icon: OrIcon, label: 'Or', description: 'Logical OR junction.', shortcut: 'O' },
    { id: 'summing_junction' as const, icon: SummingJunctionIcon, label: 'Summing', description: 'Logical summing junction.', shortcut: 'U' },
    { id: 'off_page_connector' as const, icon: OffPageConnectorIcon, label: 'Connector', description: 'Link to another page or process.', shortcut: 'C' },
    { id: 'vertex' as const, icon: VectorSquare, label: 'Vertex Edit', description: 'Manually adjust the geometry of selected shapes.', shortcut: 'V' },
    { id: 'link' as const, icon: Link, label: 'Link', description: 'Connect nodes with smart, dynamically updating linkages.', shortcut: 'L' },
  ], []);

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
              {Object.entries(themes).map(([name, palette]) => (
                <button
                  key={name}
                  onClick={() => {
                    setThemeName(name);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-xs transition-all ${
                    themeName === name 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-text/60 hover:text-text hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="capitalize">{name.replace('_', ' ')}</span>
                    <div className="flex gap-1">
                      {[palette.neutral_light, palette.neutral_dark, palette.primary, palette.secondary, palette.accent].map((color, i) => (
                        <div 
                          key={i} 
                          className="w-2 h-2 rounded-full border border-white/10" 
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
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
          <div className="w-48 bg-background/90 backdrop-blur-xl p-1 rounded-xl border border-text/10 flex flex-col gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.4)] max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="px-1 py-0.5 border-b border-text/5 mb-0.5 sticky top-0 bg-inherit z-10">
              <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">Toolbox</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
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
                    className={`p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center ${activeTool === tool.id ? 'bg-primary text-background shadow-[0_0_15_var(--primary)] scale-110' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
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
