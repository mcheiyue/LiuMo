// import domtoimage from 'dom-to-image-more'; // Removed
import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

import { type LayoutConfig } from './layoutEngine';
import PdfWorker from '../workers/pdf.worker?worker';

/**
 * Extract Base64 font data from CSS string
 */
function extractBase64FromCss(css: string): string | null {
  const match = css.match(/base64,([^'"]+)/);
  return match ? match[1] : null;
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
      // Remove data URI scheme if present (e.g., data:font/ttf;base64,)
      const base64Clean = base64.replace(/^data:.*,/, '').replace(/[\r\n\s]/g, '');
      const binary_string = window.atob(base64Clean);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
  } catch (e) {
      console.error("base64ToArrayBuffer failed:", e);
      // Return empty buffer instead of throwing to allow fallback to default font in Worker if needed?
      // But if we fail here, font is likely corrupted.
      throw new Error("Font data processing failed: " + (e instanceof Error ? e.message : String(e)));
  }
}

// Helper: Convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportPdfVector(
  defaultFilename: string, 
  configStore: any, 
  fontBase64: string | null
): Promise<boolean> {
  try {
    console.log("[Vector Export] Starting...");
    
    // 0.1 Check Font Presence (with Built-in Fallback)
    let finalFontBase64 = fontBase64;
    
    if (!finalFontBase64) {
       console.log("[Vector Export] No user font, trying built-in default...");
       try {
          const res = await fetch('/fonts/default.ttf');
          if (res.ok) {
             const blob = await res.blob();
             finalFontBase64 = await blobToBase64(blob);
             console.log("[Vector Export] Loaded built-in font.");
          } else {
             throw new Error("Default font not found");
          }
       } catch (e) {
          console.warn("[Vector Export] Built-in font load failed:", e);
          const confirmed = await ask(
            '未检测到中文字体，且内置字体加载失败。\n矢量导出可能导致中文乱码。\n\n是否坚持使用默认字体导出？', 
            { title: '缺少字体警告', kind: 'warning' }
          );
          if (!confirmed) return false;
       }
    }

    // 0.2 Prompt for Save Location
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{
        name: 'PDF Document',
        extensions: ['pdf']
      }]
    });

    if (!filePath) {
      console.log("[Vector Export] User cancelled save.");
      return false;
    }

    // 1. Initialize jsPDF
    // A4: 210mm x 297mm
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 15; // 15mm margin
    const contentW = pageWidth - margin * 2;
    const contentH = pageHeight - margin * 2;

    // 2. Font Handling
    // We prepare the base64 string here, but actual registration happens in Worker
    let pureBase64: string | null = null;
    
    if (finalFontBase64) { 
      console.log("[Vector Export] Processing font...");
      
      // Try extracting from CSS url()
      pureBase64 = extractBase64FromCss(finalFontBase64);
      
      // If not in url(), check if it is a raw data URI or raw base64
      if (!pureBase64) {
          if (finalFontBase64.startsWith('data:')) {
             pureBase64 = finalFontBase64;
          } else if (finalFontBase64.length > 100) {
             // Assume it's raw base64
             pureBase64 = finalFontBase64;
          }
      }
      
      if (!pureBase64) {
          console.warn("[Vector Export] Could not extract Base64 from CSS string.");
          alert("字体数据异常，可能导致导出字体丢失。");
      }
    } else {
      console.warn("[Vector Export] No font provided, using default.");
    }

    const layoutConfig: LayoutConfig = {
      layoutDirection: configStore.layoutDirection,
      verticalColumnOrder: configStore.verticalColumnOrder,
      borderMode: configStore.borderMode,
      smartSnap: false,
      // Deep clone fixedGrid to remove Vue Reactivity Proxies which cause DataCloneError in postMessage
      fixedGrid: configStore.fixedGrid ? JSON.parse(JSON.stringify(configStore.fixedGrid)) : undefined
    };

    // 4. Calculate Page Capacity
    const MM_TO_PX = 3.7795;
    const containerWPx = contentW * MM_TO_PX;
    const containerHPx = contentH * MM_TO_PX;
    
    // Calculate Natural Capacity (How many cells fit strictly)
    // Gap = 0 for calculation simplicity
    const capacityCols = Math.floor(containerWPx / CELL_SIZE);
    const capacityRows = Math.floor(containerHPx / CELL_SIZE);
    
    let rowsPerPage = capacityRows;
    let colsPerPage = capacityCols;
    let scale = 1.0; 

    if (configStore.fixedGrid?.enabled) {
      const userRows = configStore.fixedGrid.rows;
      const userCols = configStore.fixedGrid.cols;
      
      const reqW = userCols * CELL_SIZE; 
      const reqH = userRows * CELL_SIZE;
      
      const scaleW = containerWPx / reqW;
      const scaleH = containerHPx / reqH;
      
      scale = Math.min(scaleW, scaleH);
      rowsPerPage = userRows;
      colsPerPage = userCols;
    } else {
        // Auto mode
        // For Horizontal: fixed Cols (capacity), fixed Rows (capacity)
        // For Vertical: fixed Rows (capacity), fixed Cols (capacity)
        // We use the capacity calculated above.
        // And keep scale = 1.0 (relative to MM_TO_PX)
        // Wait, if 96px * 7 > containerWPx (due to gap), we might need slight scale down?
        // LayoutEngine uses gap.
        // Let's rely on margins for now. 15mm margin is generous.
    }

    console.log(`[Vector Export] Grid: ${rowsPerPage} rows x ${colsPerPage} cols. Scale: ${scale}`);

    console.log(`[Vector Export] Grid: ${rowsPerPage} rows x ${colsPerPage} cols. Scale: ${scale}`);
    
    // Safety check: Ensure rows/cols are valid
    if (rowsPerPage <= 0 || colsPerPage <= 0) {
        throw new Error(`Invalid Grid Calculation: ${rowsPerPage}x${colsPerPage}`);
    }

    // 5. Calculate FULL Layout & Render in Worker
    // We delegate the heavy lifting (Layout + Subsetting + Rendering) to the Web Worker
    
    // Prepare Grid Config
    const gridConfig = {
        rowsPerPage,
        colsPerPage,
        scale,
        gridType: configStore.gridType
    };
    
    // 6. Spawn Worker
    return new Promise((resolve, reject) => {
        console.log("[Vector Export] Spawning Worker...");
        const worker = new PdfWorker();
        
        worker.onmessage = async (e) => {
            console.log("[Vector Export] Message received from Worker", e.data);
            const { success, pdfBuffer, error } = e.data;
            
            if (success && pdfBuffer) {
                try {
                    console.log("[Vector Export] Writing file to disk...");
                    await writeFile(filePath, new Uint8Array(pdfBuffer));
                    console.log("[Vector Export] Write success.");
                    alert(`导出成功！\n文件已保存至: ${filePath}\n大小: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
                    resolve(true);
                } catch (writeErr: any) {
                    console.error("Write failed:", writeErr);
                    alert(`保存文件失败: ${writeErr.message}`);
                    reject(writeErr);
                }
            } else {
                console.error("Worker failed:", error);
                alert(`导出失败 (Worker): ${error}`);
                reject(new Error(error));
            }
            worker.terminate();
        };
        
        worker.onerror = (err) => {
            console.error("Worker error:", err);
            alert(`导出进程错误: ${err.message}`);
            worker.terminate();
            reject(err);
        };
        
        // Prepare Font Buffer
        let fontBuffer: ArrayBuffer;
        try {
            if (pureBase64) {
                 fontBuffer = base64ToArrayBuffer(pureBase64);
                 console.log(`[Vector Export] Font buffer prepared. Size: ${(fontBuffer.byteLength/1024).toFixed(2)} KB`);
            } else {
                 console.warn("[Vector Export] No font buffer available.");
                 fontBuffer = new ArrayBuffer(0);
            }
        } catch (e: any) {
            console.error("Font buffer preparation failed:", e);
            alert("字体数据处理失败，请重试。");
            reject(e);
            return;
        }

        // Post Message
        const payload = {
            text: configStore.text || "",
            fontBuffer,
            layoutConfig,
            gridConfig
        };
        
        // Transfer the buffer to avoid copying 15MB
        console.log("[Vector Export] Posting message to worker...");
        worker.postMessage(payload, [fontBuffer]);
    });

  } catch (e: any) {
    console.error("[Vector Export] Failed:", e);
    alert(`导出失败！\n错误信息: ${e.message || e}`);
    throw e;
  }
}

export interface ExportOptions {
  layoutDirection: 'vertical' | 'horizontal'; // 'vertical' means vertical text (horizontal scroll), 'horizontal' means horizontal text (vertical scroll)
}
