// Форматирует сумму в привычный вид: 150 000 ₽.
function formatMoney(amount) {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

// Возвращает полные объекты выбранных нарушений.
function getSelectedViolationObjects() {
  return VIOLATION_GROUPS.flatMap((group) => (
    group.violations
      .filter((violation) => state.violations.includes(violation.id))
      .map((violation) => ({
        id: violation.id,
        label: violation.label,
        article: violation.article,
        articlePart: violation.articlePart || null,
        description: violation.description,
        groupLabel: group.label
      }))
  ));
}

// Определяет базовый сценарий по последствиям и особому режиму.
function getBaseScenarioKey() {
  if (state.consequences.death === true) {
    return '20.4_part6_1';
  }

  if (state.consequences.healthHarm === true || state.consequences.damage === true) {
    return '20.4_part6';
  }

  if (state.specialFireRegime === true) {
    return '20.4_part2';
  }

  return '20.4_part1';
}

// Берет диапазон штрафа для выбранного субъекта.
function getFineRangeBySubject(matrixEntry, subjectId) {
  if (!matrixEntry || !subjectId) {
    return null;
  }

  return matrixEntry.fines[subjectId] || null;
}

function getScenarioKeyForViolation(violation, fallbackScenarioKey) {
  return violation.articlePart && BASE_FINE_MATRIX[violation.articlePart]
    ? violation.articlePart
    : fallbackScenarioKey;
}

function sumFineRanges(ranges) {
  const validRanges = ranges.filter(Boolean);

  if (!validRanges.length) {
    return null;
  }

  return validRanges.reduce((total, range) => ({
    min: total.min + range.min,
    max: total.max + range.max
  }), { min: 0, max: 0 });
}

// Рассчитывает основной блок по выбранным нарушениям пожарной безопасности.
function calculateMainViolationsBlock() {
  const selectedViolations = getSelectedViolationObjects();
  const scenarioKey = getBaseScenarioKey();
  const scenario = BASE_FINE_MATRIX[scenarioKey];

  const items = selectedViolations.map((violation) => {
    const itemScenarioKey = getScenarioKeyForViolation(violation, scenarioKey);
    const itemScenario = BASE_FINE_MATRIX[itemScenarioKey] || scenario;
    const fineRange = getFineRangeBySubject(itemScenario, state.subjectId);

    return {
      id: violation.id,
      label: violation.label,
      article: violation.article,
      articlePart: itemScenarioKey,
      description: violation.description,
      groupLabel: violation.groupLabel,
      scenarioKey: itemScenarioKey,
      scenarioArticle: itemScenario.article,
      scenarioLabel: itemScenario.label,
      fineRange
    };
  });
  const uniqueArticleParts = [...new Set(items.map((item) => item.articlePart))];
  const finePerPart = uniqueArticleParts.map((articlePart) => {
    const group = items.filter((item) => item.articlePart === articlePart);

    return group[0] ? group[0].fineRange : null;
  });

  // Количество предписаний (разных проверок) — умножаем итоговый штраф
  const prescriptionCount = (state.hasPrescription === true && Number(state.prescriptionCount) > 1)
    ? Number(state.prescriptionCount)
    : 1;
  const finePerInspection = sumFineRanges(finePerPart);

  const totalRange = finePerInspection
    ? {
      min: finePerInspection.min * prescriptionCount,
      max: finePerInspection.max * prescriptionCount
    }
    : null;

  return {
    scenarioKey,
    scenario,
    items,
    totalRange,
    note: prescriptionCount > 1
      ? 'Основание: ч. 5 ст. 4.4 КоАП РФ — нарушения по одной части статьи в рамках одной проверки наказываются однократно; при двух проверках штраф назначается отдельно по каждой'
      : 'Основание: ч. 5 ст. 4.4 КоАП РФ — нарушения, квалифицированные по одной части статьи в рамках одной проверки, образуют одно производство и наказываются однократно'
  };
}

// Рассчитывает блок по неисполнению предписания, если он выбран.
function calculatePrescriptionBlock() {
  if (state.hasPrescription !== true) {
    return null;
  }

  if (state.consequences.death === true) {
    return {
      type: 'death_override',
      message: 'В связи с гибелью человека дело приобретает признаки уголовного преступления. Административное производство по предписанию в данном случае не применяется — возможна только уголовная ответственность по ч. 2–3 ст. 219 УК РФ (до 7 лет лишения свободы).'
    };
  }

  const matrixEntry = state.hasRepeat === true
    ? PRESCRIPTION_FINE_MATRIX['19.5_part14']
    : PRESCRIPTION_FINE_MATRIX['19.5_part12'];

  return {
    type: 'fine',
    article: matrixEntry.article,
    label: matrixEntry.label,
    fineRange: getFineRangeBySubject(matrixEntry, state.subjectId)
  };
}

// Информационный блок о возможной уголовной ответственности.
function getCriminalRiskBlock() {
  if (state.consequences.death === true) {
    return {
      article: CRIMINAL_INFO.parts.death.part,
      basis: CRIMINAL_INFO.parts.death.basis,
      punishment: CRIMINAL_INFO.parts.death.punishment,
      disclaimer: CRIMINAL_INFO.disclaimer
    };
  }

  if (state.consequences.healthHarm === true) {
    return {
      article: CRIMINAL_INFO.parts.healthHarm.part,
      basis: CRIMINAL_INFO.parts.healthHarm.basis,
      punishment: CRIMINAL_INFO.parts.healthHarm.punishment,
      disclaimer: CRIMINAL_INFO.disclaimer
    };
  }

  return null;
}

// Главная функция расчета предварительного результата.
function calculatePenalty() {
  const mainBlock = calculateMainViolationsBlock();
  const prescriptionBlock = calculatePrescriptionBlock();
  const criminalBlock = getCriminalRiskBlock();

  return {
    subjectId: state.subjectId,
    selectedViolations: getSelectedViolationObjects(),
    mainBlock,
    prescriptionBlock,
    criminalBlock,
    modifiers: {
      hasPrescription: state.hasPrescription,
      prescriptionCount: state.hasPrescription ? state.prescriptionCount : 1,
      singleInspection: state.hasPrescription ? state.singleInspection : null,
      hasRepeat: state.hasRepeat,
      specialFireRegime: state.specialFireRegime
    },
    consequences: { ...state.consequences }
  };
}
