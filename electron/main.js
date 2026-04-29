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
    mainWindow.loadURL("https://app.spillthetea.vip");
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

ipcMain.handle("print:test", async (_event, { printerName, html, printOptions }) => {
  return await printHtmlToPrinter({
    printerName,
    html:
      html ||
      "<html><body style='font-family:Arial;padding:12px'>Test Print - Spill The Tea</body></html>",
    printOptions,
  });
});

ipcMain.handle("print:receipt", async (_event, { printerName, html, printOptions }) => {
  return await printHtmlToPrinter({ printerName, html, printOptions });
});

ipcMain.handle("print:kitchen", async (_event, { printerName, html, printOptions }) => {
  return await printHtmlToPrinter({ printerName, html, printOptions });
});

ipcMain.handle("print:stickers", async (_event, { printerName, html, printOptions }) => {
  return await printHtmlToPrinter({ printerName, html, printOptions });
});

async function printHtmlToPrinter({ printerName, html, printOptions = {} }) {
  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
      },
    });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
    };

    const timeout = setTimeout(() => {
      finish({ ok: false, error: "Print timed out" });
    }, 15000);

    printWindow.webContents.once("did-finish-load", async () => {
      const options = {
        silent: true,
        printBackground: true,
        deviceName: printerName || "",
        margins: { marginType: "none" },
        ...printOptions,
      };

      printWindow.webContents.print(options, (success, failureReason) => {
        clearTimeout(timeout);
        if (!success) {
          finish({ ok: false, error: failureReason || "Print failed" });
        } else {
          finish({ ok: true });
        }
      });
    });

    printWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
      clearTimeout(timeout);
      finish({ ok: false, error: errorDescription || `Failed to load print content (${errorCode})` });
    });

    printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
}