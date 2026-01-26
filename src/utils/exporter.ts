import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export async function exportToPDF(element: HTMLElement, defaultName: string = 'liumo-practice.pdf') {
  try {
    // 1. Open Native Save Dialog FIRST
    // This feels snappier to the user than waiting for generation first
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{
        name: 'PDF Document',
        extensions: ['pdf']
      }]
    });

    if (!filePath) return false; // User cancelled

    // 2. Capture the element
    const scale = 2;
    const style = {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${element.clientWidth}px`,
      height: `${element.clientHeight}px`,
    };

    const param = {
      height: element.clientHeight * scale,
      width: element.clientWidth * scale,
      quality: 1,
      bgcolor: '#F9F4E8', // Ensure background color is consistent
      style: {
        ...style,
        boxShadow: 'none',
        border: 'none',
        textShadow: 'none', // Force remove any text shadows
      }
    };

    // Use PNG for lossless quality to avoid JPEG artifacts around text
    const imgData = await domtoimage.toPng(element, param);

    // Get image dimensions for layout calculation
    const imgWidth = element.clientWidth * scale;
    const imgHeight = element.clientHeight * scale;
    console.log(`Captured Image: ${imgWidth}x${imgHeight}`);

    // 3. Create PDF
    // A4 size: 595.28 x 841.89 pt
    const isPortrait = imgHeight > imgWidth;
    const orientation = isPortrait ? 'p' : 'l';
    const pdf = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Fit image to page maintaining aspect ratio
    const margin = 20; // Minimal margin
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    
    const widthRatio = availableWidth / imgWidth;
    const heightRatio = availableHeight / imgHeight;
    const ratio = Math.min(widthRatio, heightRatio);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    // Center it
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;
    
    // Draw Image (No headers, no footers, no extra borders)
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    
    // 4. Save to Disk using Tauri FS
    // Get raw binary data
    const pdfOutput = pdf.output('arraybuffer');
    
    // Write file
    await writeFile(filePath, new Uint8Array(pdfOutput));
    
    return true;
  } catch (error) {
    console.error("Export details:", error);
    throw error;
  }
}
