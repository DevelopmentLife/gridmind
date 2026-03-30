# ADR-004: Apple Human Interface Guidelines — Web Adaptation

**Status:** accepted
**Date:** 2026-03-29
**Author:** ATLAS

## Context

GridMind's frontends (admin, portal, superadmin, gridmind-site) must follow Apple Human Interface Guidelines (HIG) principles adapted for web. While HIG targets native Apple platforms, the core design philosophy applies universally.

## Decision

All GridMind frontend services adopt the following HIG principles:

### Core Principles (from HIG)

1. **Clarity** — Text is legible at every size. Icons are precise and lucid. Adornments are subtle and appropriate. Focus on functionality drives the design.

2. **Deference** — Fluid motion and a crisp interface help people understand and interact with content while never competing with it. Content fills the screen. Translucency and blurring hint at more.

3. **Depth** — Visual layers and realistic motion convey hierarchy, impart vitality, and facilitate understanding. Touch and discoverability heighten delight and enable access to functionality and additional content without losing context.

### Applied Standards

| HIG Principle | Web Implementation |
|---------------|-------------------|
| **Typography** | Use system font stack where possible. Minimum 11pt (web: 14px) body text. Dynamic type sizes respected via `rem` units. Clear hierarchy: title, headline, body, caption. |
| **Color and contrast** | 4.5:1 minimum contrast ratio (WCAG AA). Meaningful color use — never color-only signaling. Support `prefers-color-scheme` (GridMind: dark only, acceptable). |
| **Spacing and layout** | Consistent spacing scale (4px base grid). Generous touch targets: minimum 44x44px for interactive elements. Content margins minimum 16px on mobile. |
| **Motion and animation** | Purposeful — every animation communicates something. Respect `prefers-reduced-motion`. Spring-based easing (Framer Motion). No animation longer than 500ms for UI transitions. |
| **Feedback** | Every interaction produces visible feedback. Loading states for all async operations. Error states are helpful, not just red. Success confirmation for destructive or important actions. |
| **Navigation** | Clear information hierarchy. Breadcrumbs for depth > 2 levels. Back navigation always available. Current location always visible. |
| **Modality** | Use modals sparingly — only when focus is required. Always provide a clear dismiss path. Never trap the user. |
| **Data entry** | Minimize typing. Use appropriate input types. Inline validation with helpful messages. Auto-focus first field. Tab order logical. |
| **Icons** | Consistent weight and style. Recognizable at small sizes. Paired with labels for accessibility (no icon-only buttons without aria-label). |
| **Platform integration** | Respect system preferences: dark mode, reduced motion, font size. Use native form controls where possible. Support keyboard navigation throughout. |
| **Content** | Use plain language. Be concise. Front-load important information. Use sentence case for UI labels (not Title Case, except page titles). |
| **Error handling** | Never show raw error codes to users. Provide actionable recovery steps. Distinguish between user errors and system errors. |

### Specific Component Rules

- **Buttons:** Minimum height 44px. Primary action visually distinct. Destructive actions require confirmation.
- **Tables:** Sortable columns indicated. Row hover state. Pagination or infinite scroll with clear count.
- **Cards:** Consistent border radius (8px). Clear interactive affordance if clickable. Content hierarchy within card.
- **Forms:** Labels above inputs (not placeholder-only). Required fields marked. Error messages below field, not in toast.
- **Toasts/Alerts:** Auto-dismiss after 5s for success. Errors persist until dismissed. Stack from bottom-right.

## Consequences

- All existing components reviewed for HIG compliance in next sprint
- Touch targets audited (minimum 44x44px)
- Animation durations capped at 500ms for UI transitions
- Form patterns standardized across all 3 frontends
- Error states added to every async operation
