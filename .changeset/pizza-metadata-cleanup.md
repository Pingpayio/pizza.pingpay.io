---
"ui": patch
"api": patch
---

Pizza-themed metadata, title, and README cleanup

- UI: hardcode `<title>` to "Pizza Pay" instead of pulling from runtime config (`getAppName`)
- UI: update root and order-page `<meta name="description">` to end with "Powered by Ping."
- UI: switch social card from `metadata.png` to `metadata.jpg` (static committed asset)
- UI: update `manifest.json` description and theme colors to pizza red (`#c0392b`)
- UI: remove `generate-metadata.ts` build script and `sharp` devDependency
- UI: remove `ui/scripts/` entirely — metadata image is now static
- Docs: update README.md hero to use `metadata.jpg` with "Pizza Pay" centered text
