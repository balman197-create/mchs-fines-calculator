// Каркас парсинга текста предписания (без OCR/PDF). Результат — структура для будущего конвейера.

/**
 * @typedef {Object} ParsedViolation
 * @property {number} itemIndex
 * @property {string} prescriptionNumber
 * @property {string} location
 * @property {string} violationText
 * @property {string[]} normRefs
 * @property {string|null} deadline
 * @property {string} rawText
 * @property {'table-row'|'list-item'|'unknown'} detectionMode
 */

/**
 * @typedef {Object} ParsedPrescription
 * @property {'pdf'|'image'|'unknown'} sourceType
 * @property {'table'|'numbered-list'|'unknown'} parseMode
 * @property {boolean} anchorFound
 * @property {string} anchorText
 * @property {ParsedViolation[]} violations
 * @property {string} rawViolationBlock
 * @property {string[]} warnings
 * @property {Record<string, string>} meta
 */

const ANCHOR_RULES = [
  {
    re: /необходимо\s+устранить\s+следующие\s+нарушения\s+требований\s+пожарной\s+безопасности/i,
    displayText: 'необходимо устранить следующие нарушения требований пожарной безопасности'
  },
  {
    re: /необходимо\s+устранить\s+следующие\s+нарушения/i,
    displayText: 'необходимо устранить следующие нарушения'
  },
  {
    re: /необходимо\s+устранить\s+следующие\s+нарушения\s+требований/i,
    displayText: 'необходимо устранить следующие нарушения требований'
  },
  {
    re: /следует\s+устранить\s+следующие\s+нарушения(?:\s+требований\s+пожарной\s+безопасности)?/i,
    displayText: null
  },
  {
    re: /требуется\s+устранить\s+следующие\s+нарушения(?:\s+требований\s+пожарной\s+безопасности)?/i,
    displayText: null
  }
];

function detectViolationAnchor(rawText) {
  const text = rawText == null ? '' : String(rawText);

  for (const { re, displayText } of ANCHOR_RULES) {
    const match = re.exec(text);

    if (match) {
      const anchorText = displayText || match[0].replace(/\s+/g, ' ').trim();

      return {
        found: true,
        anchorText,
        matchLength: match[0].length,
        matchIndex: match.index,
        afterAnchor: text.slice(match.index + match[0].length)
      };
    }
  }

  return {
    found: false,
    anchorText: '',
    matchLength: 0,
    matchIndex: -1,
    afterAnchor: ''
  };
}

function detectParseMode(textBlock) {
  const block = String(textBlock || '');
  const lower = block.toLowerCase();
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const pipeLines = lines.filter((l) => l.includes('|')).length;
  const hasPipe = pipeLines > 0;
  const hasTableKeywords = /срок\s*устранения|вид\s+нарушени|пункт\b|отметка|наименован/i.test(
    lower
  );

  if ((hasPipe && pipeLines >= 2) || (hasTableKeywords && lines.length >= 2)) {
    return 'table';
  }

  if (/^\s*\d+[\.\)]\s*\S/m.test(block)) {
    return 'numbered-list';
  }

  return 'unknown';
}

function extractNormRefs(text) {
  const s = String(text || '');
  const found = new Set();

  const pushSlice = (start, end) => {
    const frag = s.slice(start, end).trim();
    if (frag) {
      found.add(frag);
    }
  };

  const rules = [
    { re: /69\s*[-–−]?\s*ФЗ/gi },
    { re: /123\s*[-–−]?\s*ФЗ/gi },
    { re: /\b1479\b/g },
    { re: /СП\s*[\d.]+(?:\.\d+)?/gi },
    { re: /ГОСТ\s*[Рр]?\s*[\d.]+(?:[-–−][\d.]+)?/gi },
    { re: /ст\.?\s*\d+(?:\.\d+)*/gi },
    { re: /п\.?\s*\d+(?:\.\d+)*/gi }
  ];

  rules.forEach(({ re }) => {
    re.lastIndex = 0;
    let m;

    while ((m = re.exec(s)) !== null) {
      pushSlice(m.index, m.index + m[0].length);
    }
  });

  return [...found];
}

function extractDeadline(text) {
  const normalized = String(text || '').replace(/\r?\n/g, ' ');
  const m = normalized.match(/срок\s+устранения(?:\s+нарушения)?[^0-9]{0,80}(\d{2}\.\d{2}\.\d{4})/i);

  return m ? m[1] : null;
}

