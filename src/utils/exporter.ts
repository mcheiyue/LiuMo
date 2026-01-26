import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export interface ExportOptions {
  layoutDirection: 'vertical' | 'horizontal'; // 'vertical' means vertical text (horizontal scroll), 'horizontal' means horizontal text (vertical scroll)
}

export async function exportToPDF(element: HTMLElement, defaultName: string = 'liumo-practice.pdf', options?: ExportOptions) {
  try {
    // 1. Open Native Save Dialog FIRST
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{
        name: 'PDF Document',
        extensions: ['pdf']
      }]
    });

    if (!filePath) return false; // User cancelled

    // 2. Setup PDF & Dimensions
    // A4 size: 595.28 x 841.89 pt
    const pdf = new jsPDF('p', 'pt', 'a4'); // Always Portrait for pagination flow usually
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const availPdfW = pageWidth - margin * 2;
    const availPdfH = pageHeight - margin * 2;

    const scale = 2; // High DPI capture
    const elW = element.offsetWidth;
    const elH = element.offsetHeight;

    // Detect layout if not provided (fallback)
    // If width is much larger than height, assume vertical text (horizontal flow)
    const isVerticalText = options?.layoutDirection === 'vertical' || elW > elH * 1.5;

    // 3. Calculation for Pagination
    let totalPages = 1;
    let pages: { x: number, y: number, w: number, h: number }[] = [];

    // The scale factor to fit the 'fixed' dimension to the PDF page
    let printScale = 1;

    if (isVerticalText) {
      // Vertical Text (Horizontal Flow) -> Height is constrained to Page Height
      printScale = availPdfH / elH;
      
      // Calculate how much width (in original px) fits on one PDF page
      const pageContentWidth = availPdfW / printScale;
      
      totalPages = Math.ceil(elW / pageContentWidth);
      
      // Generate pages (RTL: Right to Left)
      for (let i = 0; i < totalPages; i++) {
        // For RTL, Page 1 is the right-most chunk
        // x starts from: totalWidth - (i + 1) * pageWidth
        // But we need to handle the last page (left-most) which might be partial
        
        // Let's simplify: split from Right to Left
        // Right edge of this page: elW - i * pageContentWidth
        // Left edge of this page: Math.max(0, elW - (i + 1) * pageContentWidth)
        
        const rightEdge = elW - i * pageContentWidth;
        const leftEdge = Math.max(0, elW - (i + 1) * pageContentWidth);
        const chunkW = rightEdge - leftEdge;
        
        pages.push({
          x: leftEdge,
          y: 0,
          w: chunkW,
          h: elH
        });
      }
    } else {
      // Horizontal Text (Vertical Flow) -> Width is constrained to Page Width
      printScale = availPdfW / elW;
      
      const pageContentHeight = availPdfH / printScale;
      totalPages = Math.ceil(elH / pageContentHeight);
      
      for (let i = 0; i < totalPages; i++) {
        // Top to Bottom
        const topEdge = i * pageContentHeight;
        const chunkH = Math.min(pageContentHeight, elH - topEdge);
        
        pages.push({
          x: 0,
          y: topEdge,
          w: elW,
          h: chunkH
        });
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
    
    return true;
  } catch (error) {
    console.error("Export details:", error);
    throw error;
  }
}
