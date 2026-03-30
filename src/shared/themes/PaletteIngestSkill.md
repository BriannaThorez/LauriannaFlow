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

### Step A: Theme Mode Determination
1. **Analyze Image Background:** The area surrounding the palette bars.
2. **Result:** If the background is **White**, the theme is **Light Mode**. If the background is **Black**, the theme is **Dark Mode**.
3. **Cozy Cabin Case:** The image background is white, therefore it is a **Light Mode** theme.

### Step B: Luminance Sorting & Role Assignment
1. **Background (Base):** In Light Mode, assign the **Lightest color** (Color 2: #c3bbb3) to `background`.
2. **Text (Ink):** In Light Mode, assign the **Darkest color** (Color 5: #403b3a) to `text`.
3. **Primary (Brand):** The core identity (Color 3: #8e735b).
4. **Secondary (Muted):** Supporting tone (Color 1: #7a746a).
5. **Highlight (Accent):** The "Pop" (Color 4: #c8a279).

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
