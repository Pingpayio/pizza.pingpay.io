---
api: minor
ui: minor
---

Redesign Pizza POS with Pizza DAO-inspired visual system and mobile optimizations

- UI: replace brutalist hard borders/bevels with pill buttons (Fredoka font), soft layered shadows, and rounded cards — matching the Pizza DAO / Global Pizza Party aesthetic
- UI: add Fredoka display font for headings and buttons; soften label tracking from 0.28em to 0.14em
- UI: inline copy-to-clipboard buttons on deposit address and payment amount with clipboard/checkmark icon swap
- UI: mobile-responsive improvements: `font-size: 16px` inputs (prevents iOS zoom), `inputMode="decimal"` for amount, `enterKeyHint`, `autoComplete`, `autoCapitalize` attributes
- UI: safe-area padding (`env(safe-area-inset-*)`) for notched iPhones; `overflow-y-auto overscroll-contain` scroll containers
- UI: wrap login form in `<form>` for proper iOS keyboard "Go" submission
- UI: responsive QR code sizing on small screens
- UI: extract shared `PizzaBackground` and `PizzaPoweredBy` components to `@/components/pizza`
- UI: remove header from `_layout.tsx` (pizza routes are fully immersive)
- UI: refine copy: "ring it up", "pay now", "start taking orders", "confirming on-chain"
- API: add `HOST_URL` secret for QR URL generation with request-header fallback instead of hardcoded localhost
- API: use `onMutate` for mutation state transitions instead of side effects in `mutationFn`
- API: `sseCancel` refactored from `useState` to `useRef`
