// Преобразует логическое значение в HTML-атрибут checked.
function getCheckedAttribute(value) {
  return value ? ' checked' : '';
}

// Защищает HTML-разметку от случайных спецсимволов в данных.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createAccordionSection(title, contentHtml, options = {}) {
  const isOpen = options.isOpen === true;
  const keyAttribute = options.key ? ` data-accordion-key="${escapeHtml(options.key)}"` : '';
  const summary = options.summary || '';
  const summaryHtml = summary
    ? `<span class="calculator-section-summary" data-accordion-summary>${escapeHtml(summary)}</span>`
    : '<span class="calculator-section-summary" data-accordion-summary hidden></span>';

  return `
    <section class="calculator-section${isOpen ? ' is-open' : ''}${options.isComplete ? ' is-complete' : ''}" data-accordion-section${keyAttribute}>
      <button class="calculator-section-header" type="button" data-accordion-header aria-expanded="${isOpen ? 'true' : 'false'}">
        <span class="calculator-section-heading">
          <h2 class="calculator-section-title">${escapeHtml(title)}</h2>
          ${summaryHtml}
        </span>
        <span class="calculator-section-arrow" aria-hidden="true"></span>
      </button>
      <div
        class="calculator-section-content"
        data-accordion-content
        aria-hidden="${isOpen ? 'false' : 'true'}"
        ${isOpen ? '' : 'hidden'}
      >
        ${contentHtml}
      </div>
    </section>
  `;
}

