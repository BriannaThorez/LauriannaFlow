import { Shape, Link, PortType } from './store';

export const generateSVG = (shapes: Shape[], links: Link[], theme: any, themeName: string): string => {
  if (shapes.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
  }

  const isDark = theme.mode === 'dark';
  const bgColor = isDark ? theme.neutral_dark : theme.neutral_light;
  const textColor = isDark ? theme.neutral_light : theme.neutral_dark;
  const linkColor = isDark ? theme.neutral_light : theme.neutral_dark;

  // Calculate bounding box (with inverted Y for SVG)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.forEach(s => {
    const [x, y] = s.position;
    const svgY = -y;
    const [w, h] = s.size;
    const radius = Math.sqrt(w * w + h * h) / 2;
    minX = Math.min(minX, x - radius);
    minY = Math.min(minY, svgY - radius);
    maxX = Math.max(maxX, x + radius);
    maxY = Math.max(maxY, svgY + radius);
  });

  // Add padding
  const padding = 60;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  const width = maxX - minX;
  const height = maxY - minY;

  const getPortPos = (shape: Shape, port?: PortType): [number, number] => {
    const [x, y] = shape.position;
    if (!port) return [x, -y];
    
    const [w, h] = shape.size;
    const rotation = shape.rotation || 0;
    
    let localX = 0;
    let localY = 0;
    
    switch (port) {
      case 'top': localY = h / 2; break;
      case 'bottom': localY = -h / 2; break;
      case 'left': localX = -w / 2; break;
      case 'right': localX = w / 2; break;
    }
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    
    return [x + rotatedX, -(y + rotatedY)];
  };

  const svgLines = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width * 10}" height="${height * 10}" style="background-color: ${bgColor};">`,
    '  <defs>',
    '    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">',
    '      <feGaussianBlur stdDeviation="0.5" result="blur1" />',
    '      <feGaussianBlur stdDeviation="1.5" result="blur2" />',
    '      <feMerge>',
    '        <feMergeNode in="blur2" />',
    '        <feMergeNode in="blur1" />',
    '        <feMergeNode in="SourceGraphic" />',
    '      </feMerge>',
    '    </filter>',
    '    <style type="text/css">',
    '      <![CDATA[',
    "        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
    `        .link { fill: none; stroke: ${linkColor}; stroke-width: 0.4; opacity: 0.9; }`,
    `        .text { fill: ${textColor}; font-family: 'Inter', sans-serif; font-size: 2px; font-weight: 500; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }`,
    '      ]]>',
    '    </style>',
    '  </defs>',
    `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />`,
  ];

  // Draw links
  links.forEach(l => {
    const fromShape = shapes.find(s => s.id === l.from);
    const toShape = shapes.find(s => s.id === l.to);
    if (!fromShape || !toShape) return;

    const [x1, y1] = getPortPos(fromShape, l.fromPort);
    const [x2, y2] = getPortPos(toShape, l.toPort);
    
    const getOffset = (port?: PortType, rotation: number = 0) => {
      if (!port) return [0, 0];
      let ox = 0;
      let oy = 0;
      switch (port) {
        case 'top': oy = 10; break;
        case 'bottom': oy = -10; break;
        case 'left': ox = -10; break;
        case 'right': ox = 10; break;
      }
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      // Invert Y offset for SVG
      return [ox * cos - oy * sin, -(ox * sin + oy * cos)];
    };
    
    const off1 = getOffset(l.fromPort, fromShape.rotation || 0);
    const off2 = getOffset(l.toPort, toShape.rotation || 0);
    
    const cp1x = x1 + off1[0];
    const cp1y = y1 + off1[1];
    const cp2x = x2 + off2[0];
    const cp2y = y2 + off2[1];

    svgLines.push(`  <path d="M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}" class="link" />`);
  });

  // Draw shapes
  shapes.forEach(s => {
    const [x, y] = s.position;
    const svgY = -y;
    const [w, h] = s.size;
    const rotationDeg = -(s.rotation || 0) * (180 / Math.PI); // Invert rotation for SVG
    
    const shapeColor = s.themeColors?.[themeName] || s.color || theme.primary || '#22d3ee';
    const isGlass = s.material === 'glass';
    const fillOpacity = s.type === 'text' ? 0 : (isGlass ? 0.9 : 1.0);
    const strokeWidth = s.type === 'text' ? 0 : 0.2;
    
    const fillStyle = `fill="${shapeColor}" fill-opacity="${fillOpacity}" stroke="${shapeColor}" stroke-width="${strokeWidth}" filter="url(#glow)"`;
    const lineStyle = `stroke="${shapeColor}" stroke-width="${strokeWidth}" filter="url(#glow)"`;
    
    let shapeSvg = '';
    let internalLinesSvg = '';
    
    // Helper for polygon points (centered at 0,0)
    const poly = (pts: number[][]) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" ${fillStyle} />`;

    switch (s.type) {
      case 'box':
      case 'text':
        shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" ${fillStyle} />`;
        break;
      case 'diamond':
        shapeSvg = poly([[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]]);
        break;
      case 'circle':
        shapeSvg = `<ellipse cx="0" cy="0" rx="${Math.min(w, h) / 2}" ry="${Math.min(w, h) / 2}" ${fillStyle} />`;
        break;
      case 'parallelogram':
        const sk = w * 0.2;
        shapeSvg = poly([[-w / 2 + sk, -h / 2], [w / 2, -h / 2], [w / 2 - sk, h / 2], [-w / 2, h / 2]]);
        break;
      case 'cylinder':
        const cyRx = w / 2;
        const cyRy = h * 0.15;
        shapeSvg = `
          <path d="M ${-cyRx} ${-h/2 + cyRy} L ${-cyRx} ${h/2 - cyRy} A ${cyRx} ${cyRy} 0 0 0 ${cyRx} ${h/2 - cyRy} L ${cyRx} ${-h/2 + cyRy} A ${cyRx} ${cyRy} 0 0 1 ${-cyRx} ${-h/2 + cyRy} Z" ${fillStyle} />
          <ellipse cx="0" cy="${-h/2 + cyRy}" rx="${cyRx}" ry="${cyRy}" ${fillStyle} />
        `;
        break;
      case 'document':
        shapeSvg = `
          <path d="M ${-w/2} ${-h/2} L ${w/2} ${-h/2} L ${w/2} ${h/2 - h*0.1} Q ${w/4} ${h/2 + h*0.1} 0 ${h/2 - h*0.1} T ${-w/2} ${h/2 - h*0.1} Z" ${fillStyle} />
        `;
        break;
      case 'hexagon':
        const hexW = w / 2;
        const hexH = h / 2;
        shapeSvg = poly([[-hexW + hexH*0.5, -hexH], [hexW - hexH*0.5, -hexH], [hexW, 0], [hexW - hexH*0.5, hexH], [-hexW + hexH*0.5, hexH], [-hexW, 0]]);
        break;
      case 'trapezoid':
        shapeSvg = poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w * 0.35, h / 2], [-w * 0.35, h / 2]]);
        break;
      case 'terminal':
        shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" ${fillStyle} />`;
        break;
      case 'predefined_process':
        shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" ${fillStyle} />`;
        internalLinesSvg = `
          <line x1="${-w/2 + w*0.125}" y1="${-h/2}" x2="${-w/2 + w*0.125}" y2="${h/2}" ${lineStyle} />
          <line x1="${w/2 - w*0.125}" y1="${-h/2}" x2="${w/2 - w*0.125}" y2="${h/2}" ${lineStyle} />
        `;
        break;
      case 'internal_storage':
        shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" ${fillStyle} />`;
        internalLinesSvg = `
          <line x1="${-w/2}" y1="${-h/2 + h*0.25}" x2="${w/2}" y2="${-h/2 + h*0.25}" ${lineStyle} />
          <line x1="${-w/2 + w*0.25}" y1="${-h/2}" x2="${-w/2 + w*0.25}" y2="${h/2}" ${lineStyle} />
        `;
        break;
      case 'manual_input':
        shapeSvg = poly([[-w / 2, -h / 2 + h * 0.2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
        break;
      case 'display':
        shapeSvg = `
          <path d="M ${-w/2 + w*0.2} ${-h/2} L ${w/2 - h/2} ${-h/2} A ${h/2} ${h/2} 0 0 1 ${w/2 - h/2} ${h/2} L ${-w/2 + w*0.2} ${h/2} L ${-w/2} 0 Z" ${fillStyle} />
        `;
        break;
      case 'or':
        const rOr = Math.min(w, h) / 2;
        shapeSvg = `<circle cx="0" cy="0" r="${rOr}" ${fillStyle} />`;
        internalLinesSvg = `
          <line x1="0" y1="${-rOr}" x2="0" y2="${rOr}" ${lineStyle} />
          <line x1="${-rOr}" y1="0" x2="${rOr}" y2="0" ${lineStyle} />
        `;
        break;
      case 'summing_junction':
        const rSum = Math.min(w, h) / 2;
        const offset = rSum * 0.707;
        shapeSvg = `<circle cx="0" cy="0" r="${rSum}" ${fillStyle} />`;
        internalLinesSvg = `
          <line x1="${-offset}" y1="${-offset}" x2="${offset}" y2="${offset}" ${lineStyle} />
          <line x1="${-offset}" y1="${offset}" x2="${offset}" y2="${-offset}" ${lineStyle} />
        `;
        break;
      case 'off_page_connector':
        shapeSvg = poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h * 0.1], [0, h / 2], [-w / 2, h * 0.1]]);
        break;
      default:
        shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" ${fillStyle} />`;
    }

    svgLines.push(`  <g transform="translate(${x}, ${svgY}) rotate(${rotationDeg})">`);
    svgLines.push(`    ${shapeSvg}`);
    if (internalLinesSvg) {
      svgLines.push(`    ${internalLinesSvg}`);
    }
    
    if (s.text) {
      // Split text by newlines and render multiple tspan elements
      const lines = s.text.split('\\n');
      const lineHeight = 2.5;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      svgLines.push(`    <text class="text">`);
      lines.forEach((line, i) => {
        svgLines.push(`      <tspan x="0" y="${startY + i * lineHeight}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</tspan>`);
      });
      svgLines.push(`    </text>`);
    }
    
    svgLines.push(`  </g>`);
  });

  svgLines.push('</svg>');
  return svgLines.join('\n');
};
