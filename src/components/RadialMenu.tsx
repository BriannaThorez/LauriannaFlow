import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useFlowchartStore } from '../shared/utils/store';
import { getMenuOffset } from '../shared/utils/layout';
import { Palette, Trash2, Type, MoreHorizontal, Mouse, GlassWater, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import themes from '../shared/themes/color_palettes.json';

interface RadialMenuProps {
  shapeId: string;
}

type MenuType = 'main' | 'color' | 'material';

interface MenuItemProps {
  id: string;
  icon: React.ReactNode;
  label?: string;
  action: () => void;
  index: number;
  total: number;
  radius: number;
  color?: string;
}

const MenuItem = React.memo(({ icon, label, action, index, total, radius, color }: MenuItemProps) => {
  const setIsPanning = useFlowchartStore(state => state.setIsPanning);
  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    e.stopPropagation();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (!pointerStartRef.current) return;
    
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) {
      action();
    }
    
    pointerStartRef.current = null;
    e.stopPropagation();
  };

  return (
    <motion.button
      initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
      animate={{ scale: 1, x, y, opacity: 1 }}
      exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 600 }}
      aria-label={label || 'Menu Item'}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`absolute w-40 h-40 -ml-20 -mt-20 rounded-full border flex flex-col items-center justify-center shadow-lg transition-all group will-change-transform ${
        color 
          ? 'border-white/30 hover:scale-125 hover:border-white' 
          : 'bg-background border-text/20 text-text hover:bg-primary hover:text-background hover:border-accent'
      }`}
      style={color ? { backgroundColor: color, boxShadow: `0 0 60px ${color}66` } : {}}
    >
      <div className="scale-[4]">
        {icon}
      </div>
      {label && (
        <span className="absolute -bottom-28 left-1/2 -translate-x-1/2 text-[36px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-text drop-shadow-[0_0_10px_var(--background)]">
          {label}
        </span>
      )}
    </motion.button>
  );
});

export const RadialMenu: React.FC<RadialMenuProps> = ({ shapeId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStack, setMenuStack] = useState<MenuType[]>(['main']);
  const updateShape = useFlowchartStore(state => state.updateShape);
  const deleteShape = useFlowchartStore(state => state.deleteShape);
  const shapes = useFlowchartStore(state => state.shapes);
  const setSelectedId = useFlowchartStore(state => state.setSelectedId);
  const setIsPanning = useFlowchartStore(state => state.setIsPanning);
  const themeName = useFlowchartStore(state => state.themeName);
  
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  const themeColors = useMemo(() => [
    currentTheme.primary,
    currentTheme.secondary,
    currentTheme.accent,
    currentTheme.neutral_light,
    currentTheme.neutral_dark,
  ], [currentTheme]);

  const activeMenu = menuStack[menuStack.length - 1];
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
      setMenuStack(['main']);
    } else {
      setIsOpen(false);
    }
  }, [isOpen]);

  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);

  const handleTriggerPointerDown = (e: React.PointerEvent) => {
    // Record start position
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    e.stopPropagation();
  };

  const handleTriggerPointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (!pointerStartRef.current) return;
    
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If moved more than 5 pixels, assume it's a drag/pan and don't toggle
    if (distance < 5) {
      handleToggle(e as any);
    }
    
    pointerStartRef.current = null;
    e.stopPropagation();
  };

  const goBack = useCallback(() => {
    if (menuStack.length > 1) {
      setMenuStack(prev => prev.slice(0, -1));
    } else {
      setIsOpen(false);
    }
  }, [menuStack]);

  // Global right-click handler for "outside radius" logic
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left;
      const centerY = rect.top;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Radius of the menu is 240, plus button radius (80) and some buffer
      const menuRadius = 350; 

      if (distance > menuRadius) {
        setIsOpen(false);
      } else {
        goBack();
      }
    };

    window.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
  }, [isOpen, goBack]);

  const handleColorSelect = useCallback((color: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    const newThemeColors = { ...(shape?.themeColors || {}), [themeName]: color };
    updateShape(shapeId, { themeColors: newThemeColors, color }); // color as fallback
    setIsOpen(false);
  }, [shapeId, updateShape, themeName, shapes]);

  const handleMaterialSelect = useCallback((material: 'plastic' | 'glass') => {
    updateShape(shapeId, { material });
    setIsOpen(false);
  }, [shapeId, updateShape]);

  const mainItems = useMemo(() => [
    { id: 'color', icon: <Palette size={18} />, label: 'Color', action: () => setMenuStack(prev => [...prev, 'color']) },
    { id: 'material', icon: <GlassWater size={18} />, label: 'Material', action: () => setMenuStack(prev => [...prev, 'material']) },
    { id: 'delete', icon: <Trash2 size={18} />, label: 'Delete', action: () => deleteShape(shapeId) },
    { id: 'text', icon: <Type size={18} />, label: 'Edit', action: () => useFlowchartStore.getState().setEditingId(shapeId) },
  ], [shapeId, deleteShape]);

  const materialItems = useMemo(() => [
    { id: 'plastic', icon: <Box size={18} />, label: 'Matte Plastic', action: () => handleMaterialSelect('plastic') },
    { id: 'glass', icon: <GlassWater size={18} />, label: 'Polished Glass', action: () => handleMaterialSelect('glass') },
  ], [handleMaterialSelect]);

  const radius = 240;

  return (
    <div 
      ref={containerRef}
      className="absolute pointer-events-auto"
      style={{
        zIndex: 5000,
        width: 0,
        height: 0
      }}
    >
      {/* Main Trigger Button - Centered on anchor */}
      <motion.button
        whileHover={{ scale: 1.1, boxShadow: '0 0 100px rgba(var(--accent-rgb),0.8)' }}
        whileTap={{ scale: 0.9 }}
        onPointerDown={handleTriggerPointerDown}
        onPointerUp={handleTriggerPointerUp}
        className={`absolute w-40 h-40 -ml-20 -mt-20 rounded-full bg-background border-[8px] flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'border-accent text-accent shadow-[0_20px_50px_rgba(0,0,0,0.4)]' : 'border-text/20 text-text shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
        } z-20`}
      >
        <div className="scale-[4]">
          {isOpen ? <Mouse size={20} className="text-accent" /> : <MoreHorizontal size={22} className="text-text" />}
        </div>
      </motion.button>

      {/* Radial Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key={activeMenu}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.08 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-0 left-0"
          >
            {activeMenu === 'main' && mainItems.map((item, index) => (
              <MenuItem 
                key={item.id}
                {...item}
                index={index}
                total={mainItems.length}
                radius={radius}
              />
            ))}

            {activeMenu === 'color' && themeColors.map((color, index) => (
              <MenuItem 
                key={color}
                id={color}
                icon={null}
                color={color}
                action={() => handleColorSelect(color)}
                index={index}
                total={themeColors.length}
                radius={radius}
              />
            ))}

            {activeMenu === 'material' && materialItems.map((item, index) => (
              <MenuItem 
                key={item.id}
                {...item}
                index={index}
                total={materialItems.length}
                radius={radius}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