function getPluralForm(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function getSubjectSummary() {
  const subject = SUBJECTS.find((item) => item.id === state.subjectId);

  return subject ? subject.label : '';
}

function getObjectTypeSummary() {
  const objectType = OBJECT_TYPES.find((item) => item.id === state.objectTypeId);

  return objectType ? objectType.label : '';
}

function getModifiersSummary() {
  const selected = [];

  if (state.hasPrescription) {
    selected.push(`${state.prescriptionCount} ${getPluralForm(state.prescriptionCount, 'предписание', 'предписания', 'предписаний')}`);
  }

  if (state.hasRepeat) {
    selected.push('риск повторной проверки');
  }

  if (state.specialFireRegime) {
    selected.push('особый режим');
  }

  return selected.join(', ');
}

function getViolationsSummary() {
  const count = state.violations.length;

  if (count === 0) {
    return '';
  }

  return `${count} ${getPluralForm(count, 'нарушение', 'нарушения', 'нарушений')} выбрано`;
}

function getConsequencesSummary() {
  const labels = {
    damage: 'имущественный ущерб',
    healthHarm: 'вред здоровью',
    death: 'смерть человека'
  };

  return Object.entries(labels)
    .filter(([key]) => state.consequences[key])
    .map(([, label]) => label)
    .join(', ');
}

function getAccordionSectionState(key) {
  if (key === 'subject') {
    return {
      isComplete: Boolean(state.subjectId),
      summary: getSubjectSummary()
    };
  }

  if (key === 'objectType') {
    return {
      isComplete: Boolean(state.objectTypeId),
      summary: getObjectTypeSummary()
    };
  }

  if (key === 'modifiers') {
    const isComplete = state.hasPrescription || state.hasRepeat || state.specialFireRegime;

    return {
      isComplete,
      summary: isComplete ? getModifiersSummary() : ''
    };
  }

  if (key === 'violations') {
    return {
      isComplete: state.violations.length > 0,
      summary: getViolationsSummary()
    };
  }

  if (key === 'consequences') {
    const isComplete = Object.values(state.consequences).some(Boolean);

    return {
      isComplete,
      summary: isComplete ? getConsequencesSummary() : ''
    };
  }

  return {
    isComplete: false,
    summary: ''
  };
}

function createSubjectSection() {
  const optionsHtml = SUBJECTS.map((subject) => `
    <label class="calculator-option">
      <input
        type="radio"
        name="subject"
        value="${escapeHtml(subject.id)}"
        ${getCheckedAttribute(state.subjectId === subject.id)}
      >
      <span>${escapeHtml(subject.label)}</span>
    </label>
  `).join('');

  return createAccordionSection('Кто несёт ответственность?', `
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    `, { key: 'subject', isOpen: true, ...getAccordionSectionState('subject') });
}

function createObjectTypeSection() {
  const optionsHtml = OBJECT_TYPES.map((objectType) => `
    <label class="calculator-option">
      <input
        type="radio"
        name="objectType"
        value="${escapeHtml(objectType.id)}"
        ${getCheckedAttribute(state.objectTypeId === objectType.id)}
      >
      <span>
        <strong>${escapeHtml(objectType.label)}</strong>
        <span class="calculator-meta">${escapeHtml(objectType.description)}</span>
      </span>
    </label>
  `).join('');

  return createAccordionSection('Тип объекта', `
      <p class="calculator-meta">Выберите тип объекта, на котором МЧС проводило проверку</p>
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    `, { key: 'objectType', ...getAccordionSectionState('objectType') });
}

function getFirstUploadedPrescriptionFile() {
  return state.prescriptionFiles.find(Boolean) || null;
}

function createPrescriptionParseDebugBlock() {
  if (!hasUploadedPrescriptionFiles() || state.prescriptionReadStatus === 'idle') {
    return '';
  }

  const result = state.prescriptionParseResult;
  const error = state.prescriptionParseError;
  const statusLabels = {
    reading: 'PDF читается',
    success: 'PDF прочитан',
    error: 'PDF не удалось прочитать',
    skipped: 'Автоматический разбор не запущен'
  };
  const violations = result && Array.isArray(result.violations) ? result.violations : [];
  const violationsHtml = violations.slice(0, 3).map((violation) => `
    <li class="calculator-pdf-debug-item">
      ${violation.location ? `<span><strong>Место:</strong> ${escapeHtml(violation.location)}</span>` : ''}
      <span><strong>Нарушение:</strong> ${escapeHtml(violation.violationText || 'Текст не выделен')}</span>
      ${violation.deadline ? `<span><strong>Срок:</strong> ${escapeHtml(violation.deadline)}</span>` : ''}
      <span><strong>Нормы:</strong> ${escapeHtml(violation.normRefs && violation.normRefs.length ? violation.normRefs.join(', ') : 'не найдены')}</span>
    </li>
  `).join('');

  return `
    <div class="calculator-pdf-debug">
      <p class="calculator-pdf-debug-title">Технический разбор PDF</p>
      <p><strong>Статус:</strong> ${escapeHtml(statusLabels[state.prescriptionReadStatus] || state.prescriptionReadStatus)}</p>
      ${error ? `<p class="calculator-pdf-debug-error">${escapeHtml(error)}</p>` : ''}
      ${result ? `
        <dl class="calculator-pdf-debug-list">
          <div>
            <dt>Найден блок нарушений</dt>
            <dd>${result.anchorFound ? 'да' : 'нет'}</dd>
          </div>
          <div>
            <dt>Режим распознавания</dt>
            <dd>${escapeHtml(result.parseMode)}</dd>
          </div>
          <div>
            <dt>Найдено нарушений</dt>
            <dd>${violations.length}</dd>
          </div>
        </dl>
        ${violationsHtml ? `<ol class="calculator-pdf-debug-items">${violationsHtml}</ol>` : ''}
      ` : ''}
    </div>
  `;
}

function createPrescriptionFilesUpload() {
  if (!state.hasPrescription) {
    return '';
  }

  const count = Number(state.prescriptionCount) || 1;
  const fieldsHtml = Array.from({ length: count }, (_, index) => {
    const file = state.prescriptionFiles[index];
    const label = count > 1 ? `Загрузить предписание ${index + 1}` : 'Загрузить предписание';
    const fileName = file ? file.name : 'Файл не выбран';
    const fileStatusHtml = file
      ? `
        <div class="calculator-file-status">
          <span class="calculator-file-status-label">Файл загружен</span>
          <span class="calculator-file-status-name">${escapeHtml(file.name)}</span>
          <span class="calculator-file-status-note">Документ сохранён и готов к следующему шагу.</span>
          <button
            class="calculator-file-remove"
            type="button"
            data-prescription-file-remove="${index}"
          >
            Удалить файл
          </button>
        </div>
      `
      : '';

    return `
      <div class="calculator-field calculator-file-field">
        <span class="calculator-field-label">${escapeHtml(label)}</span>
        <label class="calculator-file-picker">
          <input
            class="calculator-file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            data-prescription-file-input
            data-prescription-file-index="${index}"
          >
          <span class="calculator-file-button">Выбрать файл</span>
        </label>
        <span class="calculator-meta">Поддерживаются PDF, JPG, JPEG, PNG</span>
        <span class="calculator-file-name" data-prescription-file-name="${index}">${escapeHtml(fileName)}</span>
        ${fileStatusHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="calculator-upload-block">
      <p class="calculator-nested-title">Загрузка предписания</p>
      <p class="calculator-meta">Если у вас есть файл предписания МЧС, вы можете загрузить его для последующего анализа</p>
      ${fieldsHtml}
      ${createPrescriptionParseDebugBlock()}
    </div>
  `;
}

function createModifiersSection() {
  const isDocumentMode = hasUploadedPrescriptionFiles();
  const modifiers = [
    {
      key: 'hasRepeat',
      label: 'Есть риск повторной проверки / повторного неисполнения'
    },
    {
      key: 'specialFireRegime',
      label: 'Действует особый противопожарный режим'
    }
  ];

  const optionsHtml = modifiers.map((modifier) => `
    <label class="calculator-option">
      <input
        type="checkbox"
        data-modifier-key="${escapeHtml(modifier.key)}"
        ${getCheckedAttribute(state[modifier.key])}
      >
      <span>${escapeHtml(modifier.label)}</span>
    </label>
  `).join('');
  const prescriptionCountOptions = [
    {
      value: '1',
      label: '1 предписание'
    },
    {
      value: '2',
      label: '2 предписания'
    }
  ];
  const prescriptionCountOptionsHtml = prescriptionCountOptions.map((option) => `
    <label class="calculator-option">
      <input
        type="radio"
        name="prescriptionCount"
        value="${escapeHtml(option.value)}"
        ${getCheckedAttribute(String(state.prescriptionCount) === option.value)}
      >
      <span>${escapeHtml(option.label)}</span>
    </label>
  `).join('');

  return createAccordionSection('Дополнительные условия', `
      <div class="calculator-options">
        <label class="calculator-option">
          <input
            type="checkbox"
            data-prescription-toggle
            ${getCheckedAttribute(state.hasPrescription)}
          >
          <span>Есть предписание МЧС</span>
        </label>
        ${optionsHtml}
      </div>
      <div class="calculator-nested-question${state.hasPrescription ? ' is-open' : ''}" data-prescription-count-question>
        <p class="calculator-nested-title">Количество предписаний</p>
        <div class="calculator-options">
          ${prescriptionCountOptionsHtml}
        </div>
        <div data-prescription-files-wrapper>
          ${createPrescriptionFilesUpload()}
        </div>
      </div>
    `, { key: 'modifiers', isOpen: isDocumentMode, ...getAccordionSectionState('modifiers') });
}

function createViolationsSection() {
  const groupsHtml = VIOLATION_GROUPS.map((group) => {
    const violationsHtml = group.violations.map((violation) => `
      <label class="calculator-option">
        <input
          type="checkbox"
          data-violation-id="${escapeHtml(violation.id)}"
          ${getCheckedAttribute(state.violations.includes(violation.id))}
        >
        <span>
          <strong>${escapeHtml(violation.label)}</strong>
          <span class="calculator-meta">${escapeHtml(violation.article)}</span>
          <span class="calculator-meta">${escapeHtml(violation.description)}</span>
        </span>
      </label>
    `).join('');

    return `
      <div class="calculator-group">
        <h3 class="calculator-group-title">${escapeHtml(group.label)}</h3>
        <div class="calculator-options">
          ${violationsHtml}
        </div>
      </div>
    `;
  }).join('');

  return createAccordionSection('Какие нарушения выявлены?', `
      ${groupsHtml}
    `, { key: 'violations', ...getAccordionSectionState('violations') });
}

function createConsequencesSection() {
  const consequences = [
    {
      key: 'damage',
      label: 'Причинен имущественный ущерб'
    },
    {
      key: 'healthHarm',
      label: 'Есть вред здоровью'
    },
    {
      key: 'death',
      label: 'Есть смерть человека'
    }
  ];

  const optionsHtml = consequences.map((consequence) => `
    <label class="calculator-option">
      <input
        type="checkbox"
        data-consequence-key="${escapeHtml(consequence.key)}"
        ${getCheckedAttribute(state.consequences[consequence.key])}
      >
      <span>${escapeHtml(consequence.label)}</span>
    </label>
  `).join('');

  return createAccordionSection('Есть ли последствия?', `
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    `, { key: 'consequences', ...getAccordionSectionState('consequences') });
}

function createDocumentModeNotice() {
  return `
    <section class="calculator-document-mode">
      <h2 class="calculator-document-mode-title">Режим работы по документу</h2>
      <p>
        Вы загрузили предписание. Дальнейшие ручные поля скрыты: калькулятор будет работать в режиме документа.
      </p>
      <p class="calculator-document-mode-note">
        Анализ содержимого файла пока не подключён, поэтому расчёт по документу будет добавлен отдельным шагом.
      </p>
    </section>
  `;
}

function createCalculatorControls() {
  return `
    <div class="calculator-controls">
      <div class="calculator-actions">
        <button class="calculator-button" type="button" data-action="calculate">Рассчитать</button>
        <button class="calculator-button calculator-button--secondary" type="button" data-action="reset">Сбросить</button>
      </div>
      <div id="calculator-result" class="calculator-result"></div>
    </div>
  `;
}

function hasRequiredFieldsForCalculation() {
  return Boolean(state.subjectId && state.objectTypeId && state.violations.length > 0);
}

function renderRequiredFieldsPlaceholder() {
  const missingFields = [];

  if (!state.subjectId) {
    missingFields.push({
      key: 'subject',
      label: 'Кто несёт ответственность'
    });
  }

  if (!state.objectTypeId) {
    missingFields.push({
      key: 'objectType',
      label: 'Тип объекта'
    });
  }

  if (state.violations.length === 0) {
    missingFields.push({
      key: 'violations',
      label: 'Какие нарушения выявлены'
    });
  }

  const missingFieldsHtml = missingFields.map((field) => `
        <li>
          <button class="result-validation-link" type="button" data-result-scroll-target="${escapeHtml(field.key)}">
            ${escapeHtml(field.label)}
          </button>
        </li>
  `).join('');

  return `
    <div class="result-validation">
      <p class="result-validation-title">Для расчёта нужно заполнить обязательные поля</p>
      <p>Пожалуйста, укажите:</p>
      <ul class="result-validation-list">
        ${missingFieldsHtml}
      </ul>
      <p class="result-validation-note">Остальные параметры влияют на точность, но не обязательны.</p>
    </div>
  `;
}

function renderDocumentModePlaceholder() {
  return `
    <div class="result-validation">
      <p class="result-validation-title">Режим работы по документу</p>
      <p>
        Предписание загружено, но автоматический анализ файла пока не подключён.
        Расчёт штрафов по содержимому документа будет добавлен следующим этапом.
      </p>
      <p class="result-validation-note">
        Чтобы воспользоваться ручным расчётом сейчас, удалите загруженный файл предписания.
      </p>
    </div>
  `;
}

function updateAccordionSectionHeaders(container) {
  container.querySelectorAll('[data-accordion-section]').forEach((section) => {
    const key = section.dataset.accordionKey;
    const summaryElement = section.querySelector('[data-accordion-summary]');
    const sectionState = getAccordionSectionState(key);

    section.classList.toggle('is-complete', sectionState.isComplete);

    if (!summaryElement) {
      return;
    }

    summaryElement.textContent = sectionState.summary;
    summaryElement.hidden = !sectionState.summary;
  });
}

function closeOtherAccordionSections(container, currentSection) {
  container.querySelectorAll('[data-accordion-section].is-open').forEach((section) => {
    if (section !== currentSection) {
      setAccordionSectionOpen(section, false);
    }
  });
}

function setAccordionSectionOpen(section, shouldOpen, shouldAnimate = true) {
  const header = section.querySelector('[data-accordion-header]');
  const content = section.querySelector('[data-accordion-content]');

  if (!header || !content) {
    return;
  }

  const isOpen = section.classList.contains('is-open');

  if (shouldOpen) {
    if (isOpen) {
      header.setAttribute('aria-expanded', 'true');
      content.setAttribute('aria-hidden', 'false');
      content.hidden = false;
      content.style.maxHeight = 'none';
      return;
    }

    content.hidden = false;
    content.style.maxHeight = '0px';
    void content.offsetHeight;

    if (!shouldAnimate) {
      section.classList.add('is-open');
      header.setAttribute('aria-expanded', 'true');
      content.setAttribute('aria-hidden', 'false');
      content.style.maxHeight = 'none';
      return;
    }

    content.addEventListener('transitionend', () => {
      if (section.classList.contains('is-open')) {
        content.style.maxHeight = 'none';
      }
    }, { once: true });

    requestAnimationFrame(() => {
      section.classList.add('is-open');
      header.setAttribute('aria-expanded', 'true');
      content.setAttribute('aria-hidden', 'false');
      content.style.maxHeight = `${content.scrollHeight + 20}px`;
    });

    return;
  }

  if (!isOpen) {
    header.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
    content.style.maxHeight = '0px';
    content.hidden = true;
    return;
  }

  content.style.maxHeight = `${content.scrollHeight}px`;
  void content.offsetHeight;

  if (!shouldAnimate) {
    section.classList.remove('is-open');
    header.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
    content.style.maxHeight = '0px';
    content.hidden = true;
    return;
  }

  content.addEventListener('transitionend', function handleTransitionEnd(event) {
    if (event.propertyName !== 'max-height') {
      return;
    }

    if (!section.classList.contains('is-open')) {
      content.hidden = true;
    }

    content.removeEventListener('transitionend', handleTransitionEnd);
  });

  requestAnimationFrame(() => {
    section.classList.remove('is-open');
    header.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
    content.style.maxHeight = '0px';
  });
}

function syncOpenAccordionHeights(container) {
  container.querySelectorAll('.calculator-section.is-open [data-accordion-content]').forEach((content) => {
    content.style.maxHeight = 'none';
  });
}

function setNestedQuestionOpen(question, shouldOpen) {
  const accordionContent = question.closest('[data-accordion-content]');

  if (!accordionContent) {
    question.classList.toggle('is-open', shouldOpen);
    return;
  }

  const currentHeight = accordionContent.scrollHeight;
  const currentQuestionStyles = window.getComputedStyle(question);
  const currentQuestionMargin = parseFloat(currentQuestionStyles.marginTop) || 0;
  const nextQuestionMargin = shouldOpen ? 16 : 0;
  const nextQuestionHeight = shouldOpen ? question.scrollHeight : 0;
  const currentQuestionHeight = question.offsetHeight + currentQuestionMargin;
  const nextHeight = Math.max(
    currentHeight - currentQuestionHeight + nextQuestionHeight + nextQuestionMargin,
    0
  );

  accordionContent.style.maxHeight = `${currentHeight}px`;

  requestAnimationFrame(() => {
    question.classList.toggle('is-open', shouldOpen);
    accordionContent.style.maxHeight = `${nextHeight}px`;
  });

  accordionContent.addEventListener('transitionend', function handleTransitionEnd(event) {
    if (event.propertyName !== 'max-height') {
      return;
    }

    accordionContent.style.maxHeight = 'none';
    accordionContent.removeEventListener('transitionend', handleTransitionEnd);
  });
}

function scrollToAccordionSection(container, key) {
  const section = container.querySelector(`[data-accordion-key="${key}"]`);
  const header = section ? section.querySelector('[data-accordion-header]') : null;
  const title = section ? section.querySelector('.calculator-section-title') : null;

  if (!section || !header || !title) {
    return;
  }

  const wasOpen = section.classList.contains('is-open');

  closeOtherAccordionSections(container, section);
  setAccordionSectionOpen(section, true);

  if (wasOpen) {
    syncOpenAccordionHeights(container);
  }

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  title.classList.remove('is-error-pulsing');
  void title.offsetWidth;
  title.classList.add('is-error-pulsing');

  window.setTimeout(() => {
    title.classList.remove('is-error-pulsing');
  }, 5400);
}

function initAccordionSections(container) {
  container.querySelectorAll('[data-accordion-section]').forEach((section) => {
    const header = section.querySelector('[data-accordion-header]');
    const content = section.querySelector('[data-accordion-content]');

    if (!header || !content) {
      return;
    }

    setAccordionSectionOpen(section, section.classList.contains('is-open'), false);

    header.addEventListener('click', () => {
      const isOpen = section.classList.contains('is-open');

      if (!isOpen) {
        closeOtherAccordionSections(container, section);
        setAccordionSectionOpen(section, true);
        return;
      }

      setAccordionSectionOpen(section, false);
    });

    section.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        setAccordionSectionOpen(section, true);
        syncOpenAccordionHeights(container);
        requestAnimationFrame(() => {
          updateAccordionSectionHeaders(container);
        });
      });
    });
  });

  updateAccordionSectionHeaders(container);
}

