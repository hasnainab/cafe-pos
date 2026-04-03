# Spill The Tea - Electron printer integration starter

This starter wraps your existing Next.js POS in Electron so you can:
- list installed printers
- save printer roles
- print silently to a named printer
- route:
  - customer receipt -> receipt/kitchen printer
  - kitchen ticket -> receipt/kitchen printer
  - drink stickers -> sticker printer

## Why Electron
Electron can print silently with a specific `deviceName` using `webContents.print(...)`.
That is the recommended route when the POS and printers run on the same cashier computer.

## Files
- `electron/main.js` - Electron main process and silent print IPC
- `electron/preload.js` - safe renderer bridge
- `src-snippets/electron-pos.d.ts` - window typings
- `src-snippets/print-helpers.ts` - HTML builders for receipt, kitchen ticket, and 2x1 stickers
- `src-snippets/renderer-print-example.ts` - example call pattern
- `package.electron.json` - dependencies and dev script

## Install
1. Copy `electron/` into your project root.
2. Copy `src-snippets/electron-pos.d.ts` into your app source tree.
3. Copy `src-snippets/print-helpers.ts` into your app source tree.
4. Merge `package.electron.json` fields into your project's `package.json`.
5. Install:
   - `npm install -D electron concurrently wait-on`

## Run
Use:
- `npm run electron:dev`

That starts the Next.js dev server and launches Electron after the app is ready.

## Renderer integration
From your POS page:
- call `window.electronPOS.listPrinters()` to show installed printers
- call `window.electronPOS.savePrintSettings(...)` to save selected printer names
- after order creation, build print HTML and call:
  - `printReceipt`
  - `printKitchen`
  - `printStickers`

## Sticker logic
The supplied helper expands drink items only and counts across all drinks in the order:
- Cappuccino 1/3
- Cappuccino 2/3
- Latte 3/3

## Notes
- This is a working starter, not a full packaged installer.
- Label printer margins and scaling may need minor adjustment for your exact printer model.
- If you want, the next step is to wire your current POS page directly to these Electron APIs.