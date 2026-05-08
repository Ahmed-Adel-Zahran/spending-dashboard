import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = content.items.map((item) => ({
      text: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
      width: item.width,
      height: item.height,
    }));

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines = [];
    let currentLine = [];
    let lastY = null;

    for (const item of items) {
      if (lastY !== null && Math.abs(item.y - lastY) > 3) {
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => a.x - b.x);
          lines.push(currentLine);
        }
        currentLine = [];
      }
      currentLine.push(item);
      lastY = item.y;
    }
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
    }

    pages.push({
      pageNum: i,
      lines,
      rawText: lines.map((l) => l.map((i) => i.text).join(' ')).join('\n'),
    });
  }

  return {
    fullText: pages.map((p) => p.rawText).join('\n\n'),
    pages,
    numPages: pdf.numPages,
  };
}
