import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

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

    const scale = 2; // High DPI capture
    const elW = element.offsetWidth;
    const elH = element.offsetHeight;

    // Detect layout if not provided (fallback)
    // If width is much larger than height, assume vertical text (horizontal flow)
    const isVerticalText = options?.layoutDirection === 'vertical' || elW > elH * 1.5;

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
    
    const approxCellSize = 96;
    
    // let totalPages = 1; // Removed unused
    let pages: { x: number, y: number, w: number, h: number }[] = [];
    let printScale = 1;

    if (isVerticalText) {
      // Vertical Text (Horizontal Flow, RTL)
      // We need to slice WIDTH.
      // 1. Calculate how many Columns fit in one Page Width
      printScale = availPdfH / elH; // Height matches page height
      const fitWidthInPdf = availPdfW;
      const fitWidthInPx = fitWidthInPdf / printScale;
      
      // Phase 6 Fix: Conservative Slicing
      // Use floor to ensure we don't slice mid-column.
      // approxCellSize + 1 covers cell + gap.
      // We subtract a tiny buffer (0.1) to handle floating point precision issues.
      const colsPerPage = Math.floor((fitWidthInPx - 0.1) / (approxCellSize + 1));
      
      // Slice width
      const sliceW = colsPerPage * (approxCellSize + 1);
      
      // Total Width
      const totalW = elW;
      
      // RTL Slicing: From Right to Left
      let currentRight = totalW;
      
      while (currentRight > 0) {
        // We want a chunk of width 'sliceW' ending at 'currentRight'
        // Left Edge = currentRight - sliceW
        let left = Math.max(0, currentRight - sliceW);
        let w = currentRight - left;
        
        pages.push({
          x: left,
          y: 0,
          w: w,
          h: elH
        });
        
        currentRight = left;
      }
      
    } else {
      // Horizontal Text (Vertical Flow, LTR)
      // Slice HEIGHT.
      printScale = availPdfW / elW; // Width matches page width
      const fitHeightInPx = availPdfH / printScale;
      
      // Phase 6 Fix: Conservative Slicing for Rows
      const rowsPerPage = Math.floor((fitHeightInPx - 0.1) / (approxCellSize + 1));
      const sliceH = rowsPerPage * (approxCellSize + 1);
      
      let currentTop = 0;
      while (currentTop < elH) {
        let h = Math.min(sliceH, elH - currentTop);
        pages.push({
          x: 0,
          y: currentTop,
          w: elW,
          h: h
        });
        currentTop += h;
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
        style: {
          transform: `scale(${scale}) translate(${-p.x}px, ${-p.y}px)`,
          transformOrigin: 'top left',
          width: `${elW}px`, // Important: Container must keep full size for content to flow
          height: `${elH}px`,
          boxShadow: 'none',
          border: 'none'
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
