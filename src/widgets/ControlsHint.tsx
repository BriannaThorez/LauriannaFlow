import React from 'react';
import { 
  MouseLeftClick01Icon, 
  MouseRightClick01Icon, 
  MouseScroll01Icon,
  KeyboardIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Target01Icon,
  Delete02Icon
} from 'hugeicons-react';
import { useFlowchartStore } from '../shared/utils/store';

export const ControlsHint = () => {
  const activeTool = useFlowchartStore(state => state.activeTool);

  return (
    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-2xl border border-text/10 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-56 pointer-events-none select-none z-50">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-text/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_5px_var(--accent)]" />
            <span className="text-[9px] font-mono tracking-[0.2em] text-text uppercase font-bold">Laurianna Flow v1.4</span>
          </div>
          <span className="text-[8px] font-mono text-text/20 uppercase tracking-widest">{activeTool}</span>
        </div>

        {/* Mouse Controls */}
        <div className="grid grid-cols-3 gap-2">
          <MouseHint icon={<MouseLeftClick01Icon size={24} strokeWidth={1} />} label="" />
          <MouseHint icon={<MouseRightClick01Icon size={24} strokeWidth={1} />} label="Pan" />
          <MouseHint icon={<MouseScroll01Icon size={24} strokeWidth={1} />} label="Zoom" />
        </div>

        {/* Keyboard Shortcuts */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[8px] font-mono text-text/30 uppercase tracking-widest mb-1">Shortcuts</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <KbdHint kbd="Esc" label="Reset" />
            <KbdHint kbd="Space" label="Center" />
            <KbdHint kbd="Z / ⌘+Z" label="Undo" />
            <KbdHint kbd="Y / ⌘+Y" label="Redo" />
            <KbdHint kbd="1-7" label="Tools" />
            <KbdHint kbd="+/-" label="Zoom" />
            <KbdHint kbd={<div className="flex items-center gap-1">Del / <Delete02Icon size={10} strokeWidth={2} /></div>} label="Delete" />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-text/5 flex items-center justify-between opacity-40">
           <span className="text-[7px] font-mono uppercase tracking-tighter text-text">Laurianna Flow</span>
        </div>
      </div>
    </div>
  );
};

const MouseHint = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-10 h-10 rounded-xl bg-text/5 border border-text/10 flex items-center justify-center text-text/80">
      {icon}
    </div>
    <span className="text-[8px] font-medium text-text/50 uppercase tracking-tighter">{label}</span>
  </div>
);

const KbdHint = ({ kbd, label }: { kbd: React.ReactNode, label: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[9px] text-text/40 font-medium">{label}</span>
    <div className="px-1.5 py-0.5 rounded bg-text/10 border border-text/10 text-[8px] font-mono text-text min-w-[24px] flex items-center justify-center">
      {kbd}
    </div>
  </div>
);
