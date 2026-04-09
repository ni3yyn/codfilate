---
name: ui-ux-best-practices
description: Core guidelines and standards for implementing modern, accessible, and premium UI/UX design.
---

# UI/UX Best Practices & Design System Guidelines

When acting on UI/UX tasks, enforce the following guidelines to maintain a premium, state-of-the-art aesthetic and accessible user experience.

## 1. Aesthetic Excellence (The "Wow" Factor)
- **Avoid Generic Palettes**: Do not use standard hex codes directly (e.g., `#FF0000`). Always use harmonious color palettes (HSL or curated hex) with proper shades and tints.
- **Modern Paradigms**: Utilize modern techniques such as Glassmorphism (blur backed by subtle gradients) and subtle glow shadows built into the system theme.
- **Dynamic Interactions**: Interfaces must feel alive. Ensure all interactive elements (buttons, inputs, cards) have defined micro-animations (press-states, hover highlights, focus glows).

## 2. Typography & Hierarchy
- **Font Stack**: Always rely on modern fonts (e.g., Inter, Outfit, or Tajawal for Arabic) instead of system defaults.
- **Hierarchy**: Use clear contrast in font weights and sizes to guide the user's eye. Ensure heading tags (`<h1>`, `<h2>`) are used semantically.

## 3. Responsive & Accessible (RTL/LTR)
- **Flexibility**: Use Flexbox/Grid systems and relative padding/margins. The interface must not break on smaller mobile screens.
- **RTL Awareness**: If supporting Arabic or Hebrew, ensure layout properties use logical properties (`paddingStart`, `marginEnd`, `alignItems: 'flex-start'`) rather than absolute `Left`/`Right` values.
- **Contrast**: Maintain WCAG standard contrast ratios between foreground text and background colors, especially for glassmorphism panels.

## 4. State Management Visibility
- **Empty States**: Never leave a screen blank. Use illustrated Empty State components with clear Call-to-Actions (CTAs).
- **Loading States**: Replace native spinners with custom, branded loading animations or skeleton loaders to decrease perceived wait times.
- **Tactile Feedback**: On mobile platforms, pair major interactions (success, warning, complex layout shifts) lightly with Haptic feedback.

Follow these principles rigorously on every UI assignment.