function looksLikeLocationLine(line) {
  const l = String(line || '').trim();

  if (!l) {
    return false;
  }

  if (/^(адрес|адрес\s*объекта|объект|место\s*нарушения|корпус)\s*[:\.]?\s*/i.test(l)) {
    return true;
  }

  if (l.length > 220) {
    return false;
  }

  return /\b(обл\.|область|край|респ\.|г\.|пос\.|пгт\.|ул\.|улица|просп\.|пер\.|шоссе|д\.|дом|корп\.|стр\.)\b/i.test(
    l
  );
}

function parseTableViolations(rawViolationBlock, warnings) {
  const block = String(rawViolationBlock || '');

  // Сначала пробуем разбить по нумерованным пунктам (1. 2. 3. ...)
  // Это работает даже когда PDF.js не даёт символы |
  const numberedRe = /(?:^|\s)([1-9]|1\d|2[0-4])[.)]\s{1,4}(?=[А-ЯЁ])([\s\S]*?)(?=(?:\s(?:[1-9]|1\d|2[0-4])[.)]\s{1,4}[А-ЯЁ])|$)/g;
  const out = [];
  let m;

  while ((m = numberedRe.exec(block)) !== null) {
    const body = m[2].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (!body || body.length < 10) continue;

    // Пропускаем строки которые похожи на шапку таблицы
    if (/^(наименование|срок\s*устранения|вид\s+нарушени|пункт\b|отметка|перечень\s+рекомен)/i.test(body)) continue;

    // Пропускаем служебные хвосты — это дубли второй части каждого нарушения
    if (/^(постановление|федеральный\s+закон|нарушенное\s+обязательное|перечень\s+рекоменд)/i.test(body)) continue;

    // Обрезаем violationText — берём только до первого служебного блока
    const serviceMarkers = [
      /\.\s*нарушение\s+(п\s*\.|ч\s*\.|ст\s*\.)/i,
      /место\s+выявления\s+нарушения/i,
      /наименование\s+нормативного/i,
      /нарушенное\s+обязательное\s+требование/i,
      /перечень\s+рекомен/i,
      /срок\s+устранения\s+нарушения/i
    ];

    let cutAt = body.length;
    for (const marker of serviceMarkers) {
      const idx = body.search(marker);
      if (idx > 10 && idx < cutAt) cutAt = idx;
    }
    const violationText = body.slice(0, cutAt).trim();

    // Извлекаем location — только до точки или запятой
    let location = '';
    const locRaw = body.match(/место\s+выявления\s+нарушения\s*[:\.]?\s*([\s\S]{5,120})/i);
    if (locRaw) {
      let loc = locRaw[1];
      const stopAt = loc.search(/[.,]|наименование|нарушенное|перечень|срок\s+устранения/i);
      if (stopAt > 3) loc = loc.slice(0, stopAt);
      location = loc.trim().slice(0, 80);
    }

    if (!violationText || violationText.length < 10) continue;

    let deadline = null;
    const rawForDeadline = body.replace(/\r?\n/g, ' ');
    const deadlineMatch = rawForDeadline.match(
      /срок\s+устранения[^0-9]{0,40}(\d{2}\.\d{2}\.\d{4})/i
    );
    if (deadlineMatch) {
      deadline = deadlineMatch[1];
    }

    out.push({
      itemIndex: out.length + 1,
      prescriptionNumber: '',
      location,
      violationText,
      normRefs: extractNormRefs(body),
      deadline,
      rawText: body,
      detectionMode: 'table-row'
    });
  }

  // Если нумерованный подход не дал результат — падаем в построчный режим
  if (out.length === 0) {
    const lines = block.split(/\r?\n/).map((l) => l.trim());
    let currentLocation = '';
    let itemIndex = 0;

    for (const line of lines) {
      if (!line) continue;
      if (/^(срок|вид|пункт|отметка|наименован|№)\s*[|]/i.test(line)) continue;

      if (looksLikeLocationLine(line) && !line.includes('|')) {
        currentLocation = line.replace(/^(адрес|объект|место\s*нарушения|корпус)\s*[:\.]?\s*/i, '').trim();
        continue;
      }

      if (line.includes('|')) {
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
        if (cells.length === 0) continue;
        itemIndex += 1;
        const rowText = cells.join(' · ');
        out.push({
          itemIndex,
          prescriptionNumber: '',
          location: currentLocation,
          violationText: rowText,
          normRefs: extractNormRefs(rowText),
          deadline: extractDeadline(rowText),
          rawText: line,
          detectionMode: 'table-row'
        });
      }
    }
  }

  if (out.length === 0) {
    warnings.push('Табличный режим: не удалось выделить строки нарушений.');
  }

  return out;
}

