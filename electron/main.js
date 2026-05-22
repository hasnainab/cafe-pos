const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;
let mainWindow = null;

const ONLINE_POS_URL = process.env.STT_POS_URL || "https://app.spillthetea.vip";
const LOAD_LOCAL_IN_DEV = process.env.STT_POS_LOAD_LOCAL === "1";

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
    title: "Spill The Tea POS",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      devTools: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const onlineHost = new URL(ONLINE_POS_URL).host;
      const targetHost = new URL(url).host;
      if (targetHost === onlineHost) return { action: "allow" };
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      const online = new URL(ONLINE_POS_URL);
      const allowed = target.host === online.host || url.startsWith("http://localhost:3000");
      if (!allowed) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  if (isDev && LOAD_LOCAL_IN_DEV) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadURL(ONLINE_POS_URL);
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

ipcMain.handle("electron-pos:ping", async () => {
  return {
    ok: true,
    appName: app.getName(),
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    url: mainWindow ? mainWindow.webContents.getURL() : null,
  };
});

ipcMain.handle("printers:list", async () => {
  if (!mainWindow) return [];
  try {
    return (await mainWindow.webContents.getPrintersAsync()) || [];
  } catch (error) {
    console.error("Could not list printers", error);
    return [];
  }
});

ipcMain.handle("print-settings:load", async () => loadPrintSettings());

ipcMain.handle("print-settings:save", async (_event, settings) => savePrintSettings(settings));

ipcMain.handle("print:test", async (_event, { printerName, html, printOptions }) => {
  return await printHtmlToPrinter({
    printerName,
    html: html || "<html><body style='font-family:Arial;padding:12px'>Test Print - Spill The Tea</body></html>",
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
      webPreferences: { sandbox: false },
    });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
      if (!printWindow.isDestroyed()) printWindow.close();
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
        if (!success) finish({ ok: false, error: failureReason || "Print failed" });
        else finish({ ok: true });
      });
    });

    printWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
      clearTimeout(timeout);
      finish({ ok: false, error: errorDescription || `Failed to load print content (${errorCode})` });
    });

    printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
}
