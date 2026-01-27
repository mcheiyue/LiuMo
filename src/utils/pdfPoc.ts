import { jsPDF } from 'jspdf';

/**
 * 提取 CSS 中的 Base64 字体数据
 */
function extractBase64FromCss(css: string): string | null {
  const match = css.match(/base64,([^'"]+)/);
  return match ? match[1] : null;
}

/**
 * POC: 测试 jsPDF 全量嵌入中文字体
 */
export async function runPdfPoc(text: string, fontName: string, fontCss: string) {
  console.time('PDF_POC_Total');
  
  try {
    // 1. 准备数据
    console.log(`[POC] 开始测试字体: ${fontName}`);
    console.log(`[POC] 文本长度: ${text.length}`);
    
    if (!fontCss) {
      throw new Error("没有字体 CSS 数据，请先加载字体");
    }

    console.time('Extract_Base64');
    const base64Data = extractBase64FromCss(fontCss);
    console.timeEnd('Extract_Base64');

    if (!base64Data) {
      throw new Error("无法从 CSS 中提取 Base64 数据");
    }
    
    console.log(`[POC] Base64 数据长度: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

    // 2. 初始化 jsPDF
    console.time('jsPDF_Init');
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    console.timeEnd('jsPDF_Init');

    // 3. 注册字体 (最耗时的步骤)
    console.time('Font_Registration');
    const fontFileName = 'custom_font.ttf';
    
    // addFileToVFS: 将二进制数据(这里是base64)放入虚拟文件系统
    doc.addFileToVFS(fontFileName, base64Data);
    
    // addFont: 注册字体映射
    doc.addFont(fontFileName, fontName, 'normal');
    
    // setFont: 激活字体
    doc.setFont(fontName);
    console.timeEnd('Font_Registration');

    // 4. 绘制内容
    console.time('Render_Text');
    doc.setFontSize(24);
    doc.text("字体嵌入测试 (Font Embedding Test)", 20, 30);
    
    doc.setFontSize(14);
    const lines = doc.splitTextToSize(text, 170); // 170mm width
    doc.text(lines, 20, 50);
    console.timeEnd('Render_Text');

    // 5. 保存文件
    console.time('Save_File');
    // 使用 arraybuffer 配合 Tauri fs API 保存，或者直接用 save() 触发浏览器下载
    // 为了 POC 方便，先用 save()
    doc.save(`poc_${fontName}_${Date.now()}.pdf`);
    console.timeEnd('Save_File');

    console.log("[POC] 测试完成 ✅");
    
    // 估算 PDF 大小
    const pdfOutput = doc.output('arraybuffer');
    console.log(`[POC] 生成 PDF 大小: ${(pdfOutput.byteLength / 1024 / 1024).toFixed(2)} MB`);

  } catch (e) {
    console.error("[POC] 测试失败 ❌", e);
    alert(`POC 失败: ${e}`);
  } finally {
    console.timeEnd('PDF_POC_Total');
  }
}
