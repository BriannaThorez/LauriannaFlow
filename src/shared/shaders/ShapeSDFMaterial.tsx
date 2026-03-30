import * as THREE from 'three';

export const ShapeSDFUniforms = {
  uColor: new THREE.Color('#22d3ee'),
  uShapeType: 0.0,
  uTime: 0.0,
  uOpacity: 1.0,
  uIsSelected: 0.0,
  uSize: new THREE.Vector2(20, 15),
};

export const ShapeSDFVertexShader = `
  attribute vec3 aColor;
  attribute float aShapeType;
  attribute float aIsSelected;
  attribute vec2 aSize;
  attribute float aOpacity;
  attribute float aMaterial;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vShapeType;
  varying float vIsSelected;
  varying vec2 vSize;
  varying float vOpacity;
  varying float vMaterial;

  void main() {
    vUv = uv;
    vColor = aColor;
    vShapeType = aShapeType;
    vIsSelected = aIsSelected;
    vSize = aSize;
    vOpacity = aOpacity;
    vMaterial = aMaterial;
  }
`;

export const ShapeSDFFragmentShader = `
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vShapeType;
  varying float vIsSelected;
  varying vec2 vSize;
  varying float vOpacity;
  varying float vMaterial;
  
  uniform float uTime;

  // Procedural Noise for Surface Imperfections
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float sdDiamond(vec2 p, float r) {
    return (abs(p.x) + abs(p.y)) - r;
  }

  float sdCircle(vec2 p, float r) {
    return length(p) - r;
  }

  float sdParallelogram(vec2 p, float wi, float he, float sk) {
    vec2 e = vec2(sk, he);
    p = (p.y < 0.0) ? -p : p;
    vec2  v = p - vec2(max(p.x - sk, -wi), he);
    float d = dot(v, v);
    float s = p.x * e.y - p.y * e.x;
    if (p.x > sk && p.y < he && s > -wi * e.y) d = -min(d, (s*s) / dot(e, e));
    return sqrt(d) * sign(max(abs(p.x - sk) - wi, p.y - he));
  }

  float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
  }

  float sdTrapezoid(vec2 p, float r1, float r2, float he) {
    vec2 k1 = vec2(r2, he);
    vec2 k2 = vec2(r2 - r1, 2.0 * he);
    p.x = abs(p.x);
    vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
    vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
    float s = (cb.y < 0.0 && ca.x > 0.0) ? -1.0 : 1.0;
    return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
  }

  float sdCylinder(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float sdDocument(vec2 p, vec2 b) {
    float d = sdBox(p, b);
    float wave = 0.5 * sin(p.x * 1.5);
    if (p.y < -b.y + 1.0) {
        d = max(d, -(p.y + b.y - 1.0 + wave));
    }
    return d;
  }
  
  void main() {
    // Calculate position in world units relative to center
    vec2 p = (vUv - 0.5) * vSize;
    float d = 1e10;
    
    // Shape size is derived from vSize, leaving a margin for the glow
    // We assume the intended visual size is vSize - 12.0 (6 units padding on each side)
    vec2 shapeSize = max(vSize - 12.0, vec2(2.0));
    
    if (vShapeType < 0.5) {
      d = sdBox(p, shapeSize * 0.5);
    } else if (vShapeType < 1.5) {
      d = sdDiamond(p, shapeSize.x * 0.4);
    } else if (vShapeType < 2.5) {
      d = sdCircle(p, shapeSize.y * 0.4);
    } else if (vShapeType < 3.5) {
      d = sdParallelogram(p, shapeSize.x * 0.4, shapeSize.y * 0.4, shapeSize.x * 0.1);
    } else if (vShapeType < 4.5) {
      d = sdBox(p, shapeSize * 0.4); // Cylinder fallback for now
    } else if (vShapeType < 5.5) {
      d = sdDocument(p, shapeSize * 0.4);
    } else if (vShapeType < 6.5) {
      d = sdHexagon(p, shapeSize.y * 0.4);
    } else {
      d = sdTrapezoid(p, shapeSize.x * 0.4, shapeSize.x * 0.3, shapeSize.y * 0.4);
    }
    
    // Crisp edge (in world units)
    float edge = 1.0 - smoothstep(0.0, 0.2, d);
    
    // Neon Glow - tight and crisp falloff (only outside the shape)
    float glow = exp(-1.2 * max(d, 0.0)) * (1.0 - edge);
    
    // Industry-Leading Dotted Selection Indicator
    // Use world units for the selection ring to keep it consistent
    float angle = atan(p.y, p.x);
    float dotPattern = smoothstep(0.4, 0.6, fract(angle * 1.91 - uTime * 1.2)); 
    float selectionRing = smoothstep(0.4, 0.0, abs(d - 0.8));
    float dottedOutline = vIsSelected * selectionRing * dotPattern;
    
    // Soft glow for the dots
    float dottedGlow = vIsSelected * exp(-2.0 * abs(d - 0.8)) * dotPattern;

    // Selection effects
    vec3 selectionColor = vColor * (dottedOutline * 2.0 + dottedGlow * 0.8);
    
    // Base color for the shape itself
    vec3 baseColor = mix(vec3(0.0), vColor, edge);
    
    // Material specific logic
    float isGlass = vMaterial; // 1.0 for glass, 0.0 for plastic
    float surfaceNoise = noise(vUv * 50.0 + uTime * 0.05);
    
    // PBR Overrides
    csm_Roughness = mix(0.6 + surfaceNoise * 0.1, 0.05 + surfaceNoise * 0.02, isGlass);
    csm_Metalness = mix(0.0, 0.2, isGlass);
    
    // Opacity: Glass is 90% opaque, Plastic is 100%
    float materialAlpha = mix(1.0, 0.9, isGlass);
    float alpha = (edge + glow * 0.4 + dottedOutline + dottedGlow) * vOpacity * materialAlpha;
    
    csm_DiffuseColor = vec4(baseColor, alpha);
    
    // Emissive for the neon glow and selection effects (removed inner pulse/glow so materials are visible)
    vec3 glowColor = vColor * glow * 0.5;
    csm_Emissive = glowColor + selectionColor;
  }
`;
