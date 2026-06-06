import type { Store } from '../store';
import type { Session, State } from '../types';

function chart(sessions: Session[]): string {
  if (sessions.length < 2) return '<p class="empty">Read at least two sessions to see the chart.</p>';
  const w = 560;
  const h = 160;
  const pad = 24;
  const xs = sessions.map((s) => s.date);
  const ys = sessions.map((s) => s.wpm);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const px = (x: number) => pad + ((x - minX) / Math.max(maxX - minX, 1)) * (w - 2 * pad);
  const py = (y: number) => h - pad - ((y - minY) / Math.max(maxY - minY, 1)) * (h - 2 * pad);
  const points = sessions.map((s) => `${px(s.date).toFixed(1)},${py(s.wpm).toFixed(1)}`).join(' ');
  const dots = sessions
    .map((s) => `<circle cx="${px(s.date).toFixed(1)}" cy="${py(s.wpm).toFixed(1)}" r="3" fill="#1b365d"/>`)
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="stats-chart" role="img" aria-label="wpm over time">
    <text x="${pad}" y="14" class="axis">${maxY} wpm</text>
    <text x="${pad}" y="${h - 8}" class="axis">${minY} wpm</text>
    <polyline points="${points}" fill="none" stroke="#1b365d" stroke-width="2"/>
    ${dots}
  </svg>`;
}

export function mountStats(el: HTMLElement, store: Store<State>): void {
  function render(state: State): void {
    el.classList.toggle('open', state.overlay === 'stats');
    if (state.overlay !== 'stats') return;
    const recent = [...state.sessions].slice(-10).reverse();
    const rows = recent
      .map(
        (s) => `<tr>
          <td>${new Date(s.date).toLocaleDateString()}</td>
          <td>${s.words}</td>
          <td>${s.minutes.toFixed(1)}</td>
          <td><b>${s.wpm}</b></td>
        </tr>`,
      )
      .join('');
    el.innerHTML = `
      <div class="panel">
        <h2>Stats</h2>
        ${chart([...state.sessions].sort((a, b) => a.date - b.date))}
        <table class="stats-table">
          <thead><tr><th>Date</th><th>Words</th><th>Min</th><th>wpm</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty">No sessions yet</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  render(store.get());
  store.subscribe(render);
}
