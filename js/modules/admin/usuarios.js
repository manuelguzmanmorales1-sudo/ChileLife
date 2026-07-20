const UsuariosUI = {
  usuarios: [],
  filtro: '',

  async render() {
    try {
      this.usuarios = await API.getUsers();
    } catch (e) {
      return `<div class="card">${App.showAlert(e.message || 'No se pudo cargar la lista de usuarios', 'danger')}</div>`;
    }
    return `
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h4 style="margin:0;">Usuarios (${this.usuarios.length})</h4>
          <input class="form-control" style="max-width:260px;" placeholder="Buscar por nombre o RUT..." oninput="UsuariosUI.filtrar(this.value)">
        </div>
        <div id="usuarios-result"></div>
        <div id="usuarios-lista">${this.renderLista()}</div>
      </div>
    `;
  },

  renderLista() {
    const roles = [
      { value: 'ciudadano', label: 'Ciudadano' },
      { value: 'carabinero', label: 'Carabinero' },
      { value: 'pdi', label: 'PDI' },
      { value: 'municipal', label: 'Seguridad Providencia' },
      { value: 'admin', label: 'Staff / Admin' }
    ];
    const filtro = this.filtro.toLowerCase();
    const lista = this.usuarios.filter(u =>
      !filtro || (u.nombre || '').toLowerCase().includes(filtro) || (u.rut || '').toLowerCase().includes(filtro)
    );
    if (lista.length === 0) return '<p style="color:var(--text-muted);padding:12px 0;">Sin resultados</p>';

    return `
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
        ${lista.map(u => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:10px 14px;flex-wrap:wrap;gap:10px;">
            <div>
              <strong>${u.nombre}</strong>
              <div style="font-size:12px;color:var(--text-muted);">${u.rut || 'sin RUT'} ${u.discordUsername ? '· @' + u.discordUsername : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <select class="form-control" style="width:auto;" id="rol-select-${u._id}">
                ${roles.map(r => `<option value="${r.value}" ${u.rol === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
              </select>
              <button class="btn btn-sm btn-primary" onclick="UsuariosUI.guardarRol('${u._id}')"><i class="fas fa-check"></i> Guardar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  filtrar(valor) {
    this.filtro = valor;
    document.getElementById('usuarios-lista').innerHTML = this.renderLista();
  },

  async guardarRol(userId) {
    const rol = document.getElementById(`rol-select-${userId}`).value;
    const result = document.getElementById('usuarios-result');
    try {
      await API.updateUserRol(userId, rol);
      const u = this.usuarios.find(x => x._id === userId);
      if (u) u.rol = rol;
      if (result) result.innerHTML = App.showAlert('Rol actualizado', 'success');
    } catch (e) {
      if (result) result.innerHTML = App.showAlert(e.message || 'No se pudo actualizar el rol', 'danger');
    }
  }
};

async function renderGestionUsuarios() {
  return await UsuariosUI.render();
}
