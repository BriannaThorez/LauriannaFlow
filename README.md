# Laurianna Flow

## Overview
Laurianna Flow is a high-performance, WebGL-based diagramming and brainstorming environment designed for the next generation of software architecture and system design. Built on a foundation of **Signed Distance Fields (SDFs)** and **GPU-accelerated rendering**, it offers a level of visual precision and interaction velocity that traditional SVG-based tools cannot match.

## Purpose
To provide a "Triple-A" production environment where technical performance meets elite UX. Laurianna Flow is built for engineers and designers who need to map out complex systems without the friction of pixelation, lag, or limited geometry.

## Key Features

### Industry-Standard Controls
*   **Intuitive Selection & Dragging:** Single-click to select, immediate drag-to-reposition with zero hangup.
*   **Cardinal Link Ports:** 4 interactive handles on every node (Top, Bottom, Left, Right) for rapid connection.
*   **Snap-to-Grid:** Automatic 5-unit grid alignment for perfectly structured diagrams.
*   **Infinite Canvas:** Momentum-based panning and focal zooming for unrestricted brainstorming.
*   **Inline Text Editing:** Double-click any element to edit text directly on the canvas with auto-sizing text boxes.

### Bleeding-Edge Innovation
*   **SDF-Based Rendering:** Infinite zoom without pixelation. Our custom shader engine allows for complex GPU effects like neon glows and fluid shape morphing.
*   **Dynamic "Reach" Navigation:** Seamless camera panning during dragging or linking, allowing you to traverse massive charts without releasing your mouse.
*   **Vertex-Level Geometry:** Beyond standard boxes and circles, our "Vertex Edit" tool allows for bespoke shape manipulation for unique architectural requirements.
*   **High-Performance WebGL Core:** Maintains a consistent 60fps even with thousands of nodes and complex link topologies.

## Industry Comparison

| Program | Standard Controls | Bleeding Edge Features | The Laurianna Flow Advantage |
| :--- | :--- | :--- | :--- |
| **Figma** | `V` (Select), `L` (Link), `Shift+A` (Auto-layout). | Real-time multiplayer, component variants, dev-mode. | **SDF Rendering:** Infinite zoom and GPU effects (glow/morph) that SVG engines can't match. |
| **Miro** | Drag from edge-dots to link. | Smart diagrams, interactive voting, infinite canvas. | **Performance:** 60fps WebGL rendering for massive charts where Miro starts to lag. |
| **Lucidchart** | Drag from red dots, right-angle routing. | Data-linked shapes, automated AWS/Azure mapping. | **Customization:** Vertex-level geometry editing for bespoke software architecture diagrams. |

## Tech Stack
*   **Frontend:** React 18+, Vite
*   **Rendering:** Three.js, @react-three/fiber, @react-three/drei
*   **Shaders:** Custom GLSL (Signed Distance Fields)
*   **State:** Zustand
*   **Styling:** Tailwind CSS

---
*Elevating thought to production speed.*
