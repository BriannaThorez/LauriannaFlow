# PaletteIngestSkill: Industry-Leading Color Mapping

This document outlines the methodology for transforming a raw color palette into a functional UI theme. This process ensures accessibility, visual hierarchy, and aesthetic cohesion.

## 1. The Axiomatic Framework: Semantic Role Assignment

UI themes are not just collections of colors; they are systems of functional roles. We map colors based on their **Luminance (L)** and **Chroma (C)**.

### Role Definitions:
- **Background (Base):** The foundation. Usually the most extreme luminance value (L < 15% for Dark, L > 85% for Light).
- **Text (Ink):** The primary data carrier. Must maintain a WCAG contrast ratio of at least 4.5:1 against the Background.
- **Primary (Brand):** The core identity. Used for main interactive elements and structural borders.
- **Secondary (Muted):** Used for secondary information, inactive states, or subtle dividers.
- **Highlight (Accent):** The "Call to Action" (CTA). Usually the color with the highest relative saturation or the most distinct hue.

---

## 2. The Analysis Process (Cozy Cabin Case Study)

Given a 5-color palette (Left to Right: 1, 2, 3, 4, 5):

### Step A: Luminance Sorting
1. **Color 2 (Lightest):** High L. Ideal for Text (in dark mode) or Background (in light mode).
2. **Color 5 (Darkest):** Low L. Ideal for Background (in dark mode).
3. **Colors 1, 3, 4:** Mid-tones.

### Step B: Saturation & Warmth Analysis
- **Color 4:** Highest warmth/saturation. It draws the eye immediately. **Role: Highlight.**
- **Color 3:** Solid mid-tone with strong "cabin" character. **Role: Primary.**
- **Color 1:** Muted, desaturated olive-brown. **Role: Secondary.**

### Step C: Contrast Verification
- **Background (5) vs. Text (2):** Dark Charcoal vs. Light Taupe. This provides excellent readability and reduces eye strain.

---

## 3. Implementation Logic

When ingesting a new palette, follow this heuristic:

1. **Identify the Poles:** Find the darkest and lightest colors. Assign one to `background` and the other to `text` based on the desired theme mode (Dark/Light).
2. **Identify the "Pop":** Find the color with the highest saturation or most unique hue. Assign to `highlight`.
3. **Identify the "Soul":** Find the color that best represents the theme's name (e.g., the warm wood of "Cozy Cabin"). Assign to `primary`.
4. **Fill the Gap:** Use the remaining color for `secondary` to provide depth and nuance.

## 4. Typography Integration
- **Serif Fonts:** Pair with organic/warm palettes (like Cozy Cabin) to enhance the "editorial" or "human" feel.
- **Sans-Serif Fonts:** Pair with high-contrast/neon palettes (like Neon Teal) for a "technical" or "modern" feel.
