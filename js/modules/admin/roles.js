const RolesUI = {
  data: [],
  modulos: [],
  busqueda: '',
  categoria: '',

  async cargar() {
    try {
      this.modulos = await API.getModulosDisponibles();
    } catch (err) {
      this.modulos = [];
    }
    await this.recargarLista();
  },

  async recargarLista() {
    try {
      const params = {};
      if (this.busqueda) params.search = this.busqueda;
      if (this.categoria) params.categoria = this.categoria;
      this.data = await API.getRoles(params);
    } catch (err) {
      console.error('[Roles] Error cargando:', err.message);
      this.data = [];
    }
  },

  aplicarFiltros() {
    this.busqueda = document.getElementById('roles-buscar').value;
    this.categoria = document.getElementById('roles-categoria').value;
    this.recargarLista().then(() => this.render());
  },

  async sincronizar() {
    const btn = document.getElementById('roles-sync-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...'; }
    try {
      const res = await API.sincronizarRolesDiscord();
      alert(`Sincronizado: ${res.creados} rol(es) nuevo(s), ${res.actualizados} actualizado(s) de ${res.total} roles del servidor.`);
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert('Error al sincronizar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar desde Discord'; }
    }
  },

  render() {
    const categorias = [...new Set(this.data.map(r => r.categoria).filter(Boolean))];
    const catSelect = document.getElementById('roles-categoria');
    if (catSelect) {
      const actual = catSelect.value;
      catSelect.innerHTML = `<option value="">Todas las categorías</option>` +
        categorias.map(c => `<option value="${c}" ${c === actual ? 'selected' : ''}>${c}</option>`).join('');
    }

    const cont = document.getElementById('roles-tabla-body');
    if (!cont) return;

    if (!this.data.length) {
      cont.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No hay roles configurados. Probá sincronizar desde Discord.</td></tr>`;
      return;
    }

    cont.innerHTML = this.data.map(r => `
      <tr>
        <td>
          <span style="display:inline-flex;align-items:center;gap:8px;">
            <span style="width:12px;height:12px;border-radius:50%;background:${r.color};display:inline-block;"></span>
            <strong>${r.nombre}</strong>
          </span>
          <div style="font-size:11px;color:var(--text-muted);">${r.discordRoleId}</div>
        </td>
        <td>${r.descripcion || '<span class="text-muted">—</span>'}</td>
        <td>${(r.modulos || []).length ? `<span class="badge badge-info">${r.modulos.length} módulo(s)</span>` : '<span class="text-muted">Sin módulos</span>'}</td>
        <td>${this.resumenPermisos(r.permisos)}</td>
        <td style="text-align:center;">${r.prioridad}</td>
        <td style="text-align:center;">
          <span class="badge badge-${r.activo ? 'success' : 'secondary'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
        </td>
        <td style="text-align:center;">
          <span class="badge badge-info">${r.cantidadUsuarios} usuario(s)</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-outline" onclick="RolesUI.editar('${r._id}')"><i class="fas fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="RolesUI.eliminar('${r._id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  resumenPermisos(permisos) {
    if (!permisos) return '<span class="text-muted">—</span>';
    const activos = Object.entries(permisos).filter(([, v]) => v).map(([k]) => k);
    if (!activos.length) return '<span class="text-muted">Ninguno</span>';
    return activos.map(p => `<span class="badge badge-secondary" style="margin-right:2px;">${p}</span>`).join('');
  },

  editar(id) {
    const r = this.data.find(x => x._id === id);
    if (!r) return;
    this.abrirFormulario(r);
  },

  abrirFormulario(r) {
    const permisos = r.permisos || { crear: false, editar: false, eliminar: false, consultar: true, administrar: false };
    const modulosSeleccionados = r.modulos || [];

    App.showModal(`Configurar rol: ${r.nombre}`, `
      <form onsubmit="event.preventDefault(); RolesUI.guardar('${r._id}')">
        <div class="form-row">
          <div class="form-group"><label>Nombre del rol</label><input class="form-control" id="rol-nombre" value="${r.nombre}" disabled></div>
          <div class="form-group"><label>ID de Discord</label><input class="form-control" value="${r.discordRoleId}" disabled></div>
        </div>
        <div class="form-group"><label>Descripción</label><input class="form-control" id="rol-descripcion" value="${r.descripcion || ''}" placeholder="Para qué sirve este rol"></div>
        <div class="form-row">
          <div class="form-group"><label>Categoría</label><input class="form-control" id="rol-categoria" value="${r.categoria || ''}" placeholder="Ej: Staff, Facción, VIP"></div>
          <div class="form-group"><label>Prioridad</label><input class="form-control" id="rol-prioridad" type="number" value="${r.prioridad || 0}"></div>
        </div>

        <div class="form-group">
          <label>Módulos permitidos</label>
          <div style="max-height:180px;overflow-y:auto;background:var(--bg-input);border-radius:var(--radius);padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${this.modulos.map(m => `
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:400;margin:0;">
                <input type="checkbox" class="rol-modulo-check" value="${m.key}" ${modulosSeleccionados.includes(m.key) ? 'checked' : ''}>
                ${m.label}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Permisos específicos</label>
          <div style="display:flex;gap:14px;flex-wrap:wrap;background:var(--bg-input);border-radius:var(--radius);padding:10px;">
            ${['crear', 'editar', 'eliminar', 'consultar', 'administrar'].map(p => `
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:400;margin:0;">
                <input type="checkbox" id="rol-permiso-${p}" ${permisos[p] ? 'checked' : ''}> ${p}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="rol-activo" ${r.activo ? 'checked' : ''}> <label style="margin:0;">Enlace activo</label>
        </div>

        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  async guardar(id) {
    const modulos = [...document.querySelectorAll('.rol-modulo-check:checked')].map(el => el.value);
    const permisos = {
      crear: document.getElementById('rol-permiso-crear').checked,
      editar: document.getElementById('rol-permiso-editar').checked,
      eliminar: document.getElementById('rol-permiso-eliminar').checked,
      consultar: document.getElementById('rol-permiso-consultar').checked,
      administrar: document.getElementById('rol-permiso-administrar').checked
    };
    const data = {
      descripcion: document.getElementById('rol-descripcion').value.trim(),
      categoria: document.getElementById('rol-categoria').value.trim(),
      prioridad: parseInt(document.getElementById('rol-prioridad').value) || 0,
      activo: document.getElementById('rol-activo').checked,
      modulos,
      permisos
    };
    try {
      await API.actualizarRolPermiso(id, data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar el enlace de este rol? (el rol de Discord no se borra, solo su configuración acá)')) return;
    try {
      await API.eliminarRolPermiso(id);
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }
};

async function renderGestionRoles() {
  await RolesUI.cargar();
  setTimeout(() => RolesUI.render(), 0);

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-user-shield"></i> Gestión de Roles</h3>
        <button id="roles-sync-btn" class="btn btn-primary" onclick="RolesUI.sincronizar()"><i class="fas fa-sync"></i> Sincronizar desde Discord</button>
      </div>
      <p style="color:var(--text-muted);">Enlazá los roles de tu servidor de Discord con los módulos del portal, sin tocar código. Sincronizá primero para traer los roles, después configurá cada uno.</p>

      <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;">
        <input type="text" class="form-control" id="roles-buscar" placeholder="Buscar rol por nombre..." oninput="RolesUI.aplicarFiltros()" style="flex:1;min-width:200px;">
        <select class="form-control" id="roles-categoria" onchange="RolesUI.aplicarFiltros()" style="max-width:220px;">
          <option value="">Todas las categorías</option>
        </select>
      </div>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Rol</th>
              <th>Descripción</th>
              <th>Módulos</th>
              <th>Permisos</th>
              <th style="text-align:center;">Prioridad</th>
              <th style="text-align:center;">Estado</th>
              <th style="text-align:center;">Usuarios</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="roles-tabla-body">
            <tr><td colspan="8" class="text-center text-muted" style="padding:30px;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}