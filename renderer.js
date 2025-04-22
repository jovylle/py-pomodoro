let mode = '';
let timer = null;
let duration = 0;
let startTime = null;
let focusCount = 0;
let breakCount = 0;
const blocks = 10;

function start (selectedMode) {
  mode = selectedMode;
  duration = mode === 'focus' ? 15 : 5;
  startTime = Date.now();
  document.getElementById('mode').textContent = `Mode: ${mode}`;
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
}

function stop () {
  if (timer) clearInterval(timer);
  document.getElementById('timer').textContent = '0s';
  document.getElementById('progress').textContent = '○'.repeat(blocks);
  document.getElementById('mode').textContent = 'Mode: -';
}

function tick () {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, duration - elapsed);
  document.getElementById('timer').textContent = `${remaining}s`;

  const progress = Math.floor((elapsed / duration) * blocks);
  document.getElementById('progress').textContent = '●'.repeat(progress) + '○'.repeat(blocks - progress);

  if (remaining === 0) {
    clearInterval(timer);
    document.getElementById('sound').play();
    if (mode === 'focus') focusCount++;
    else breakCount++;
    document.getElementById('counts').textContent = `Focus: ${focusCount} | Breaks: ${breakCount}`;
    document.getElementById('mode').textContent = `${mode.toUpperCase()} DONE!`;
  }
}
