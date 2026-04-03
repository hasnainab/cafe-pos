declare global {
  interface Window {
    electronPOS?: {
      listPrinters: () => Promise<Array<{ name: string; displayName?: string; isDefault?: boolean }>>;
      loadPrintSettings: () => Promise<{
        receiptKitchenPrinter: string;
        stickerPrinter: string;
        autoPrintReceipt: boolean;
        autoPrintKitchen: boolean;
        autoPrintStickers: boolean;
      }>;
      savePrintSettings: (settings: any) => Promise<any>;
      testPrint: (payload: { printerName: string; html?: string }) => Promise<{ ok: boolean; error?: string }>;
      printReceipt: (payload: { printerName: string; html: string }) => Promise<{ ok: boolean; error?: string }>;
      printKitchen: (payload: { printerName: string; html: string }) => Promise<{ ok: boolean; error?: string }>;
      printStickers: (payload: { printerName: string; html: string }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export {};