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

  float sdDiamond(vec2 p, vec2 b) {
    p = abs(p);
    vec2 p1 = vec2(b.x, 0.0);
    vec2 p2 = vec2(0.0, b.y);
    vec2 v = p2 - p1;
    vec2 n = normalize(vec2(-v.y, v.x));
    
    float dSlant = dot(p - p1, n);
    
    if (dot(p - p1, -v) > 0.0) return length(p - p1);
    if (dot(p - p2, v) > 0.0) return length(p - p2);
    
    return dSlant;
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

  float sdHexagon(vec2 p, vec2 b) {
    p = abs(p);
    vec2 p1 = vec2(b.x, 0.0);
    vec2 p2 = vec2(b.x - b.y*0.5, b.y);
    vec2 v = p2 - p1;
    vec2 n = normalize(vec2(-v.y, v.x));
    
    float dSlant = dot(p - p1, n);
    float dTop = p.y - b.y;
    
    if (dSlant > 0.0 && dTop > 0.0) {
        return length(p - p2);
    }
    
    if (dot(p - p1, v) < 0.0) {
        return length(p - p1);
    }
    
    return max(dSlant, dTop);
  }

  float sdTrapezoid(vec2 p, float r1, float r2, float he) {
    vec2 k1 = vec2(r2, he);
    vec2 k2 = vec2(r2 - r1, 2.0 * he);
    p.x = abs(p.x);
    vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
    vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
    float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
    return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
  }

  float sdCylinder(vec2 p, vec2 b) {
    // Database shape: straight sides, curved bottom, full ellipse at top.
    // We'll use a simple quadratic curve for the top and bottom.
    float curve = b.y * 0.2;
    
    // The silhouette:
    // Top edge: y = b.y - curve + curve * (1 - (x/b.x)^2) = b.y - curve*(x/b.x)^2
    // Bottom edge: y = -b.y + curve - curve * (1 - (x/b.x)^2) = -b.y + curve*(x/b.x)^2
    
    float x2 = (p.x / b.x) * (p.x / b.x);
    float y_distort = curve * x2;
    
    vec2 q = vec2(abs(p.x), abs(p.y) + y_distort);
    vec2 d = q - b;
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
  
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  float sdPredefinedProcess(vec2 p, vec2 b) {
    float d = sdBox(p, b);
    float line1 = abs(p.x - (b.x * 0.8)) - 0.1;
    float line2 = abs(p.x + (b.x * 0.8)) - 0.1;
    // We don't actually "draw" lines in the SDF easily without returning a combined distance
    // But for flowchart symbols, the boundary is what matters.
    // However, to see the lines, we'd need to return them as part of the border logic.
    // For now, let's just return the box distance and we'll handle internal lines in the fragment main if needed.
    return d;
  }

  float sdManualInput(vec2 p, vec2 b) {
    vec2 v1 = vec2(-b.x, b.y * 0.6);
    vec2 v2 = vec2(b.x, b.y);
    vec2 v3 = vec2(b.x, -b.y);
    vec2 v4 = vec2(-b.x, -b.y);
    
    vec2 e1 = v2 - v1; vec2 w1 = p - v1;
    vec2 e2 = v3 - v2; vec2 w2 = p - v2;
    vec2 e3 = v4 - v3; vec2 w3 = p - v3;
    vec2 e4 = v1 - v4; vec2 w4 = p - v4;
    
    vec2 b1 = w1 - e1 * clamp(dot(w1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 b2 = w2 - e2 * clamp(dot(w2, e2) / dot(e2, e2), 0.0, 1.0);
    vec2 b3 = w3 - e3 * clamp(dot(w3, e3) / dot(e3, e3), 0.0, 1.0);
    vec2 b4 = w4 - e4 * clamp(dot(w4, e4) / dot(e4, e4), 0.0, 1.0);
    
    float d = min(min(dot(b1, b1), dot(b2, b2)), min(dot(b3, b3), dot(b4, b4)));
    
    bool inside = (p.y - v1.y < (v2.y - v1.y) * (p.x - v1.x) / (v2.x - v1.x)) &&
                  (p.x < b.x) &&
                  (p.y > -b.y) &&
                  (p.x > -b.x);
                  
    return (inside ? -1.0 : 1.0) * sqrt(d);
  }

  float sdDisplay(vec2 p, vec2 b) {
    if (p.x > b.x - b.y) {
        return length(vec2(p.x - (b.x - b.y), p.y)) - b.y;
    }
    
    float tipX = -b.x;
    float cornerX = -b.x + b.x * 0.4;
    
    vec2 p1 = vec2(tipX, 0.0);
    vec2 p2 = vec2(cornerX, b.y);
    vec2 v = p2 - p1;
    vec2 n = normalize(vec2(-v.y, v.x));
    
    vec2 q = vec2(p.x, abs(p.y));
    
    float dSlant = dot(q - p1, n);
    float dTop = q.y - b.y;
    
    if (dSlant > 0.0 && dTop > 0.0) {
        return length(q - p2);
    }
    
    if (dot(q - p1, v) < 0.0) {
        return length(q - p1);
    }
    
    return max(dSlant, dTop);
  }

  float sdOffPageConnector(vec2 p, vec2 b) {
    p.x = abs(p.x);
    
    vec2 p1 = vec2(b.x, -b.y*0.2);
    vec2 p2 = vec2(0.0, -b.y);
    vec2 v = p2 - p1;
    vec2 n = normalize(vec2(-v.y, v.x));
    
    float dSlant = dot(p - p1, n);
    float dRight = p.x - b.x;
    float dTop = p.y - b.y;
    
    if (dRight > 0.0 && dTop > 0.0) return length(p - vec2(b.x, b.y));
    if (dRight > 0.0 && dSlant > 0.0) return length(p - p1);
    if (dot(p - p2, v) > 0.0) return length(p - p2);
    
    return max(max(dSlant, dRight), dTop);
  }

  void main() {
    // Calculate position in world units relative to center
    vec2 p = (vUv - 0.5) * vSize;
    float d = 1e10;
    
    // Shape size is derived from vSize, leaving a margin for the glow
    // We assume the intended visual size is vSize - 12.0 (6 units padding on each side)
    vec2 shapeSize = max(vSize - 12.0, vec2(2.0));
    vec2 b = shapeSize * 0.5;
    float internalLines = 1e10;
    
    if (vShapeType < 0.5) {
      d = sdBox(p, b);
    } else if (vShapeType < 1.5) {
      d = sdDiamond(p, b);
    } else if (vShapeType < 2.5) {
      d = sdCircle(p, min(b.x, b.y));
    } else if (vShapeType < 3.5) {
      d = sdParallelogram(p, b.x * 0.8, b.y, b.x * 0.2);
    } else if (vShapeType < 4.5) {
      d = sdCylinder(p, b);
      float curve = b.y * 0.2;
      float x2 = (p.x / b.x) * (p.x / b.x);
      // Internal line for the bottom of the top ellipse
      // The top edge is at y = b.y - curve * x2
      // The bottom of the top ellipse is at y = b.y - 2.0*curve + curve * x2
      float ellipseBottomY = b.y - 2.0 * curve + curve * x2;
      internalLines = abs(p.y - ellipseBottomY);
      // Only draw the internal line inside the shape
      if (p.x > b.x || p.x < -b.x || p.y > b.y || p.y < -b.y) {
          internalLines = 1e10;
      }
    } else if (vShapeType < 5.5) {
      d = sdDocument(p, b);
    } else if (vShapeType < 6.5) {
      d = sdHexagon(p, b);
    } else if (vShapeType < 7.5) {
      d = sdTrapezoid(p, b.x * 0.7, b.x, b.y);
    } else if (vShapeType < 8.5) {
      d = sdRoundedBox(p, b, b.y); // Terminator
    } else if (vShapeType < 9.5) {
      d = sdBox(p, b); // Predefined Process
      internalLines = min(abs(p.x - (b.x * 0.75)), abs(p.x + (b.x * 0.75)));
    } else if (vShapeType < 10.5) {
      d = sdBox(p, b); // Internal Storage
      internalLines = min(abs(p.x + (b.x * 0.5)), abs(p.y - (b.y * 0.5)));
    } else if (vShapeType < 11.5) {
      d = sdManualInput(p, b);
    } else if (vShapeType < 12.5) {
      d = sdDisplay(p, b);
    } else if (vShapeType < 16.5) {
      d = sdCircle(p, min(b.x, b.y)); // Or
      internalLines = min(abs(p.x), abs(p.y));
    } else if (vShapeType < 17.5) {
      d = sdCircle(p, min(b.x, b.y)); // Summing Junction
      internalLines = min(abs(p.x - p.y), abs(p.x + p.y)) * 0.707;
    } else if (vShapeType < 18.5) {
      d = sdOffPageConnector(p, b); // Off-page connector
    } else {
      d = sdBox(p, b);
    }
    
    // Crisp edge (in world units)
    float edge = 1.0 - smoothstep(0.0, 0.2, d);
    
    // Crisp Outline/Border
    float borderSize = 0.08; // Much thinner for elegance
    float border = smoothstep(borderSize, 0.0, abs(d + borderSize * 0.5));
    
    // Add internal lines to border (only if inside the shape)
    if (d < 0.0 && internalLines < 1e9) {
        float internalBorder = smoothstep(borderSize, 0.0, internalLines);
        border = max(border, internalBorder);
    }
    
    // Neon Glow - tight and crisp falloff (only outside the shape)
    float glow = exp(-2.5 * max(d + borderSize, 0.0)) * (1.0 - edge);
    
    // Professional Dotted/Dashed Selection Indicator
    // Use world units for the selection ring to keep it consistent
    float perimeter = (vSize.x + vSize.y) * 2.0;
    
    // Approximate perimeter coordinate for dashing
    float pCoord = (atan(p.y, p.x) / 6.28318 + 0.5) * perimeter;
    float dashPattern = step(0.5, fract(pCoord * 0.4 - uTime * 2.0)); 
    
    // Selection ring: very thin line exactly at the edge
    float selectionRing = smoothstep(0.15, 0.0, abs(d - 0.05)); 
    float dottedOutline = vIsSelected * selectionRing * dashPattern;
    
    // Selection effects
    vec3 selectionColor = vec3(1.0) * dottedOutline * 2.0;
    
    // Base color for the shape itself
    vec3 baseColor = mix(vec3(0.0), vColor, edge);
    
    // Add border color (slightly brighter or darker version of vColor)
    vec3 borderColor = vColor * 1.5;
    baseColor = mix(baseColor, borderColor, border * (1.0 - edge));
    
    // Material specific logic
    float isGlass = vMaterial; // 1.0 for glass, 0.0 for plastic
    float surfaceNoise = noise(vUv * 50.0 + uTime * 0.05);
    
    // PBR Overrides
    csm_Roughness = mix(0.6 + surfaceNoise * 0.1, 0.05 + surfaceNoise * 0.02, isGlass);
    csm_Metalness = mix(0.0, 0.2, isGlass);
    
    // Opacity: Glass is 90% opaque, Plastic is 100%
    float materialAlpha = mix(1.0, 0.9, isGlass);
    float alpha = (edge + border + glow * 0.4 + dottedOutline) * vOpacity * materialAlpha;
    
    csm_DiffuseColor = vec4(baseColor, alpha);
    
    // Emissive for the neon glow and selection effects
    vec3 glowColor = vColor * glow * 0.5;
    csm_Emissive = glowColor + selectionColor + borderColor * border * 0.5;
  }
`;