function addPrescriptionFileEventListeners(container) {
  container.querySelectorAll('[data-prescription-file-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const index = Number(input.dataset.prescriptionFileIndex);
      const file = input.files[0] || null;

      setPrescriptionFile(index, file);
      renderCalculatorUI(container);
    });
  });

  container.querySelectorAll('[data-prescription-file-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      removePrescriptionFile(Number(button.dataset.prescriptionFileRemove));

      renderCalculatorUI(container);
    });
  });
}

function renderPrescriptionFilesUpload(container) {
  const wrapper = container.querySelector('[data-prescription-files-wrapper]');

  if (!wrapper) {
    return;
  }

  wrapper.innerHTML = createPrescriptionFilesUpload();
  addPrescriptionFileEventListeners(container);
  syncOpenAccordionHeights(container);
}

async function analyzeUploadedPrescriptionPdf(container) {
  const renderFreshCalculatorUI = () => {
    const freshContainer = document.getElementById('mchs-calculator-root');
    if (freshContainer) renderCalculatorUI(freshContainer);
  };
  const file = getFirstUploadedPrescriptionFile();

  if (!file) {
    setPrescriptionParseState({
      prescriptionReadStatus: 'error',
      prescriptionParseResult: null,
      prescriptionParseError: 'Файл предписания не найден.'
    });
    renderCalculatorUI(container);
    return;
  }

  if (typeof isPdfFile !== 'function' || typeof readPdfText !== 'function') {
    setPrescriptionParseState({
      prescriptionReadStatus: 'error',
      prescriptionParseResult: null,
      prescriptionParseError: 'Модуль чтения PDF не подключен.'
    });
    renderCalculatorUI(container);
    return;
  }

  if (typeof parsePrescriptionText !== 'function') {
    setPrescriptionParseState({
      prescriptionReadStatus: 'error',
      prescriptionParseResult: null,
      prescriptionParseError: 'Модуль разбора предписания не подключен.'
    });
    renderCalculatorUI(container);
    return;
  }

  if (!isPdfFile(file)) {
    setPrescriptionParseState({
      prescriptionReadStatus: 'skipped',
      prescriptionParseResult: null,
      prescriptionParseError: 'Автоматический разбор сейчас работает только для PDF-файлов.'
    });
    renderCalculatorUI(container);
    return;
  }

  setPrescriptionParseState({
    prescriptionReadStatus: 'reading',
    prescriptionParseResult: null,
    prescriptionParseError: ''
  });
  renderFreshCalculatorUI();

  try {
    const rawText = await readPdfText(file);
    const result = parsePrescriptionText(rawText, { sourceType: 'pdf' });
    window._lastPrescriptionParseResult = result;

    setPrescriptionParseState({
      prescriptionReadStatus: 'success',
      prescriptionParseResult: result,
      prescriptionParseError: ''
    });
  } catch (error) {
    setPrescriptionParseState({
      prescriptionReadStatus: 'error',
      prescriptionParseResult: null,
      prescriptionParseError: error && error.message ? error.message : 'Не удалось прочитать PDF.'
    });
  }

  renderFreshCalculatorUI();
}

