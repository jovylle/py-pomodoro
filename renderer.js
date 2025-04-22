const { ipcRenderer } = require('electron');

// Listen for timer updates from the main process
ipcRenderer.on('timer-update', (event, { elapsedTime, timerState, focusCount, breakCount }) => {
  const timerElement = document.getElementById('timer');
  const stateElement = document.getElementById('mode');
  const countsElement = document.getElementById('counts');

  if (timerElement) {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerElement.textContent = `${minutes}m ${seconds}s`;
  }

  if (stateElement) {
    stateElement.textContent = `Mode: ${timerState}`;
  }

  if (countsElement) {
    countsElement.textContent = `Focus: ${focusCount} | Breaks: ${breakCount}`;
  }
});