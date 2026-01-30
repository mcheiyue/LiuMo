/// <reference lib="webworker" />
import jsPDF from 'jspdf';
import { getLayoutStrategy } from '../utils/layout';
import type { LayoutConfig, ContentStructure, LayoutItem } from '../utils/layout';
import { CELL_SIZE } from '../utils/layout/constants';
// import { subsetFont } from '../utils/fontSubsetting'; // Removed to avoid conflict with local HarfBuzz implementation

// --- Types ---
export interface WorkerPayload {
  text: string;
  fontBuffer: ArrayBuffer; // Full font
  layoutConfig: LayoutConfig;
  gridConfig: {
    rowsPerPage: number;
    colsPerPage: number;
    scale: number;
    gridType: string; // mizi, tianzi, huigong
  };
}

export interface WorkerResponse {
  success: boolean;
  pdfBuffer?: ArrayBuffer;
  error?: string;
}

// --- Drawing Helpers (Moved from exporter.ts) ---
function drawMizi(doc: jsPDF, x: number, y: number, size: number) {
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setDrawColor(213, 139, 133); // #D58B85
  doc.line(x, y + size/2, x + size, y + size/2); 
  doc.line(x + size/2, y, x + size/2, y + size); 
  doc.line(x, y, x + size, y + size);
  doc.line(x + size, y, x, y + size);
  doc.setLineDashPattern([], 0);
}

function drawTianzi(doc: jsPDF, x: number, y: number, size: number) {
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setDrawColor(213, 139, 133);
  doc.line(x, y + size/2, x + size, y + size/2);
  doc.line(x + size/2, y, x + size/2, y + size);
  doc.setLineDashPattern([], 0);
}

function drawHuigong(doc: jsPDF, x: number, y: number, size: number) {
  const padding = size * 0.25;
  const innerSize = size * 0.5;
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setDrawColor(213, 139, 133);
  doc.rect(x + padding, y + padding, innerSize, innerSize);
  doc.setLineDashPattern([], 0);
}

// --- Helper: ArrayBuffer to Base64 (Async, safer for large files) ---
function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data:application/octet-stream;base64,
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (e) => {
        console.error("FileReader error:", e);
        reject(e);
    };
    reader.readAsDataURL(blob);
  });
}

// --- Helper: Subset Font using HarfBuzz (Direct WASM) ---
async function subsetFont(fontBuffer: ArrayBuffer, text: string): Promise<ArrayBuffer> {
    try {
        console.log("[Worker] Fetching HarfBuzz WASM...");
        const result = await fetch('/hb-subset.wasm');
        if (!result.ok) throw new Error(`Failed to load WASM: ${result.statusText}`);
        
        const wasmBinary = await result.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(wasmBinary);
        const exports = instance.exports as any; // Low-level WASM exports

        console.log("[Worker] Allocating memory...");
        const heapu8 = new Uint8Array(exports.memory.buffer);
        const fontPtr = exports.malloc(fontBuffer.byteLength);
        heapu8.set(new Uint8Array(fontBuffer), fontPtr);

        console.log("[Worker] Creating face...");
        // hb_blob_create(data, length, mode, user_data, destroy_func)
        const blob = exports.hb_blob_create(fontPtr, fontBuffer.byteLength, 2/*HB_MEMORY_MODE_WRITABLE*/, 0, 0);
        const face = exports.hb_face_create(blob, 0);
        exports.hb_blob_destroy(blob); // Face keeps a reference

        console.log("[Worker] Preparing subset input...");
        const input = exports.hb_subset_input_create_or_fail();
        const unicode_set = exports.hb_subset_input_unicode_set(input);
        
        // Add characters to subset
        const uniqueChars = new Set((text + " 0123456789").split(''));
        for (const char of uniqueChars) {
            exports.hb_set_add(unicode_set, char.codePointAt(0));
        }

        console.log("[Worker] Executing subset...");
        const subset = exports.hb_subset_or_fail(face, input);
        
        // Clean up input early
        exports.hb_subset_input_destroy(input);

        if (!subset) {
            throw new Error("hb_subset_or_fail returned null");
        }

        // Get result
        const resultBlob = exports.hb_face_reference_blob(subset);
        const offset = exports.hb_blob_get_data(resultBlob, 0);
        const length = exports.hb_blob_get_length(resultBlob);
        
        if (length === 0) {
            throw new Error("Subset result is empty");
        }

        // Copy result to new buffer
        // Note: memory.buffer might have changed if grown, so get fresh view
        const freshHeap = new Uint8Array(exports.memory.buffer);
        const subsetBuffer = freshHeap.slice(offset, offset + length).buffer;

        console.log(`[Worker] HarfBuzz subset complete. Size: ${(subsetBuffer.byteLength / 1024).toFixed(2)} KB`);

        // Cleanup
        exports.hb_blob_destroy(resultBlob);
        exports.hb_face_destroy(subset);
        exports.hb_face_destroy(face);
        exports.free(fontPtr);

        return subsetBuffer;
    } catch (e) {
        console.error("[Worker] HarfBuzz subset failed:", e);
        throw e;
    }
}

