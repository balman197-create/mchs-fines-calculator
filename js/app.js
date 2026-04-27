function initApp() {
  const rootElement = document.getElementById('mchs-calculator-root');

  if (!rootElement) {
    return;
  }

  renderCalculatorUI(rootElement);
}

document.addEventListener('DOMContentLoaded', initApp);
