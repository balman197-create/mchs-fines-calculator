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

// Складывает несколько диапазонов штрафов.
function sumFineRanges(ranges) {
  return ranges.reduce((total, range) => {
    if (!range) {
      return total;
    }

    return {
      min: total.min + range.min,
      max: total.max + range.max
    };
  }, { min: 0, max: 0 });
}

// Рассчитывает основной блок по выбранным нарушениям пожарной безопасности.
function calculateMainViolationsBlock() {
  const selectedViolations = getSelectedViolationObjects();
  const scenarioKey = getBaseScenarioKey();
  const scenario = BASE_FINE_MATRIX[scenarioKey];

  const items = selectedViolations.map((violation) => {
    const fineRange = getFineRangeBySubject(scenario, state.subjectId);

    return {
      id: violation.id,
      label: violation.label,
      article: violation.article,
      description: violation.description,
      groupLabel: violation.groupLabel,
      scenarioKey,
      scenarioArticle: scenario.article,
      scenarioLabel: scenario.label,
      fineRange
    };
  });

  return {
    scenarioKey,
    scenario,
    items,
    totalRange: sumFineRanges(items.map((item) => item.fineRange))
  };
}

// Рассчитывает блок по неисполнению предписания, если он выбран.
function calculatePrescriptionBlock() {
  if (state.hasPrescription !== true) {
    return null;
  }

  const matrixEntry = state.hasRepeat === true
    ? PRESCRIPTION_FINE_MATRIX['19.5_part14']
    : PRESCRIPTION_FINE_MATRIX['19.5_part12'];

  return {
    article: matrixEntry.article,
    label: matrixEntry.label,
    fineRange: getFineRangeBySubject(matrixEntry, state.subjectId)
  };
}

// Информационный блок о возможной уголовной ответственности.
function getCriminalRiskBlock() {
  if (state.consequences.death === true || state.consequences.healthHarm === true) {
    return {
      article: CRIMINAL_INFO.article,
      title: CRIMINAL_INFO.title,
      description: CRIMINAL_INFO.description
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
      hasRepeat: state.hasRepeat,
      specialFireRegime: state.specialFireRegime
    },
    consequences: { ...state.consequences }
  };
}
