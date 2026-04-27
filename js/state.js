const initialState = {
  subjectId: null,
  hasPrescription: false,
  hasRepeat: false,
  specialFireRegime: false,
  violations: [],
  consequences: {
    damage: false,
    healthHarm: false,
    death: false
  }
};

let state = {
  ...initialState,
  violations: [...initialState.violations],
  consequences: { ...initialState.consequences }
};

// Обновляет состояние верхнего уровня.
function updateState(patch) {
  state = {
    ...state,
    ...patch
  };

  return state;
}

// Возвращает состояние к начальным значениям.
function resetState() {
  state = {
    ...initialState,
    violations: [...initialState.violations],
    consequences: { ...initialState.consequences }
  };

  return state;
}

// Добавляет или убирает нарушение из выбранных.
function toggleViolation(violationId) {
  const hasViolation = state.violations.includes(violationId);

  return updateState({
    violations: hasViolation
      ? state.violations.filter((id) => id !== violationId)
      : [...state.violations, violationId]
  });
}

// Меняет одно последствие пожара.
function setConsequence(key, value) {
  return updateState({
    consequences: {
      ...state.consequences,
      [key]: value
    }
  });
}

// Устанавливает тип проверяемого субъекта.
function setSubject(subjectId) {
  return updateState({ subjectId });
}

// Устанавливает дополнительные признаки расчета.
function setModifier(key, value) {
  return updateState({ [key]: value });
}
