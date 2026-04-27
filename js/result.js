// Экранирует текст перед вставкой в HTML.
function escapeResultHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderFineRange(range) {
  if (!range) {
    return '<p class="result-note">Для выбранного типа ответственности в упрощенной модели диапазон не определен.</p>';
  }

  return `
    <p class="result-summary">
      Предварительный диапазон: от ${formatMoney(range.min)} до ${formatMoney(range.max)}
    </p>
  `;
}

function renderViolationItems(items) {
  if (!items.length) {
    return '';
  }

  const itemsHtml = items.map((item) => `
    <article class="result-violation-item">
      <h3>${escapeResultHtml(item.label)}</h3>
      <p class="result-meta">Группа: ${escapeResultHtml(item.groupLabel)}</p>
      <p>${escapeResultHtml(item.description)}</p>
      <p class="result-meta">Квалификация для расчета: ${escapeResultHtml(item.scenarioLabel)}</p>
      <p class="result-meta">Норма: ${escapeResultHtml(item.scenarioArticle)}</p>
      ${renderFineRange(item.fineRange)}
    </article>
  `).join('');

  return `
    <div class="result-violation-list">
      ${itemsHtml}
    </div>
  `;
}

function renderMainBlock(result) {
  const items = result.mainBlock.items;

  if (!items.length) {
    return `
      <section class="result-section">
        <h2 class="result-section-title">По выбранным нарушениям</h2>
        <p class="result-note">Вы не выбрали конкретные нарушения. Чтобы получить расчет, отметьте хотя бы одно нарушение.</p>
      </section>
    `;
  }

  const totalRange = result.mainBlock.totalRange;

  return `
    <section class="result-section">
      <h2 class="result-section-title">По выбранным нарушениям</h2>
      <p class="result-summary">
        По выбранным нарушениям ваш предварительный диапазон административной ответственности составляет
        от ${formatMoney(totalRange.min)} до ${formatMoney(totalRange.max)}.
      </p>
      ${renderViolationItems(items)}
    </section>
  `;
}

function renderPrescriptionBlock(result) {
  const block = result.prescriptionBlock;

  if (!block) {
    return '';
  }

  return `
    <section class="result-section result-note">
      <h2 class="result-section-title">Дополнительный риск по предписанию</h2>
      <p>
        Если нарушения из предписания не устранены в установленный срок, помимо ответственности за сами нарушения
        возможна дополнительная административная ответственность.
      </p>
      <p class="result-meta">Статья: ${escapeResultHtml(block.article)}</p>
      <p class="result-meta">Квалификация: ${escapeResultHtml(block.label)}</p>
      ${renderFineRange(block.fineRange)}
    </section>
  `;
}

function renderRepeatBlock(result) {
  if (result.modifiers.hasRepeat !== true) {
    return '';
  }

  return `
    <section class="result-section result-note">
      <h2 class="result-section-title">Если нарушения не устранить до новой проверки</h2>
      <p>
        При повторном неисполнении предписания риск административной ответственности возрастает.
        На практике квалификация зависит от содержания предписания, сроков его исполнения и результатов повторной проверки.
      </p>
    </section>
  `;
}

function renderCriminalBlock(result) {
  const block = result.criminalBlock;

  if (!block) {
    return '';
  }

  return `
    <section class="result-section result-warning">
      <h2 class="result-section-title">Возможна уголовная ответственность</h2>
      <p class="result-meta">Статья: ${escapeResultHtml(block.article)}</p>
      <p><strong>${escapeResultHtml(block.title)}</strong></p>
      <p>${escapeResultHtml(block.description)}</p>
      <p>Этот блок носит информационный характер и не заменяет правовой анализ конкретной ситуации.</p>
    </section>
  `;
}

function renderCtaBlock() {
  return `
    <section class="result-section result-cta">
      <h2 class="result-section-title">Что делать дальше</h2>
      <ul>
        <li>Провести аудит нарушений и подтвердить их состав</li>
        <li>Проверить сроки и содержание предписания</li>
        <li>Подготовить план устранения нарушений до повторной проверки</li>
      </ul>
      <p>
        Если вам нужен разбор предписания, пожарный аудит или помощь в подготовке к проверке,
        этот расчет можно использовать как отправную точку для консультации.
        Для сложных объектов и случаев с повышенным риском можно дополнительно рассмотреть расчет
        пожарного риска по методике, утвержденной приказом МЧС России № 1140.
      </p>
    </section>
  `;
}

