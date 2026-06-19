---
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/**/*.vue"
  - "src/**/*.tsx"
  - "src/**/*.jsx"
  - "app/**/*.tsx"
  - "pages/**"
---

# Frontend Development Rules

- Use the project's component library — don't build custom components from scratch
- Every component must handle: loading, empty, error, and edge case states
- Use responsive design with consistent breakpoints (mobile, tablet, desktop)
- Ensure all interactive elements are keyboard-accessible
- Add aria labels to all icon-only buttons and inputs
- Never inline styles — use CSS modules, Tailwind, or the project's styling system
- Use semantic HTML elements (button, nav, header, main, section)
- Lazy load below-the-fold content and images
- Memoize expensive computations with computed/useMemo
- Avoid prop drilling — use context/composables for shared state
- Test all user-facing behavior with component tests