// --- Main Worker Logic ---
self.onmessage = async (e: MessageEvent<WorkerPayload>) => {
  const { text, fontBuffer, layoutConfig, gridConfig } = e.data;

  try {
    console.log('[Worker] Starting PDF generation...');

    // 1. Subsetting
    let finalFontBase64 = '';
    const fontName = 'CustomFont';
    
    // Enable Subsetting with HarfBuzz
    const enableSubsetting = true;

    if (enableSubsetting) {
        try {
            console.log(`[Worker] Subsetting font... Original Size: ${(fontBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
            const subsetBuffer = await subsetFont(fontBuffer, text || "");
            finalFontBase64 = await arrayBufferToBase64(subsetBuffer);
        } catch (err) {
            console.error('[Worker] Subsetting failed, falling back to full font.', err);
            finalFontBase64 = await arrayBufferToBase64(fontBuffer);
        }
    } else {
        console.log('[Worker] Subsetting DISABLED. Using full font.');
        finalFontBase64 = await arrayBufferToBase64(fontBuffer);
    }

    // 2. Initialize PDF
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // 3. Register Font
    doc.addFileToVFS('custom.ttf', finalFontBase64);
    doc.addFont('custom.ttf', fontName, 'normal');
    doc.setFont(fontName);

    // 4. Calculate Layout
    // We recreate layoutDimensions here based on infinite scrolling logic for generation
    const isVertical = layoutConfig.isVertical;
    const strategy = getLayoutStrategy('GRID_STANDARD'); // Force Grid for PDF for now
    
    // Construct ContentStructure
    const content: ContentStructure = {
        paragraphs: [{
            type: 'main',
            lines: text ? text.split('\n') : [] // Split by newline or treat as single block? GridStandard flattens anyway.
        }]
    };
    
    // Config for PDF generation might differ slightly (rows/cols per page)
    // But strategy expects container dims.
    // We need to simulate a very large container to get all cells, then paginate manually.
    const infiniteConfig: LayoutConfig = {
        ...layoutConfig,
        width: isVertical ? 999999 : gridConfig.colsPerPage * CELL_SIZE,
        height: isVertical ? gridConfig.rowsPerPage * CELL_SIZE : 999999,
        // Ensure gap/padding handled
    };

    const result = strategy.calculate(content, infiniteConfig);
    const cells = result.items;
    console.log(`[Worker] Generated ${cells.length} cells.`);

    // 5. Render Pages
    const MM_TO_PX = 3.7795;
    const margin = 15;
    const pxToMm = (px: number) => (px / MM_TO_PX) * gridConfig.scale;
    const cellMM = pxToMm(CELL_SIZE);
    
    // Re-write loop to use index for robust paging
    cells.forEach((cell: LayoutItem, index: number) => {
        const rowsPerPage = gridConfig.rowsPerPage;
        const colsPerPage = gridConfig.colsPerPage;
        const charsPerPage = rowsPerPage * colsPerPage;
        
        const pIndex = Math.floor(index / charsPerPage);
        const indexOnPage = index % charsPerPage;
        
        // Determine Visual Position on Page
        let visualColOnPage = 0;
        let visualRowOnPage = 0;
        
        if (isVertical) {
            // Vertical: Fill rows first (Top->Bottom), then Cols (Right->Left)
            const colInPageParams = Math.floor(indexOnPage / rowsPerPage);
            const rowInPageParams = indexOnPage % rowsPerPage;
            
            visualRowOnPage = rowInPageParams;
            
            if (layoutConfig.verticalColumnOrder === 'rtl') {
                visualColOnPage = (colsPerPage - 1) - colInPageParams;
            } else {
                visualColOnPage = colInPageParams;
            }
        } else {
            // Horizontal: Fill Cols first (Left->Right), then Rows (Top->Bottom)
            visualRowOnPage = Math.floor(indexOnPage / colsPerPage);
            visualColOnPage = indexOnPage % colsPerPage;
        }


        // Safety break
        if (pIndex > 200) return;

        while (doc.getNumberOfPages() <= pIndex) {
            doc.addPage();
        }
        doc.setPage(pIndex + 1);

        const x = margin + visualColOnPage * cellMM;
        const y = margin + visualRowOnPage * cellMM;

        // Draw Grid
        doc.setDrawColor(213, 139, 133);
        doc.setLineWidth(0.1);

        if (layoutConfig.borderMode === 'full') {
            doc.rect(x, y, cellMM, cellMM);
            if (gridConfig.gridType === 'mizi') drawMizi(doc, x, y, cellMM);
            else if (gridConfig.gridType === 'tianzi') drawTianzi(doc, x, y, cellMM);
            else if (gridConfig.gridType === 'huigong') drawHuigong(doc, x, y, cellMM);
        } else if (layoutConfig.borderMode === 'lines-only') {
            if (isVertical) doc.line(x, y, x, y + cellMM);
            else doc.line(x, y + cellMM, x + cellMM, y + cellMM);
        }

        // Draw Text
        if (cell.char && cell.char.trim()) {
            const fontRatio = 0.55; 
            const fontSizePt = cellMM * 2.83 * fontRatio; 
            doc.setFontSize(fontSizePt);
            
            const charWidth = doc.getTextWidth(cell.char);
            const textX = x + (cellMM - charWidth) / 2;
            const fontSizeMm = cellMM * fontRatio;
            const textY = y + (cellMM / 2) + (fontSizeMm / 2.8);

            doc.text(cell.char, textX, textY, { baseline: 'alphabetic' });
        }
    });

    // 6. Return Result
    const pdfOutput = doc.output('arraybuffer');
    
    // Send back to main thread
    self.postMessage({
        success: true,
        pdfBuffer: pdfOutput
    }, [pdfOutput]); // Transferable

  } catch (e: any) {
    console.error('[Worker] Error:', e);
    self.postMessage({
        success: false,
        error: e.message
    });
  }
};
