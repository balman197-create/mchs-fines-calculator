(function () {
  function isPdfFile(file) {
    if (!file) return false;
    if (file.type === 'application/pdf') return true;
    return typeof file.name === 'string' && file.name.toLowerCase().endsWith('.pdf');
  }

  function ensurePdfJsLoaded() {
    return typeof window !== 'undefined' &&
      (window.pdfjsLib || window.pdfjs) &&
      typeof (window.pdfjsLib || window.pdfjs).getDocument === 'function';
  }

  function getPdfJs() {
    return window.pdfjsLib || window.pdfjs;
  }

  async function extractTextFromPdfPage(pdfDocument, pageNumber) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = Array.isArray(textContent.items) ? textContent.items : [];
    return items
      .map(function (item) {
        return (item && typeof item.str === 'string') ? item.str : '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function readPdfText(file) {
    if (!file) throw new Error('Файл не передан.');
    if (!isPdfFile(file)) throw new Error('Передан не PDF-файл.');
    if (!ensurePdfJsLoaded()) throw new Error('Модуль чтения PDF не подключен.');

    const pdfjsLib = getPdfJs();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true
      });
      const pdfDocument = await loadingTask.promise;

      const pageTexts = [];
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        try {
          const text = await extractTextFromPdfPage(pdfDocument, i);
          if (text) pageTexts.push(text);
        } catch (e) {
          pageTexts.push('');
        }
      }

      return pageTexts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch (err) {
      throw new Error('Не удалось открыть PDF-документ.');
    }
  }

  window.isPdfFile = isPdfFile;
  window.readPdfText = readPdfText;
})();