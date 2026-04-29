const initialState = {
  subjectId: null,
  // null безопаснее для UX: пользователь явно выбирает тип объекта, а не получает скрытую подстановку "обычного" объекта.
  objectTypeId: null,
  hasPrescription: false,
  prescriptionCount: 1,
  prescriptionFiles: [],
  prescriptionReadStatus: 'idle',
  prescriptionParseResult: null,
  prescriptionParseError: '',
  singleInspection: null,
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
  prescriptionFiles: [...initialState.prescriptionFiles],
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
    prescriptionFiles: [...initialState.prescriptionFiles],
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

// Устанавливает тип объекта, на котором проводилась проверка МЧС.
function setObjectType(objectTypeId) {
  return updateState({ objectTypeId });
}

// Устанавливает дополнительные признаки расчета.
function setModifier(key, value) {
  return updateState({ [key]: value });
}

// Устанавливает количество предписаний и очищает файлы сверх выбранного количества.
function setPrescriptionCount(prescriptionCount) {
  return updateState({
    prescriptionCount,
    prescriptionFiles: state.prescriptionFiles.slice(0, prescriptionCount),
    prescriptionReadStatus: 'idle',
    prescriptionParseResult: null,
    prescriptionParseError: ''
  });
}

// Сохраняет выбранный файл предписания без чтения его содержимого.
function setPrescriptionFile(index, file) {
  const prescriptionFiles = [...state.prescriptionFiles];
  prescriptionFiles[index] = file;

  return updateState({
    prescriptionFiles,
    prescriptionReadStatus: 'idle',
    prescriptionParseResult: null,
    prescriptionParseError: ''
  });
}

// Удаляет файл одного предписания, не затрагивая остальные выбранные файлы.
function removePrescriptionFile(index) {
  return setPrescriptionFile(index, null);
}

// Режим документа включается, если загружен хотя бы один файл предписания.
function hasUploadedPrescriptionFiles() {
  return state.prescriptionFiles.some(Boolean);
}

// Сохраняет технический результат чернового анализа загруженного PDF.
function setPrescriptionParseState(patch) {
  return updateState({
    prescriptionReadStatus: patch.prescriptionReadStatus || state.prescriptionReadStatus,
    prescriptionParseResult: Object.prototype.hasOwnProperty.call(patch, 'prescriptionParseResult')
      ? patch.prescriptionParseResult
      : state.prescriptionParseResult,
    prescriptionParseError: Object.prototype.hasOwnProperty.call(patch, 'prescriptionParseError')
      ? patch.prescriptionParseError
      : state.prescriptionParseError
  });
}

// Устанавливает, связаны ли нарушения с одной проверкой МЧС.
function setSingleInspection(value) {
  return updateState({ singleInspection: value });
}

// Включает или выключает учет предписания и сбрасывает вложенный ответ при выключении.
function setPrescription(value) {
  return updateState({
    hasPrescription: value,
    prescriptionCount: value ? state.prescriptionCount : 1,
    prescriptionFiles: value ? state.prescriptionFiles.slice(0, state.prescriptionCount) : [],
    prescriptionReadStatus: 'idle',
    prescriptionParseResult: null,
    prescriptionParseError: '',
    singleInspection: value ? state.singleInspection : null
  });
}