function parseNumberedListViolations(rawViolationBlock, warnings) {
  const block = String(rawViolationBlock || '');
  const re = /(?:^|\r?\n)\s*(\d+)[\.\)]\s*([\s\S]*?)(?=(?:\r?\n)\s*\d+[\.\)]\s|$)/g;
  const out = /** @type {ParsedViolation[]} */ ([]);
  let m;

  while ((m = re.exec(block)) !== null) {
    const body = m[2].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const num = m[1];
    const rawText = `${num}. ${body}`;

    if (!body) {
      continue;
    }

    out.push({
      itemIndex: out.length + 1,
      prescriptionNumber: '',
      location: '',
      violationText: body,
      normRefs: extractNormRefs(body),
      deadline: extractDeadline(body),
      rawText,
      detectionMode: 'list-item'
    });
  }

  if (out.length === 0) {
    warnings.push('Режим нумерованного списка: пункты по шаблону «1. …» не найдены.');
  }

  return out;
}

function extractMetaFromPrescription(fullText) {
  const header = String(fullText || '').slice(0, 1500);
  /** @type {Record<string, string>} */
  const meta = {};

  const presc = header.match(/предписани[ея][^\n]{0,160}?№\s*([^\s,\n;]+)/i);
  if (presc) {
    meta.prescriptionNumber = presc[1].trim();
  }

  const fromDate = header.match(/\bот\s+(\d{2}\.\d{2}\.\d{4})\b/i);
  if (fromDate) {
    meta.issueDate = fromDate[1];
  }

  const orgLine = header.split(/\r?\n/).find((line) =>
    /(МЧС|пожарн|надзор|управлени|департамент|государственн)/i.test(line)
  );

  if (orgLine && orgLine.length < 200) {
    meta.organization = orgLine.trim();
  }

  return meta;
}

/**
 * @param {string} rawText
 * @param {{ sourceType?: 'pdf'|'image'|'unknown' }} [options]
 * @returns {ParsedPrescription}
 */
function parsePrescriptionText(rawText, options = {}) {
  const sourceType = options.sourceType === 'pdf' || options.sourceType === 'image'
    ? options.sourceType
    : 'unknown';

  const fullText = rawText == null ? '' : String(rawText);
  /** @type {string[]} */
  const warnings = [];
  const anchor = detectViolationAnchor(fullText);

  if (!anchor.found) {
    return {
      sourceType,
      parseMode: 'unknown',
      anchorFound: false,
      anchorText: '',
      violations: [],
      rawViolationBlock: '',
      warnings: ['Якорная фраза о перечне нарушений не найдена.'],
      meta: extractMetaFromPrescription(fullText)
    };
  }

  const rawViolationBlock = anchor.afterAnchor.trim();
  const parseMode = detectParseMode(rawViolationBlock);
  /** @type {ParsedViolation[]} */
  let violations = [];

  if (parseMode === 'table') {
    violations = parseTableViolations(rawViolationBlock, warnings);
  } else if (parseMode === 'numbered-list') {
    violations = parseNumberedListViolations(rawViolationBlock, warnings);
  } else {
    warnings.push('Структура блока нарушений не определена; сохранён черновик целиком после якоря.');

    if (rawViolationBlock) {
      violations = [
        {
          itemIndex: 1,
          prescriptionNumber: '',
          location: '',
          violationText:
            rawViolationBlock.length > 2000 ? `${rawViolationBlock.slice(0, 2000)}…` : rawViolationBlock,
          normRefs: extractNormRefs(rawViolationBlock),
          deadline: extractDeadline(rawViolationBlock),
          rawText: rawViolationBlock,
          detectionMode: 'unknown'
        }
      ];
    }
  }

  return {
    sourceType,
    parseMode,
    anchorFound: true,
    anchorText: anchor.anchorText,
    violations,
    rawViolationBlock,
    warnings,
    meta: extractMetaFromPrescription(fullText)
  };
}
