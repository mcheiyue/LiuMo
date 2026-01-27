import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { save, ask } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

import { calculateLayout, calculateGridDimensions, CELL_SIZE, type LayoutConfig } from './layoutEngine';
import { subsetFont } from './fontSubsetting';

/**
 * Extract Base64 font data from CSS string
 */
function extractBase64FromCss(css: string): string | null {
  const match = css.match(/base64,([^'"]+)/);
  return match ? match[1] : null;
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

// --- Grid Drawing Helpers ---
function drawMizi(doc: jsPDF, x: number, y: number, size: number) {
  doc.setLineDashPattern([0.5, 0.5], 0); // Fine dash
  doc.setDrawColor(213, 139, 133); // #D58B85
  
  // Cross (+)
  doc.line(x, y + size/2, x + size, y + size/2); 
  doc.line(x + size/2, y, x + size/2, y + size); 
  
  // Diagonals (X)
  doc.line(x, y, x + size, y + size);
  doc.line(x + size, y, x, y + size);
  
  doc.setLineDashPattern([], 0); // Reset
}

function drawTianzi(doc: jsPDF, x: number, y: number, size: number) {
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setDrawColor(213, 139, 133); // #D58B85
  
  doc.line(x, y + size/2, x + size, y + size/2);
  doc.line(x + size/2, y, x + size/2, y + size);
  
  doc.setLineDashPattern([], 0);
}

function drawHuigong(doc: jsPDF, x: number, y: number, size: number) {
  const padding = size * 0.25;
  const innerSize = size * 0.5;
  
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.setDrawColor(213, 139, 133); // #D58B85
  doc.rect(x + padding, y + padding, innerSize, innerSize);
  doc.setLineDashPattern([], 0);
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
    let activeFontName = 'helvetica'; // Default fallback
    
    if (finalFontBase64) { // Use finalFontBase64
      console.log("[Vector Export] Processing font...");
      
      // FIX: Extract pure Base64 from the CSS string OR use raw if it's already pure
      let pureBase64 = extractBase64FromCss(finalFontBase64);
      if (!pureBase64) {
          // Maybe it's already pure (from built-in load)?
          // Built-in load returns "data:font/ttf;base64,..." ?
          // blobToBase64 returns Data URL. So extractBase64FromCss works.
          // Check if it's raw base64?
          if (!finalFontBase64.startsWith('data:')) {
             pureBase64 = finalFontBase64;
          }
      }
      
      if (pureBase64) {
          const fontName = "CustomFont";
          try {
            // ... (Subsetting logic commented out for now) ...
            
            // FALLBACK: Use Full Font directly
            doc.addFileToVFS('custom.ttf', pureBase64);
            doc.addFont('custom.ttf', fontName, 'normal');
            doc.setFont(fontName);
            activeFontName = fontName;
            
            console.log(`[Vector Export] Custom font registered. Length: ${(pureBase64.length/1024/1024).toFixed(2)}MB`);
          } catch (e) {
            console.error("Font registration failed:", e);
          }
      } else {
          console.warn("[Vector Export] Could not extract Base64 from CSS string.");
      }
    } else {
      console.warn("[Vector Export] No font provided, using default.");
    }

    // 3. Layout Configuration (Map Store to Engine Config)
    const isVertical = configStore.layoutDirection === 'vertical'; // Defined here!

    const layoutConfig: LayoutConfig = {
      layoutDirection: configStore.layoutDirection,
      verticalColumnOrder: configStore.verticalColumnOrder,
      borderMode: configStore.borderMode,
      smartSnap: false, // For PDF, we enforce page fitting usually? Or respect smart snap?
                        // Let's disable smartSnap for PDF pagination for now to ensure predictable grids
      fixedGrid: configStore.fixedGrid
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

    // 5. Calculate FULL Layout
    const layoutDimensions = {
        rows: isVertical ? rowsPerPage : 999999,
        cols: isVertical ? 999999 : colsPerPage,
        gap: 0,
        usableWidth: 0, 
        usableHeight: 0
    };
    
    const cells = calculateLayout(
        configStore.text || "",
        layoutDimensions,
        layoutConfig
    );
    
    console.log(`[Vector Export] Generated ${cells.length} cells.`);

    // 6. Render to PDF
    const pxToMm = (px: number) => (px / MM_TO_PX) * scale;
    const cellMM = pxToMm(CELL_SIZE);
    
    cells.forEach((cell, index) => {
      // Calculate Page Index
      let pIndex = 0;
      let visualColOnPage = 0;
      let visualRowOnPage = 0;
      
      if (layoutConfig.layoutDirection === 'vertical') {
         pIndex = Math.floor(cell.colIndex / colsPerPage);
         visualColOnPage = cell.colIndex % colsPerPage;
         visualRowOnPage = cell.rowIndex;
         
         if (configStore.verticalColumnOrder === 'rtl') {
            visualColOnPage = (colsPerPage - 1) - visualColOnPage;
         }
      } else {
         pIndex = Math.floor(cell.rowIndex / rowsPerPage);
         visualRowOnPage = cell.rowIndex % rowsPerPage;
         visualColOnPage = cell.colIndex;
      }
      
      // Safety Cap: Don't generate too many pages
      if (pIndex > 200) {
          if (index % 1000 === 0) console.warn(`[Vector Export] Page count exceeding 200...`);
          return; // Stop rendering
      }
      
      while (doc.getNumberOfPages() <= pIndex) {
        doc.addPage();
      }
      doc.setPage(pIndex + 1);
      
      const x = margin + visualColOnPage * cellMM;
      const y = margin + visualRowOnPage * cellMM;
      
      // Draw Grid
      doc.setDrawColor(213, 139, 133); // #D58B85
      doc.setLineWidth(0.1);
      
      if (layoutConfig.borderMode === 'full') {
         // Outer Box
         doc.rect(x, y, cellMM, cellMM);
         
         // Inner Grid Styles
         const gridType = configStore.gridType;
         if (gridType === 'mizi') drawMizi(doc, x, y, cellMM);
         else if (gridType === 'tianzi') drawTianzi(doc, x, y, cellMM);
         else if (gridType === 'huigong') drawHuigong(doc, x, y, cellMM);
         
      } else if (layoutConfig.borderMode === 'lines-only') {
         // Draw underline only? 
         if (layoutConfig.layoutDirection === 'vertical') {
             // Vertical text: lines between columns (vertical lines)
             doc.line(x, y, x, y + cellMM);
         } else {
             // Horizontal text: lines between rows (underlines)
             doc.line(x, y + cellMM, x + cellMM, y + cellMM); 
         }
      }
      
      // Draw Text
      if (cell.char && cell.char.trim()) {
        // Adjust font size ratio: 0.7 -> 0.55 for better breathing room
        const fontRatio = 0.55; 
        const fontSizePt = cellMM * 2.83 * fontRatio; 
        doc.setFontSize(fontSizePt);
        
        // Manual X Centering (more reliable than align: 'center')
        const charWidth = doc.getTextWidth(cell.char);
        const textX = x + (cellMM - charWidth) / 2;
        
        // Manual Y Centering
        // Using standard alphabetic baseline logic
        // Visual center ~ y + cellMM/2 + fontSize/3
        // Let's verify: 
        // If cell is 20mm. Font is 11mm. 
        // Middle is 10mm. 
        // To center visually, baseline should be around 10 + 11/2 - descender?
        // Usually baseline is at ~80% of font height from top of font box.
        // Let's try: y + (cellMM + fontSizeMm * 0.7) / 2
        // fontSizeMm = cellMM * fontRatio
        
        // Formula: y + (cellMM / 2) + (fontSizeMm / 3) roughly centers vertically
        const fontSizeMm = cellMM * fontRatio;
        const textY = y + (cellMM / 2) + (fontSizeMm / 2.8);

        try {
            doc.text(cell.char, textX, textY, {
                baseline: 'alphabetic' // Use default baseline
            });
        } catch (e) {
            // Log once
            if (index === 0) console.error("doc.text failed:", e);
        }
      }
    });

    console.log(`[Vector Export] Rendered ${cells.length} cells on ${doc.getNumberOfPages()} pages.`);

    // 7. Save
    const pdfOutput = doc.output('arraybuffer');
    await writeFile(filePath, new Uint8Array(pdfOutput));
    
    // Success Alert
    alert(`导出成功！\n文件已保存至: ${filePath}\n大小: ${(pdfOutput.byteLength / 1024).toFixed(2)} KB`);
    
    return true;

  } catch (e: any) {
    console.error("[Vector Export] Failed:", e);
    alert(`导出失败！\n错误信息: ${e.message || e}`);
    throw e;
  }
}

export interface ExportOptions {
  layoutDirection: 'vertical' | 'horizontal'; // 'vertical' means vertical text (horizontal scroll), 'horizontal' means horizontal text (vertical scroll)
}

export async function exportToPDF(element: HTMLElement, defaultName: string = 'liumo-practice.pdf', options?: ExportOptions) {
  let fontUrl: string | null = null; // Store blob URL for cleanup
  
  try {
    // 1. Open Native Save Dialog FIRST
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{
        name: 'PDF Document',
        extensions: ['pdf']
      }]
    });

    if (!filePath) return false;

    // Phase 5 Fix: Handle Custom Font via Blob URL to avoid Stack Overflow
    // Extract Font CSS from the element if present
    const styleTag = element.querySelector('style');
    if (styleTag && styleTag.textContent && styleTag.textContent.includes('data:font')) {
       // Found huge base64 font. Extract it.
       const css = styleTag.textContent;
       const match = css.match(/url\('data:font\/.*?;base64,(.*?)'\)/);
       if (match && match[1]) {
         console.log("Optimizing font embedding...");
         try {
           // Convert Base64 back to Blob
           const binary = atob(match[1]);
           const array = new Uint8Array(binary.length);
           for(let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
           const blob = new Blob([array], { type: 'font/ttf' });
           fontUrl = URL.createObjectURL(blob);
           
           // Replace the huge Base64 with the short Blob URL in the style content
           // Note: Blob URLs work in the same origin. dom-to-image uses iframe. 
           // If it's same-origin, it should work.
           const newCss = css.replace(/url\('data:font.*?'\)/, `url('${fontUrl}')`);
           styleTag.textContent = newCss;
         } catch (e) {
           console.error("Font optimization failed:", e);
         }
       }
    }

    // 2. Setup PDF & Dimensions
    // A4 size: 595.28 x 841.89 pt
    const pdf = new jsPDF('p', 'pt', 'a4'); // Always Portrait for pagination flow usually
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Phase 6 Fix: Increase margin to 40pt (approx 1.4cm) to prevent printer clipping
    const margin = 40; 
    const availPdfW = pageWidth - margin * 2;
    const availPdfH = pageHeight - margin * 2;

    const scale = 1.5; // Optimized for size/quality balance (was 2)
    const elW = element.offsetWidth;
    const elH = element.offsetHeight;

    // Detect layout logic fix (Phase 7 Fix)
    // Prioritize user option. Fallback to aspect ratio only if option missing.
    const isVerticalText = options?.layoutDirection 
      ? options.layoutDirection === 'vertical' 
      : (elW > elH * 1.5);

    // 3. Calculation for Pagination (Grid-Aware Slicing)
    // const CELL_SIZE = 96; // Removed unused
    // We need to know rows/cols to slice correctly.
    // Since we don't have direct access to props, we infer from dimensions
    // Assuming gap=1px roughly. 
    // width ≈ cols * CELL_SIZE
    
    // We must slice at multiples of CELL_SIZE (plus gaps).
    // Let's assume standard full grid with gap=1.
    // The "stride" is CELL_SIZE + 1? 
    // Wait, grid gap logic is complex.
    // PaperCanvas: widthPx = cols * CELL_SIZE + (cols-1)*gap
    
    // To be safe, we should pass rows/cols or calculate them.
    // But passing them requires changing signature everywhere.
    // Let's try to calculate.
    
    // Reverse engineer Cols/Rows
    // We assume layout matches logic:
    // width = C * 96 + (C-1) * gap. 
    // gap is usually 1 or 0.
    
    // Let's just use the exact pixel width of the element.
    // But we need to know where to CUT.
    // If we cut at pixel 500, and pixel 500 is in the middle of a cell, that's bad.
    
    // We need to cut at: N * (96 + gap) + padding?
    // The container has 1px padding (p-[1px]).
    
    // Phase 8 Fix: Read actual grid configuration from DOM
    const cellSize = 96; // Standard cell size (w-24 h-24)
    const gapSize = parseInt(element.getAttribute('data-gap') || '1', 10);
    const cellStride = cellSize + gapSize; // Actual step between cells
    
    // let totalPages = 1; // Removed unused
    let pages: { x: number, y: number, w: number, h: number }[] = [];
    let printScale = 1;

    if (isVerticalText) {
      // Vertical Text (Top-to-Bottom, Right-to-Left)
      // Content flows in columns from right to left
      // Phase 13 Fix: For vertical text, width determines the scale (not height!)
      // Each column spans the full height, so we scale based on fitting columns horizontally
      printScale = availPdfW / elW; // Width determines scale for column-based layout
      const fitHeightInPdf = availPdfH;
      const fitHeightInPx = fitHeightInPdf / printScale;
      
      // Check if single page can fit all content
      if (elH * printScale <= availPdfH) {
        // Single page, no slicing needed
        pages.push({ x: 0, y: 0, w: elW, h: elH });
      } else {
        // Need to slice by height (columns are too tall)
        // This is unusual for vertical text but handle it
        const totalRows = parseInt(element.getAttribute('data-rows') || '10', 10);
        const rowsPerPage = Math.floor(fitHeightInPx / cellStride);
        
        if (rowsPerPage < 1) {
          pages.push({ x: 0, y: 0, w: elW, h: elH });
        } else {
          let currentTop = 0;
          let remainingRows = totalRows;
          
          while (currentTop < elH && remainingRows > 0) {
            const rowsThisPage = Math.min(rowsPerPage, remainingRows);
            const heightThisPage = rowsThisPage * cellStride;
            const h = Math.min(heightThisPage, elH - currentTop);
            
            console.log(`[DEBUG] Page ${pages.length + 1}: rows=${rowsThisPage}, y=${currentTop}, h=${h}, remainingRows=${remainingRows}`);
            
            pages.push({
              x: 0,
              y: currentTop,
              w: elW,
              h: h
            });
            
            currentTop += h;
            remainingRows -= rowsThisPage;
          }
        }
      }
      
    } else {
      // Horizontal Text (Vertical Flow, LTR)
      // Slice HEIGHT.
      printScale = availPdfW / elW; // Width matches page width
      const fitHeightInPx = availPdfH / printScale;
      
      // Phase 10 Fix: Prevent slicing mid-cell
      const totalRows = parseInt(element.getAttribute('data-rows') || '10', 10);
      const rowsPerPage = Math.floor(fitHeightInPx / cellStride);
      
      if (rowsPerPage < 1) {
        // Single page, no slicing
        pages.push({ x: 0, y: 0, w: elW, h: elH });
      } else {
        let currentTop = 0;
        let remainingRows = totalRows;
        
        while (currentTop < elH && remainingRows > 0) {
          const rowsThisPage = Math.min(rowsPerPage, remainingRows);
          const heightThisPage = rowsThisPage * cellStride;
          
          // Phase 14 Fix: Use heightThisPage directly, don't clamp with elH
          // If we calculated N rows fit, use exactly N rows height
          const h = heightThisPage;
          
          console.log(`[DEBUG Horizontal] Page ${pages.length + 1}: rows=${rowsThisPage}, y=${currentTop}, h=${h}, remainingRows=${remainingRows}`);
          
          pages.push({
            x: 0,
            y: currentTop,
            w: elW,
            h: h
          });
          
          currentTop += h;
          remainingRows -= rowsThisPage;
        }
      }
    }

    // 4. Capture & Add Pages
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      
      const p = pages[i];
      
      // We use dom-to-image's style/width/height to crop
      // Note: width/height in param determines the OUTPUT image size
      // We need output size = p.w * scale
      
      const param = {
        width: p.w * scale,
        height: p.h * scale,
        quality: 1,
        bgcolor: '#F9F4E8',
        filter: (node: Node) => {
          // Phase 9 Fix: Remove borders and text-stroke in export
          if (node instanceof HTMLElement && node.style) {
            // Critical: Force remove all borders (CharacterCell containers have black borders in export)
            (node.style as any).border = 'none';
            (node.style as any).outline = 'none';
            (node.style as any).boxShadow = 'none';
            (node.style as any).webkitTextStroke = '';
          }
          return true;
        },
        style: {
          // Phase 12 Fix: Use margin to crop instead of transform
          marginLeft: `-${p.x}px`,
          marginTop: `-${p.y}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${elW}px`,
          height: `${elH}px`,
          boxShadow: 'none',
          border: 'none',
          backgroundColor: element.style.backgroundColor || '#D58B85',
          direction: element.style.direction || 'ltr',
          rowGap: element.style.rowGap,
          columnGap: element.style.columnGap
        }
      };

      // Capture
      const imgData = await domtoimage.toPng(element, param);
      
      // Add to PDF
      // Dimensions in PDF
      const pdfImgW = p.w * printScale;
      const pdfImgH = p.h * printScale;
      
      // Center horizontally if it's narrower than page (e.g. last page of vertical text)
      // or Center vertically if shorter (e.g. last page of horizontal text)
      
      // For Vertical Text (Pages are full height, width varies)
      // Align Right for RTL aesthetics? Or Center?
      // Let's Center for now to be safe.
      
      let pdfX = (pageWidth - pdfImgW) / 2;
      let pdfY = (pageHeight - pdfImgH) / 2;
      
      // Adjustment: Align Top/Left usually looks better for text?
      // Vertical text: Align Top-Right relative to page?
      // Keep simple: Center.
      
      pdf.addImage(imgData, 'PNG', pdfX, pdfY, pdfImgW, pdfImgH);
    }

    // 5. Save
    const pdfOutput = pdf.output('arraybuffer');
    await writeFile(filePath, new Uint8Array(pdfOutput));
    
    // Cleanup Blob URL
    if (fontUrl) URL.revokeObjectURL(fontUrl);
    
    return true;
  } catch (error) {
    if (fontUrl) URL.revokeObjectURL(fontUrl);
    console.error("Export details:", error);
    throw error;
  }
}
