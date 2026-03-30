import { Shape, Link, PortType } from './store';

export const generateSVG = (shapes: Shape[], links: Link[], theme: any): string => {
  if (shapes.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
  }

  const bgColor = theme.neutral_dark || '#050505';
  const primaryColor = theme.primary || '#22d3ee';
  const textColor = theme.mode === 'dark' ? '#ffffff' : '#000000';

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.forEach(s => {
    const [x, y] = s.position;
    const [w, h] = s.size;
    minX = Math.min(minX, x - w / 2);
    minY = Math.min(minY, y - h / 2);
    maxX = Math.max(maxX, x + w / 2);
    maxY = Math.max(maxY, y + h / 2);
  });

  // Add padding
  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  const width = maxX - minX;
  const height = maxY - minY;

  const getPortPos = (shapeId: string, port?: PortType): [number, number] => {
    const s = shapes.find(sh => sh.id === shapeId);
    if (!s) return [0, 0];
    const [x, y] = s.position;
    const [w, h] = s.size;
    if (!port) return [x, y];
    switch (port) {
      case 'top': return [x, y - h / 2];
      case 'bottom': return [x, y + h / 2];
      case 'left': return [x - w / 2, y];
      case 'right': return [x + w / 2, y];
      default: return [x, y];
    }
  };

  const svgLines = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width * 10}" height="${height * 10}" style="background-color: ${bgColor};">`,
    '  <defs>',
    '    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">',
    '      <feGaussianBlur stdDeviation="1.5" result="blur1" />',
    '      <feGaussianBlur stdDeviation="3" result="blur2" />',
    '      <feMerge>',
    '        <feMergeNode in="blur2" />',
    '        <feMergeNode in="blur1" />',
    '        <feMergeNode in="SourceGraphic" />',
    '      </feMerge>',
    '    </filter>',
    '    <style type="text/css">',
    '      <![CDATA[',
    "        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');",
    `        .shape { fill: ${bgColor}; fill-opacity: 0.95; stroke: ${primaryColor}; stroke-width: 0.4; filter: url(#glow); }`,
    `        .link { fill: none; stroke: ${primaryColor}; stroke-width: 0.25; stroke-dasharray: 0.8, 0.8; filter: url(#glow); opacity: 0.8; }`,
    `        .text { fill: ${textColor}; font-family: 'Inter', sans-serif; font-size: 2.5px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }`,
    '      ]]>',
    '    </style>',
    '  </defs>',
    `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />`,
  ];

  // Draw links
  links.forEach(l => {
    const [x1, y1] = getPortPos(l.from, l.fromPort);
    const [x2, y2] = getPortPos(l.to, l.toPort);
    svgLines.push(`  <path d="M ${x1} ${y1} L ${x2} ${y2}" class="link" />`);
  });

  // Draw shapes
  shapes.forEach(s => {
    const [x, y] = s.position;
    const [w, h] = s.size;
    let shapeSvg = '';
    const shapeColor = s.color || '#22d3ee';
    const fillStyle = s.color ? `style="stroke: ${shapeColor}; fill: ${shapeColor}33;"` : '';
    
    if (s.type === 'box') {
      shapeSvg = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="1" class="shape" ${fillStyle} />`;
    } else if (s.type === 'diamond') {
      const pts = [[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]].map(p => p.join(',')).join(' ');
      shapeSvg = `<polygon points="${pts}" class="shape" ${fillStyle} />`;
    } else if (s.type === 'circle') {
      shapeSvg = `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" class="shape" ${fillStyle} />`;
    }

    const textSvg = s.text ? `<text x="${x}" y="${y}" class="text">${escapeXml(s.text)}</text>` : '';
    svgLines.push(`  <g id="node-${s.id}">${shapeSvg}${textSvg}</g>`);
  });

  svgLines.push('</svg>');

  return svgLines.join('\n');
};

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}