function renderLeadFormBlock() {
  return `
    <section class="result-section result-lead-form">
      <div class="lead-form-layout">
        <div class="lead-form-info">
          <h3 class="lead-form-title">Нужен разбор предписания или аудит?</h3>
          <p class="lead-form-text">
            Оставьте контакты — специалист по пожарной безопасности свяжется с вами, чтобы обсудить результаты расчета,
            разбор предписания и варианты снижения рисков.
          </p>
          <ul class="lead-form-benefits">
            <li>Разбор предписаний МЧС по пунктам</li>
            <li>Ориентировочная оценка рисков и штрафов</li>
            <li>Рекомендации по устранению нарушений до повторной проверки</li>
          </ul>
        </div>

        <form class="lead-form" novalidate>
          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-name">Как к вам обращаться *</label>
            <input class="lead-form-input" id="lead-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-phone">Телефон для связи *</label>
            <input class="lead-form-input" id="lead-phone" name="phone" type="tel" autocomplete="tel" required>
          </div>
          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-email">Email <span class="result-meta">(необязательно)</span></label>
            <input class="lead-form-input" id="lead-email" name="email" type="email" autocomplete="email">
          </div>
          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-comment">Комментарий</label>
            <textarea
              class="lead-form-textarea"
              id="lead-comment"
              name="comment"
              rows="4"
              placeholder="Например: номер предписания, краткое описание ситуации"
            ></textarea>
          </div>
          <button class="lead-form-button" type="submit">Получить консультацию по результатам расчета</button>
        </form>
      </div>
      <div class="lead-form-message" aria-live="polite"></div>
    </section>
  `;
}

// Вешает обработчик на форму после вставки результата в DOM.
function initLeadFormHandlers() {
  const resultElement = document.getElementById('calculator-result');

  if (!resultElement) {
    return;
  }

  const form = resultElement.querySelector('.lead-form');

  if (!form) {
    return;
  }

  const messageElement = resultElement.querySelector('.lead-form-message');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameInput = form.querySelector('[name="name"]');
    const phoneInput = form.querySelector('[name="phone"]');
    const hasName = nameInput.value.trim().length > 0;
    const hasPhone = phoneInput.value.trim().length > 0;

    if (!hasName || !hasPhone) {
      messageElement.textContent = 'Заполните имя и телефон, чтобы мы могли связаться с вами.';
      messageElement.style.color = '#b91c1c';
      return;
    }

    form.reset();
    messageElement.textContent = 'Спасибо! Мы получили вашу заявку и свяжемся с вами по указанным контактам.';
    messageElement.style.color = '#059669';
  });
}

function renderNormativeBlock() {
  return `
    <section class="result-section result-normative">
      <h2 class="result-section-title">Нормативная основа</h2>
      <ul>
        <li>
          Основные требования пожарной безопасности к зданиям, путям эвакуации, системам сигнализации
          и средствам пожаротушения установлены Федеральным законом № 123-ФЗ
          "Технический регламент о требованиях пожарной безопасности".
        </li>
        <li>
          Расчет административной ответственности в данном калькуляторе выполняется по нормам КоАП РФ
          (в первую очередь ст. 20.4 и 19.5), с упрощением для предварительной оценки диапазона штрафов.
        </li>
        <li>
          При причинении тяжкого вреда здоровью или гибели людей возможно привлечение к уголовной
          ответственности по ст. 219 УК РФ. Окончательная квалификация дается только по итогам
          расследования и решения суда.
        </li>
        <li>
          Для объектов с повышенным уровнем риска расчет пожарного риска может проводиться по методике,
          утвержденной приказом МЧС России № 1140. Это отдельная экспертная процедура и не входит
          в данный упрощенный расчет.
        </li>
      </ul>
    </section>
  `;
}

function renderDisclaimer() {
  return `
    <p class="result-disclaimer">
      Расчет носит предварительный информационный характер и не является юридическим заключением.
      Фактический размер ответственности определяется по итогам проверки, квалификации нарушения
      и иным обстоятельствам дела.
    </p>
  `;
}

function renderResultHTML(result) {
  return `
    <div class="result-panel">
      <h2 class="result-title">Предварительный результат</h2>
      <p class="result-intro">
        Ниже приведена предварительная оценка административной ответственности по выбранным нарушениям.
        Итоговая квалификация и размер санкций зависят от результатов проверки и обстоятельств дела.
      </p>
      ${renderMainBlock(result)}
      ${renderPrescriptionBlock(result)}
      ${renderRepeatBlock(result)}
      ${renderCriminalBlock(result)}
      ${renderCtaBlock()}
      ${renderLeadFormBlock()}
      ${renderNormativeBlock()}
      ${renderDisclaimer()}
    </div>
  `;
}
