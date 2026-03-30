import { Shape } from './store';

export const getMenuOffset = (shape: Shape, allShapes: Shape[]) => {
  const others = allShapes.filter(s => s.id !== shape.id);
  const margin = 10;
  const { position, size } = shape;
  
  const checkOverlapAt = (ox: number, oy: number) => {
    const tx = position[0] + ox;
    const ty = position[1] + oy;
    return others.some(s => {
      const dx = Math.abs(s.position[0] - tx);
      const dy = Math.abs(s.position[1] - ty);
      return dx < s.size[0] / 2 + margin && dy < s.size[1] / 2 + margin;
    });
  };

  const baseOffset = { x: size[0] / 2 + 1.5, y: size[1] / 2 + 1.5 };
  const candidates = [
    { x: baseOffset.x, y: baseOffset.y },
    { x: -baseOffset.x, y: baseOffset.y },
    { x: baseOffset.x, y: -baseOffset.y },
    { x: -baseOffset.x, y: -baseOffset.y },
  ];

  for (const cand of candidates) {
    if (!checkOverlapAt(cand.x, cand.y)) {
      return cand;
    }
  }
  return candidates[0];
};
