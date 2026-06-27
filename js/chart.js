/**
 * chart.js — Canvas-based mood trend line chart
 *
 * WHY a custom chart instead of a library:
 * Zero external dependencies = faster load, smaller bundle,
 * no CDN calls (critical if venue Wi-Fi fails), and more control
 * over accessibility (we draw our own ARIA descriptions).
 */

'use strict';

const MOOD_EMOJIS = ['', '😔', '😕', '😐', '🙂', '😊'];
const MOOD_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];

/**
 * drawMoodChart — renders a line chart on a <canvas> element.
 * @param {string} canvasId — DOM id of the canvas
 * @param {Array<{date: string, mood: number}>} data — mood history
 */
function drawMoodChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data.length) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Responsive width
  const container = canvas.parentElement;
  const w = container.clientWidth || 600;
  const h = 180;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 20, bottom: 36, left: 36 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  // Grid lines (1–5 mood scale)
  ctx.strokeStyle = '#E8E2DA';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = pad.top + chartH - ((i - 1) / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    // Y-axis labels
    ctx.fillStyle = '#9B968F';
    ctx.font = `${11 * dpr / dpr}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(MOOD_EMOJIS[i], pad.left - 6, y + 4);
  }

  if (data.length < 2) {
    // Single point — just draw a dot
    const x = pad.left + chartW / 2;
    const y = pad.top + chartH - ((data[0].mood - 1) / 4) * chartH;
    ctx.fillStyle = MOOD_COLORS[data[0].mood] || '#3B7A57';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Compute x positions
  const xStep = chartW / (data.length - 1);
  const points = data.map((d, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + chartH - ((d.mood - 1) / 4) * chartH,
    mood: d.mood,
    date: d.date,
  }));

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, 'rgba(59, 122, 87, 0.18)');
  grad.addColorStop(1, 'rgba(59, 122, 87, 0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    // Smooth curve using quadratic bezier
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
  }
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
  ctx.lineTo(points[0].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
  }
  ctx.strokeStyle = '#3B7A57';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Data points
  for (const pt of points) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = MOOD_COLORS[pt.mood] || '#3B7A57';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // X-axis date labels (show every other if many points)
  ctx.fillStyle = '#9B968F';
  ctx.font = `10px Inter, sans-serif`;
  ctx.textAlign = 'center';
  const step = data.length > 7 ? 2 : 1;
  for (let i = 0; i < points.length; i += step) {
    const d = data[i].date;
    const label = d ? d.slice(5) : ''; // MM-DD
    ctx.fillText(label, points[i].x, h - pad.bottom + 16);
  }

  // Accessible text description on the canvas element
  const moodList = data.map(d => `${d.date}: ${MOOD_EMOJIS[d.mood]}`).join(', ');
  canvas.setAttribute('aria-label', `Mood trend chart. ${data.length} entries: ${moodList}`);
}
