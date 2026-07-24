const NotifUI = {
  notificaciones: [],
  intervalo: null,

  iniciarPolling() {
    this.actualizarBadge();
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = setInterval(() => this.actualizarBadge(), 20000);
  },

  async actualizarBadge() {
    try {
      const res = await API.getNotificacionesNoLeidas();
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      if (res.cantidad > 0) {
        badge.textContent = res.cantidad > 9 ? '9+' : res.cantidad;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { /* silencioso */ }
  },

  async toggle() {
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    if (!dd.classList.contains('hidden')) {
      dd.classList.add('hidden');
      return;
    }
    dd.classList.remove('hidden');
    dd.innerHTML = '<p style="padding:16px;color:var(--text-muted);font-size:13px;">Cargando...</p>';
    try {
      this.notificaciones = await API.getNotificaciones();
      dd.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--glass-border);">
          <strong style="font-size:13px;">Notificaciones</strong>
          <button style="background:none;border:none;color:var(--info);font-size:12px;cursor:pointer;" onclick="NotifUI.marcarTodas()">Marcar todas leídas</button>
        </div>
        ${this.notificaciones.length ? this.notificaciones.map(n => `
          <div style="padding:10px 14px;border-bottom:1px solid var(--glass-border);background:${n.leida ? 'transparent' : 'rgba(255,122,26,0.06)'};cursor:pointer;" onclick="NotifUI.marcarLeida('${n._id}')">
            <div style="font-size:13px;font-weight:600;">${n.titulo}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${n.mensaje}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${new Date(n.fecha).toLocaleString('es-CL')}</div>
          </div>
        `).join('') : '<p style="padding:16px;color:var(--text-muted);font-size:13px;">No tenés notificaciones.</p>'}
      `;
      await this.actualizarBadge();
    } catch (e) {
      dd.innerHTML = '<p style="padding:16px;color:var(--danger);font-size:13px;">Error al cargar</p>';
    }
  },

  async marcarLeida(id) {
    try { await API.marcarNotificacionLeida(id); await this.actualizarBadge(); } catch (e) {}
  },

  async marcarTodas() {
    try {
      await API.marcarTodasLeidas();
      await this.toggle();
      await this.toggle();
    } catch (e) {}
  }
};

document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const bell = document.getElementById('notif-bell');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && !bell.contains(e.target)) {
    dd.classList.add('hidden');
  }
});
