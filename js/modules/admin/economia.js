const EconomiaUI = {
  data: [],
  rolesDiscord: [],
  busqueda: '',
  categoria: '',

  async cargar() {
    await this.recargarLista();
  },

  async recargarLista() {
    try {
      const params = {};
      if (this.busqueda) params.search = this.busqueda;
      if (this.categoria) params.categoria = this.categoria;
      this.data = await API.getEconomias(params);
    } catch (err) {
      console.error('[Economía] Error cargando:', err.message);
      this.data = [];
    }
  },

  aplicarFiltros() {
    this.busqueda = document.getElementById('eco-buscar').value;
    this.categoria = document.getElementById('eco-categoria').value;
    this.recargarLista().then(() => this.render());
  },

  render() {
    const categorias = [...new Set(this.data.map(e => e.categoria).filter(Boolean))];
    const catSelect = document.getElementById('eco-categoria');
    if (catSelect) {
      const actual = catSelect.value;
      catSelect.innerHTML = `<option value="">Todas las categorías</option>` +
        categorias.map(c => `<option value="${c}" ${c === actual ? 'selected' : ''}>${c}</option>`).join('');
    }

    const cont = document.getElementById('eco-tabla-body');
    if (!cont) return;

    if (!this.data.length) {
      cont.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:30px;">No hay economías configuradas todavía.</td></tr>`;
      return;
    }

    cont.innerHTML = this.data.map(e => `
      <tr>
        <td>
          <strong>${e.nombre}</strong>
          <div style="font-size:11px;color:var(--text-muted);">${e.nombreRolDiscord || '(rol sin nombre)'} · ${e.discordRoleId}</div>
        </td>
        <td>${e.categoria || '<span class="text-muted">—</span>'}</td>
        <td>$${(e.sueldo || 0).toLocaleString()}</td>
        <td style="font-size:12px;">
          Bono: $${(e.bonificaciones || 0).toLocaleString()}<br>
          Extra: $${(e.horasExtras || 0).toLocaleString()}<br>
          Desc: -$${(e.descuentos || 0).toLocaleString()}
        </td>
        <td>Cada ${e.frecuenciaPagoDias} día(s)</td>
        <td style="text-align:center;">
          <span class="badge badge-${e.activo ? 'success' : 'secondary'}">${e.activo ? 'Activo' : 'Inactivo'}</span><br>
          <span class="badge badge-${e.rolExisteEnDiscord ? 'info' : 'danger'}" style="margin-top:4px;" title="¿El rol sigue existiendo en Discord?">
            ${e.rolExisteEnDiscord ? 'Rol OK' : 'Rol no existe'}
          </span>
        </td>
        <td style="text-align:center;">
          <span class="badge badge-info">${e.cantidadUsuarios} usuario(s)</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" onclick="EconomiaUI.editar('${e._id}')"><i class="fas fa-pen"></i></button>
            <button class="btn btn-sm btn-outline" onclick="EconomiaUI.verificar('${e._id}')" title="Verificar contra Discord"><i class="fas fa-sync"></i></button>
            <button class="btn btn-sm btn-danger" onclick="EconomiaUI.eliminar('${e._id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async abrirNuevo() {
    try {
      this.rolesDiscord = await API.getRolesDiscordDisponibles();
    } catch (err) {
      alert('No se pudo traer los roles de Discord: ' + err.message);
      return;
    }
    this.abrirFormulario();
  },

  editar(id) {
    const e = this.data.find(x => x._id === id);
    if (e) this.abrirFormulario(e);
  },

  abrirFormulario(e) {
    const eco = e || {};
    const esNuevo = !eco._id;

    App.showModal(esNuevo ? 'Nueva Economía' : `Editar economía: ${eco.nombre}`, `
      <form onsubmit="event.preventDefault(); EconomiaUI.guardar('${eco._id || ''}')">
        <div class="form-group">
          <label>Nombre de la economía</label>
          <input class="form-control" id="eco-nombre" value="${eco.nombre || ''}" placeholder="Ej: Sueldo Carabineros" required>
        </div>

        ${esNuevo ? `
        <div class="form-group">
          <label>Rol de Discord *</label>
          <select class="form-control" id="eco-rol-discord" required>
            <option value="">Seleccioná un rol...</option>
            ${this.rolesDiscord.map(r => `
              <option value="${r.id}" ${r.yaTieneEconomia ? 'disabled' : ''}>
                ${r.nombre}${r.yaTieneEconomia ? ' (ya tiene economía)' : ''}
              </option>
            `).join('')}
          </select>
        </div>
        ` : `
        <div class="form-group">
          <label>Rol de Discord (no se puede cambiar)</label>
          <input class="form-control" value="${eco.nombreRolDiscord || eco.discordRoleId}" disabled>
        </div>
        `}

        <div class="form-row">
          <div class="form-group"><label>Categoría / Institución</label><input class="form-control" id="eco-categoria-input" value="${eco.categoria || ''}" placeholder="Ej: Carabineros, PDI, Municipalidad"></div>
          <div class="form-group"><label>Frecuencia de pago (días)</label><input class="form-control" id="eco-frecuencia" type="number" value="${eco.frecuenciaPagoDias ?? 3}"></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Sueldo por pago</label><input class="form-control" id="eco-sueldo" type="number" value="${eco.sueldo || 0}"></div>
          <div class="form-group"><label>Saldo inicial</label><input class="form-control" id="eco-saldo-inicial" type="number" value="${eco.saldoInicial ?? 0}"></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Bonificaciones</label><input class="form-control" id="eco-bonificaciones" type="number" value="${eco.bonificaciones || 0}"></div>
          <div class="form-group"><label>Horas extras</label><input class="form-control" id="eco-horas-extras" type="number" value="${eco.horasExtras || 0}"></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Descuentos</label><input class="form-control" id="eco-descuentos" type="number" value="${eco.descuentos || 0}"></div>
          <div class="form-group"><label>Multas (referencia)</label><input class="form-control" id="eco-multas" type="number" value="${eco.multas || 0}"></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Recompensas (referencia)</label><input class="form-control" id="eco-recompensas" type="number" value="${eco.recompensas || 0}"></div>
          <div class="form-group"><label>Límite de dinero (0 = sin límite)</label><input class="form-control" id="eco-limite" type="number" value="${eco.limiteDinero || 0}"></div>
        </div>

        <div class="form-group" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="eco-activo" ${eco.activo !== false ? 'checked' : ''}> <label style="margin:0;">Economía activa</label>
        </div>

        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  async guardar(id) {
    const data = {
      nombre: document.getElementById('eco-nombre').value.trim(),
      categoria: document.getElementById('eco-categoria-input').value.trim(),
      frecuenciaPagoDias: parseInt(document.getElementById('eco-frecuencia').value) || 3,
      sueldo: parseInt(document.getElementById('eco-sueldo').value) || 0,
      saldoInicial: parseInt(document.getElementById('eco-saldo-inicial').value) || 0,
      bonificaciones: parseInt(document.getElementById('eco-bonificaciones').value) || 0,
      horasExtras: parseInt(document.getElementById('eco-horas-extras').value) || 0,
      descuentos: parseInt(document.getElementById('eco-descuentos').value) || 0,
      multas: parseInt(document.getElementById('eco-multas').value) || 0,
      recompensas: parseInt(document.getElementById('eco-recompensas').value) || 0,
      limiteDinero: parseInt(document.getElementById('eco-limite').value) || 0,
      activo: document.getElementById('eco-activo').checked
    };

    if (!data.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      if (id) {
        await API.actualizarEconomia(id, data);
      } else {
        const rolSelect = document.getElementById('eco-rol-discord');
        const discordRoleId = rolSelect ? rolSelect.value : '';
        if (!discordRoleId) { alert('Tenés que elegir un rol de Discord'); return; }
        data.discordRoleId = discordRoleId;
        await API.crearEconomia(data);
      }
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  },

  async verificar(id) {
    try {
      await API.verificarEconomia(id);
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta economía? Los usuarios que la tenían asignada dejarán de recibir este sueldo.')) return;
    try {
      await API.eliminarEconomia(id);
      await this.recargarLista();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }
};

async function renderGestionEconomia() {
  await EconomiaUI.cargar();
  setTimeout(() => EconomiaUI.render(), 0);

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-coins"></i> Gestión de Economía</h3>
        <button class="btn btn-primary" onclick="EconomiaUI.abrirNuevo()"><i class="fas fa-plus"></i> Nueva Economía</button>
      </div>
      <p style="color:var(--text-muted);">
        Cada economía queda enlazada al <strong>ID del rol de Discord</strong> (no al nombre ni al color), así que sigue funcionando
        aunque cambies cómo se llama o se ve el rol en tu servidor. El pago de sueldos corre solo, según la frecuencia que configures acá.
      </p>

      <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;">
        <input type="text" class="form-control" id="eco-buscar" placeholder="Buscar por nombre o ID de rol..." oninput="EconomiaUI.aplicarFiltros()" style="flex:1;min-width:200px;">
        <select class="form-control" id="eco-categoria" onchange="EconomiaUI.aplicarFiltros()" style="max-width:220px;">
          <option value="">Todas las categorías</option>
        </select>
      </div>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Economía</th>
              <th>Categoría</th>
              <th>Sueldo</th>
              <th>Bonos/Extras/Desc.</th>
              <th>Frecuencia</th>
              <th style="text-align:center;">Estado</th>
              <th style="text-align:center;">Usuarios</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="eco-tabla-body">
            <tr><td colspan="8" class="text-center text-muted" style="padding:30px;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}