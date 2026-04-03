// Example usage inside your POS page:
//
// import {
//   buildKitchenHtml,
//   buildReceiptHtml,
//   buildStickerHtml,
//   expandDrinkStickers,
// } from "./print-helpers";
//
// async function printOrderArtifacts(order, settings, logoDataUrl) {
//   if (!window.electronPOS) {
//     console.warn("Electron bridge not available");
//     return;
//   }
//
//   if (settings.autoPrintReceipt && settings.receiptKitchenPrinter) {
//     const receiptHtml = buildReceiptHtml(order, logoDataUrl);
//     await window.electronPOS.printReceipt({
//       printerName: settings.receiptKitchenPrinter,
//       html: receiptHtml,
//     });
//   }
//
//   if (settings.autoPrintKitchen && settings.receiptKitchenPrinter) {
//     const kitchenHtml = buildKitchenHtml(order, logoDataUrl);
//     await window.electronPOS.printKitchen({
//       printerName: settings.receiptKitchenPrinter,
//       html: kitchenHtml,
//     });
//   }
//
//   if (settings.autoPrintStickers && settings.stickerPrinter) {
//     const stickerRows = expandDrinkStickers(order);
//     if (stickerRows.length > 0) {
//       const stickerHtml = buildStickerHtml(stickerRows, logoDataUrl);
//       await window.electronPOS.printStickers({
//         printerName: settings.stickerPrinter,
//         html: stickerHtml,
//       });
//     }
//   }
// }