function addCalculatorEventListeners(container) {
  const resultElement = container.querySelector('#calculator-result');

  initAccordionSections(container);
  addPrescriptionFileEventListeners(container);

  container.querySelectorAll('input[name="subject"]').forEach((input) => {
    input.addEventListener('change', () => {
      setSubject(input.value);
    });
  });

  container.querySelectorAll('input[name="objectType"]').forEach((input) => {
    input.addEventListener('change', () => {
      setObjectType(input.value);
    });
  });

  const prescriptionToggle = container.querySelector('[data-prescription-toggle]');
  const prescriptionCountQuestion = container.querySelector('[data-prescription-count-question]');

  if (prescriptionToggle && prescriptionCountQuestion) {
    prescriptionToggle.addEventListener('change', () => {
      const wasDocumentMode = hasUploadedPrescriptionFiles();

      setPrescription(prescriptionToggle.checked);

      if (!prescriptionToggle.checked) {
        prescriptionCountQuestion.querySelectorAll('input[name="prescriptionCount"]').forEach((input) => {
          input.checked = input.value === '1';
        });
      }

      if (wasDocumentMode !== hasUploadedPrescriptionFiles()) {
        renderCalculatorUI(container);
        return;
      }

      renderPrescriptionFilesUpload(container);
      setNestedQuestionOpen(prescriptionCountQuestion, prescriptionToggle.checked);
    });
  }

  container.querySelectorAll('input[name="prescriptionCount"]').forEach((input) => {
    input.addEventListener('change', () => {
      const wasDocumentMode = hasUploadedPrescriptionFiles();

      setPrescriptionCount(Number(input.value));

      if (wasDocumentMode !== hasUploadedPrescriptionFiles()) {
        renderCalculatorUI(container);
        return;
      }

      renderPrescriptionFilesUpload(container);
    });
  });

  container.querySelectorAll('[data-modifier-key]').forEach((input) => {
    input.addEventListener('change', () => {
      setModifier(input.dataset.modifierKey, input.checked);
    });
  });

  container.querySelectorAll('[data-violation-id]').forEach((input) => {
    input.addEventListener('change', () => {
      toggleViolation(input.dataset.violationId);
    });
  });

  container.querySelectorAll('[data-consequence-key]').forEach((input) => {
    input.addEventListener('change', () => {
      setConsequence(input.dataset.consequenceKey, input.checked);
    });
  });

  container.querySelector('[data-action="calculate"]').addEventListener('click', async () => {
    if (hasUploadedPrescriptionFiles()) {
      await analyzeUploadedPrescriptionPdf(container);
      return;
    }

    if (!hasRequiredFieldsForCalculation()) {
      resultElement.classList.add('calculator-result--validation');
      resultElement.innerHTML = renderRequiredFieldsPlaceholder();
      syncOpenAccordionHeights(container);
      return;
    }

    resultElement.classList.remove('calculator-result--validation');

    const result = calculatePenalty();
    const html = renderResultHTML(result);

    resultElement.innerHTML = html;
    initLeadFormHandlers();
    syncOpenAccordionHeights(container);
  });

  resultElement.addEventListener('click', (event) => {
    const link = event.target.closest('[data-result-scroll-target]');

    if (!link) {
      return;
    }

    scrollToAccordionSection(container, link.dataset.resultScrollTarget);
  });

  container.querySelector('[data-action="reset"]').addEventListener('click', () => {
    resetState();
    renderCalculatorUI(container);
  });
}

function renderCalculatorUI(container) {
  const isDocumentMode = hasUploadedPrescriptionFiles();

  container.innerHTML = `
    <div class="calculator">
      ${createSubjectSection()}
      ${createObjectTypeSection()}
      ${createModifiersSection()}
      ${isDocumentMode ? createDocumentModeNotice() : createViolationsSection()}
      ${isDocumentMode ? '' : createConsequencesSection()}
      ${createCalculatorControls()}
    </div>
  `;

  addCalculatorEventListeners(container);
}
