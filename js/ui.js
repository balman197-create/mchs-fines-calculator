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

  return `
    <section class="calculator-section">
      <h2 class="calculator-section-title">Кто несет ответственность?</h2>
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    </section>
  `;
}

function createModifiersSection() {
  const modifiers = [
    {
      key: 'hasPrescription',
      label: 'Есть предписание'
    },
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

  return `
    <section class="calculator-section">
      <h2 class="calculator-section-title">Дополнительные условия</h2>
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    </section>
  `;
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

  return `
    <section class="calculator-section">
      <h2 class="calculator-section-title">Какие нарушения выявлены?</h2>
      ${groupsHtml}
    </section>
  `;
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

  return `
    <section class="calculator-section">
      <h2 class="calculator-section-title">Есть ли последствия?</h2>
      <div class="calculator-options">
        ${optionsHtml}
      </div>
    </section>
  `;
}

function createActionsSection() {
  return `
    <section class="calculator-section">
      <h2 class="calculator-section-title">Действия</h2>
      <div class="calculator-actions">
        <button class="calculator-button" type="button" data-action="calculate">Рассчитать</button>
        <button class="calculator-button calculator-button--secondary" type="button" data-action="reset">Сбросить</button>
      </div>
      <div id="calculator-result" class="calculator-result"></div>
    </section>
  `;
}

function addCalculatorEventListeners(container) {
  const resultElement = container.querySelector('#calculator-result');

  container.querySelectorAll('input[name="subject"]').forEach((input) => {
    input.addEventListener('change', () => {
      setSubject(input.value);
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

  container.querySelector('[data-action="calculate"]').addEventListener('click', () => {
    const result = calculatePenalty();
    const html = renderResultHTML(result);

    resultElement.innerHTML = html;
    initLeadFormHandlers();
  });

  container.querySelector('[data-action="reset"]').addEventListener('click', () => {
    resetState();
    renderCalculatorUI(container);
  });
}

function renderCalculatorUI(container) {
  container.innerHTML = `
    <div class="calculator">
      ${createSubjectSection()}
      ${createModifiersSection()}
      ${createViolationsSection()}
      ${createConsequencesSection()}
      ${createActionsSection()}
    </div>
  `;

  addCalculatorEventListeners(container);
}
