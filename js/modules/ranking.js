async function renderRanking() {
  let top = [];
  try {
    top = await API.getTopRicos(10);
  } catch (e) {
    return `<div class="card">${App.showAlert(e.message || 'No se pudo cargar el ranking', 'danger')}</div>`;
  }

  const medallas = ['🥇', '🥈', '🥉'];

  return `
    <div class="card">
      <div class="card-header"><h4 style="margin:0;"><i class="fas fa-trophy"></i> Top 10 — Más plata en el servidor</h4></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
        ${top.map((u, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:18px;width:28px;text-align:center;">${medallas[i] || (i + 1) + '°'}</span>
              ${u.robloxAvatar
                ? `<img src="${u.robloxAvatar}" alt="Avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);">`
                : `<i class="fas fa-user-circle" style="font-size:40px;color:var(--text-muted);"></i>`}
              <div>
                <strong>${u.nombre}</strong>
                <div style="font-size:12px;color:var(--text-muted);">${u.rango || ''}</div>
              </div>
            </div>
            <span style="color:var(--success);font-weight:700;">$${(u.dinero || 0).toLocaleString()}</span>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">Todavía no hay datos.</p>'}
      </div>
    </div>
  `;
}