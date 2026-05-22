const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPOS", {
  ping: () => ipcRenderer.invoke("electron-pos:ping"),
  listPrinters: () => ipcRenderer.invoke("printers:list"),
  loadPrintSettings: () => ipcRenderer.invoke("print-settings:load"),
  savePrintSettings: (settings) => ipcRenderer.invoke("print-settings:save", settings),
  testPrint: (payload) => ipcRenderer.invoke("print:test", payload),
  printReceipt: (payload) => ipcRenderer.invoke("print:receipt", payload),
  printKitchen: (payload) => ipcRenderer.invoke("print:kitchen", payload),
  printStickers: (payload) => ipcRenderer.invoke("print:stickers", payload),
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("STT Electron printer bridge loaded");
});
