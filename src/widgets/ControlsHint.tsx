import React from 'react';
import { 
  MouseLeftClick01Icon, 
  MouseRightClick01Icon, 
  MouseScroll01Icon,
  KeyboardIcon,
  CommandIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Target01Icon
} from 'hugeicons-react';
import { useFlowchartStore } from '../shared/utils/store';

export const ControlsHint = () => {
  const { activeTool } = useFlowchartStore();

  return (
    <div className="absolute top-4 right-4 bg-background/60 backdrop-blur-2xl border border-primary/10 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-56 pointer-events-none select-none z-50">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.2em] text-primary uppercase font-bold">Laurianna Flow v1.4</span>
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
            <KbdHint kbd="Z" label="Undo" />
            <KbdHint kbd="Y" label="Redo" />
            <KbdHint kbd="1-7" label="Tools" />
            <KbdHint kbd="+/-" label="Zoom" />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-primary/5 flex items-center justify-between opacity-40">
           <CommandIcon size={10} className="text-primary" />
           <span className="text-[7px] font-mono uppercase tracking-tighter text-text">Axiomatic_Engine_Active</span>
        </div>
      </div>
    </div>
  );
};

const MouseHint = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/80">
      {icon}
    </div>
    <span className="text-[8px] font-medium text-text/50 uppercase tracking-tighter">{label}</span>
  </div>
);

const KbdHint = ({ kbd, label }: { kbd: string, label: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[9px] text-text/40 font-medium">{label}</span>
    <div className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/5 text-[8px] font-mono text-primary/90 min-w-[24px] text-center">
      {kbd}
    </div>
  </div>
);
