import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartTooltipProps {
  children: React.ReactNode;
  content: string;
  description?: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({ 
  children, 
  content, 
  description, 
  shortcut,
  position = 'right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      switch (position) {
        case 'right':
          x = rect.right + 12;
          y = rect.top + rect.height / 2;
          break;
        case 'left':
          x = rect.left - 12;
          y = rect.top + rect.height / 2;
          break;
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 12;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 12;
          break;
      }
      setCoords({ x, y });
    }
  };

  // Use layout effect for initial positioning to avoid flicker
  useLayoutEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  const variants = {
    initial: { 
      opacity: 0, 
      scale: 0.95, 
      x: position === 'right' ? -10 : position === 'left' ? 10 : 0,
      y: position === 'bottom' ? -10 : position === 'top' ? 10 : 0,
      filter: 'blur(10px)'
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      x: 0, 
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      filter: 'blur(10px)',
      transition: { duration: 0.15 }
    }
  };

  const tooltipContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: position === 'right' || position === 'left' ? 'translateY(-50%)' : 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
          className="flex items-center"
        >
          {/* Arrow */}
          {position === 'right' && <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-primary/20 mr-[-1px]" />}
          {position === 'left' && <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-primary/20 ml-[-1px] order-2" />}
          {position === 'top' && <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-primary/20 mt-[-1px] order-2" />}
          {position === 'bottom' && <div className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-primary/20 mb-[-1px]" />}

          <div className="bg-background/90 backdrop-blur-2xl border border-primary/30 rounded-xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)] min-w-[160px] relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/10 blur-3xl rounded-full" />
            
            <div className="flex flex-col gap-1.5 relative z-10">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-text tracking-tight uppercase">{content}</span>
                {shortcut && (
                  <span className="px-1.5 py-0.5 rounded bg-text/10 border border-text/5 text-[9px] font-mono text-primary font-bold">
                    {shortcut}
                  </span>
                )}
              </div>
              
              {description && (
                <p className="text-[10px] text-text/50 leading-relaxed font-medium max-w-[180px]">
                  {description}
                </p>
              )}
            </div>

            {/* Animated border line */}
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent origin-center"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div 
      ref={triggerRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(false)}
      className="relative inline-block"
    >
      {children}
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </div>
  );
};
