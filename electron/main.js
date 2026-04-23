const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;
let mainWindow = null;

function getSettingsPath() {
  return path.join(app.getPath("userData"), "spill-the-tea-print-settings.json");
}

function loadPrintSettings() {
  try {
    const file = fs.readFileSync(getSettingsPath(), "utf8");
    return JSON.parse(file);
  } catch {
    return {
      receiptKitchenPrinter: "",
      stickerPrinter: "",
      autoPrintReceipt: true,
      autoPrintKitchen: true,
      autoPrintStickers: true,
    };
  }
}

function savePrintSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
  return settings;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: "#fff7f9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

    if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadURL("https://www.spillthetea.vip");
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("printers:list", async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle("print-settings:load", async () => {
  return loadPrintSettings();
});

ipcMain.handle("print-settings:save", async (_event, settings) => {
  return savePrintSettings(settings);
});

ipcMain.handle("print:test", async (_event, { printerName, html }) => {
  return await printHtmlToPrinter({
    printerName,
    html: html || "<html><body style='font-family:Arial;padding:12px'>Test Print - Spill The Tea</body></html>",
  });
});

ipcMain.handle("print:receipt", async (_event, { printerName, html }) => {
  return await printHtmlToPrinter({ printerName, html });
});

ipcMain.handle("print:kitchen", async (_event, { printerName, html }) => {
  return await printHtmlToPrinter({ printerName, html });
});

ipcMain.handle("print:stickers", async (_event, { printerName, html }) => {
  return await printHtmlToPrinter({ printerName, html });
});

async function printHtmlToPrinter({ printerName, html }) {
  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
      },
    });

    printWindow.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );

    printWindow.webContents.on("did-finish-load", async () => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName || "",
          margins: { marginType: "none" },
          pageSize: "A4", // HTML/CSS can override layout; change for production if needed.
        },
        (success, failureReason) => {
          if (!success) {
            resolve({ ok: false, error: failureReason || "Print failed" });
          } else {
            resolve({ ok: true });
          }
          if (!printWindow.isDestroyed()) {
            printWindow.close();
          }
        }
      );
    });
  });
}