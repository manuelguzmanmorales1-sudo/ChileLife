const PanelStaffUI = {
  tabActual: 'cedulas',
  cedulas: [],
  vehiculos: [],
  propiedades: [],
  empresas: [],
  sueldosPreset: [],
  logs: [],
  mercadoNegro: [],

  async cargarTab(tab) {
    this.tabActual = tab;
    if (tab === 'cedulas') this.cedulas = await API.getCedulas();
    if (tab === 'vehiculos') this.vehiculos = await API.getConcesionario();
    if (tab === 'propiedades') this.propiedades = await API.getPropiedades();
    if (tab === 'empresas') this.empresas = await API.getEmpresas();
    if (tab === 'sueldos') this.sueldosPreset = await API.getSueldosPreset();
    if (tab === 'logs') this.logs = await API.getLogsStaff();
    if (tab === 'mercado-negro') this.mercadoNegro = await API.getAllBlackMarket();
    this.render();
  },

  render() {
    document.querySelectorAll('.staff-tab').forEach(t => t.classList.toggle('active', t.dataset.staffTab === this.tabActual));
    const cont = document.getElementById('staff-tab-content');
    if (!cont) return;
    const renderers = {
      cedulas: () => this.renderCedulas(),
      vehiculos: () => this.renderVehiculos(),
      propiedades: () => this.renderPropiedades(),
      empresas: () => this.renderEmpresas(),
      economia: () => this.renderEconomia(),
      sueldos: () => this.renderSueldos(),
      inventario: () => this.renderInventarioBuscador(),
      logs: () => this.renderLogs(),
      'mercado-negro': () => this.renderMercadoNegro()
    };
    cont.innerHTML = renderers[this.tabActual] ? renderers[this.tabActual]() : '';
  },

  // ===== CÉDULAS =====
  renderCedulas() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="margin:0;">Cédulas registradas (${this.cedulas.length})</h4>
      </div>
      <input class="form-control" placeholder="Buscar persona por nombre o RUT..." oninput="PanelStaffUI.buscarCedulas(this.value)" style="margin-bottom:14px;">
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.cedulas.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${c.nombre}</strong>
              <div style="font-size:12px;color:var(--text-muted);">${c.rut} · ${c.nacionalidad || '—'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="badge badge-${c.congelado ? 'danger' : 'success'}">${c.congelado ? 'congelada' : 'activa'}</span>
              <button class="btn btn-sm btn-outline" onclick="PanelStaffUI.congelarCedula('${c._id}')" title="${c.congelado ? 'Reactivar' : 'Congelar'}"><i class="fas fa-${c.congelado ? 'unlock' : 'lock'}"></i></button>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.eliminarCedula('${c._id}')" title="Eliminar cédula"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay cédulas registradas</p>'}
      </div>
    `;
  },

  async buscarCedulas(valor) {
    this.cedulas = await API.getCedulas(valor);
    document.getElementById('staff-tab-content').innerHTML = this.renderCedulas();
  },

  async congelarCedula(id) {
    try { await API.congelarCedula(id); await this.cargarTab('cedulas'); } catch (e) { alert(e.message); }
  },

  async eliminarCedula(id) {
    if (!confirm('¿Eliminar esta cédula? La persona va a tener que crear el DNI de nuevo.')) return;
    try { await API.eliminarCedula(id); await this.cargarTab('cedulas'); } catch (e) { alert(e.message); }
  },

  // ===== VEHÍCULOS (Concesionario) =====
  renderVehiculos() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="margin:0;">Vehículos publicados (${this.vehiculos.length})</h4>
        <button class="btn btn-primary" onclick="PanelStaffUI.abrirFormVehiculo()"><i class="fas fa-plus"></i> Nuevo Vehículo</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.vehiculos.map(v => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${v.marca} ${v.modelo} ${v.anio || ''}</strong>
              <div style="font-size:12px;color:var(--text-muted);">${v.categoria} · $${v.precio.toLocaleString()} · ${v.unidades} unidades</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-outline" onclick="PanelStaffUI.editarVehiculo('${v._id}')"><i class="fas fa-pen"></i></button>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.eliminarVehiculo('${v._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay vehículos publicados</p>'}
      </div>
    `;
  },

  abrirFormVehiculo(v) {
    const it = v || {};
    App.showModal(it._id ? 'Editar Vehículo' : 'Nuevo Vehículo', `
      <form onsubmit="event.preventDefault();PanelStaffUI.guardarVehiculo('${it._id || ''}')">
        <div class="form-row">
          <div class="form-group"><label>Marca *</label><input class="form-control" id="pv-marca" value="${it.marca || ''}" required></div>
          <div class="form-group"><label>Modelo *</label><input class="form-control" id="pv-modelo" value="${it.modelo || ''}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Categoría</label><input class="form-control" id="pv-categoria" value="${it.categoria || 'Sedan'}"></div>
          <div class="form-group"><label>Año</label><input class="form-control" id="pv-anio" type="number" value="${it.anio || new Date().getFullYear()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Precio *</label><input class="form-control" id="pv-precio" type="number" value="${it.precio || ''}" required></div>
          <div class="form-group"><label>Unidades</label><input class="form-control" id="pv-unidades" type="number" value="${it.unidades ?? 1}"></div>
        </div>
        <div class="form-group"><label>Imagen (URL)</label><input class="form-control" id="pv-imagen" value="${it.imagen || ''}"></div>
        <div class="form-group"><label>Descripción</label><input class="form-control" id="pv-descripcion" value="${it.descripcion || ''}"></div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  editarVehiculo(id) {
    const v = this.vehiculos.find(x => x._id === id);
    if (v) this.abrirFormVehiculo(v);
  },

  async guardarVehiculo(id) {
    const data = {
      marca: document.getElementById('pv-marca').value.trim(),
      modelo: document.getElementById('pv-modelo').value.trim(),
      categoria: document.getElementById('pv-categoria').value.trim(),
      anio: parseInt(document.getElementById('pv-anio').value) || null,
      precio: parseInt(document.getElementById('pv-precio').value) || 0,
      unidades: parseInt(document.getElementById('pv-unidades').value) || 0,
      imagen: document.getElementById('pv-imagen').value.trim(),
      descripcion: document.getElementById('pv-descripcion').value.trim()
    };
    try {
      if (id) await API.updateVehiculoConcesionario(id, data);
      else await API.createVehiculoConcesionario(data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.cargarTab('vehiculos');
    } catch (e) { alert(e.message); }
  },

  async eliminarVehiculo(id) {
    if (!confirm('¿Eliminar este vehículo del catálogo?')) return;
    try { await API.deleteVehiculoConcesionario(id); await this.cargarTab('vehiculos'); } catch (e) { alert(e.message); }
  },

  // ===== PROPIEDADES =====
  renderPropiedades() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="margin:0;">Propiedades registradas (${this.propiedades.length})</h4>
        <button class="btn btn-primary" onclick="PanelStaffUI.abrirFormPropiedad()"><i class="fas fa-plus"></i> Nueva Propiedad</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.propiedades.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${p.nombre}</strong> <span class="badge badge-info">${p.tipo}</span>
              <div style="font-size:12px;color:var(--text-muted);">${p.direccion || '—'} · ${p.habitaciones} hab. · $${p.precio.toLocaleString()} ${p.duenoRut ? '· Dueño: ' + p.duenoRut : '· Sin dueño'}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-outline" onclick="PanelStaffUI.editarPropiedad('${p._id}')"><i class="fas fa-pen"></i></button>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.eliminarPropiedad('${p._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay propiedades registradas</p>'}
      </div>
    `;
  },

  abrirFormPropiedad(p) {
    const it = p || {};
    App.showModal(it._id ? 'Editar Propiedad' : 'Nueva Propiedad', `
      <form onsubmit="event.preventDefault();PanelStaffUI.guardarPropiedad('${it._id || ''}')">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="pp-nombre" value="${it.nombre || ''}" required></div>
        <div class="form-group"><label>Dirección</label><input class="form-control" id="pp-direccion" value="${it.direccion || ''}"></div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo</label>
            <select class="form-control" id="pp-tipo">
              ${['Casa','Departamento','Garaje','Local Comercial'].map(t => `<option value="${t}" ${it.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Habitaciones</label><input class="form-control" id="pp-habitaciones" type="number" value="${it.habitaciones || 0}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Precio de venta</label><input class="form-control" id="pp-precio" type="number" value="${it.precio || 0}"></div>
          <div class="form-group"><label>Precio de alquiler</label><input class="form-control" id="pp-precio-alquiler" type="number" value="${it.precioAlquiler || 0}"></div>
        </div>
        <div class="form-group"><label>RUT del dueño (vacío = sin dueño / disponible)</label><input class="form-control" id="pp-dueno" value="${it.duenoRut || ''}"></div>
        <div class="form-group" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="pp-alquiler" ${it.enAlquiler ? 'checked' : ''}> <label style="margin:0;">Disponible en alquiler</label>
        </div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  editarPropiedad(id) {
    const p = this.propiedades.find(x => x._id === id);
    if (p) this.abrirFormPropiedad(p);
  },

  async guardarPropiedad(id) {
    const data = {
      nombre: document.getElementById('pp-nombre').value.trim(),
      direccion: document.getElementById('pp-direccion').value.trim(),
      tipo: document.getElementById('pp-tipo').value,
      habitaciones: parseInt(document.getElementById('pp-habitaciones').value) || 0,
      precio: parseInt(document.getElementById('pp-precio').value) || 0,
      precioAlquiler: parseInt(document.getElementById('pp-precio-alquiler').value) || 0,
      duenoRut: document.getElementById('pp-dueno').value.trim(),
      enAlquiler: document.getElementById('pp-alquiler').checked
    };
    try {
      if (id) await API.actualizarPropiedad(id, data);
      else await API.crearPropiedad(data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.cargarTab('propiedades');
    } catch (e) { alert(e.message); }
  },

  async eliminarPropiedad(id) {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    try { await API.eliminarPropiedad(id); await this.cargarTab('propiedades'); } catch (e) { alert(e.message); }
  },

  // ===== EMPRESAS =====
  renderEmpresas() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="margin:0;">Empresas (${this.empresas.length})</h4>
        <button class="btn btn-primary" onclick="PanelStaffUI.abrirFormEmpresa()"><i class="fas fa-plus"></i> Nueva Empresa</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.empresas.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${e.nombre}</strong>
              <div style="font-size:12px;color:var(--text-muted);">Dueño: ${e.duenoRut || '—'} · ${(e.empleadosRuts || []).length} emp. · ${e.direccion || '—'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="color:var(--success);font-weight:700;">$${e.caja.toLocaleString()}</span>
              <button class="btn btn-sm btn-outline" onclick="PanelStaffUI.editarEmpresa('${e._id}')"><i class="fas fa-pen"></i></button>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.eliminarEmpresa('${e._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay empresas registradas</p>'}
      </div>
    `;
  },

  abrirFormEmpresa(e) {
    const it = e || {};
    App.showModal(it._id ? 'Editar Empresa' : 'Nueva Empresa', `
      <form onsubmit="event.preventDefault();PanelStaffUI.guardarEmpresa('${it._id || ''}')">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="pe-nombre" value="${it.nombre || ''}" required></div>
        <div class="form-group"><label>RUT del dueño</label><input class="form-control" id="pe-dueno" value="${it.duenoRut || ''}"></div>
        <div class="form-group"><label>Dirección</label><input class="form-control" id="pe-direccion" value="${it.direccion || ''}"></div>
        <div class="form-group"><label>Caja (saldo inicial)</label><input class="form-control" id="pe-caja" type="number" value="${it.caja || 0}"></div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  editarEmpresa(id) {
    const e = this.empresas.find(x => x._id === id);
    if (e) this.abrirFormEmpresa(e);
  },

  async guardarEmpresa(id) {
    const data = {
      nombre: document.getElementById('pe-nombre').value.trim(),
      duenoRut: document.getElementById('pe-dueno').value.trim(),
      direccion: document.getElementById('pe-direccion').value.trim(),
      caja: parseInt(document.getElementById('pe-caja').value) || 0
    };
    try {
      if (id) await API.actualizarEmpresa(id, data);
      else await API.crearEmpresa(data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.cargarTab('empresas');
    } catch (e) { alert(e.message); }
  },

  async eliminarEmpresa(id) {
    if (!confirm('¿Eliminar esta empresa?')) return;
    try { await API.eliminarEmpresa(id); await this.cargarTab('empresas'); } catch (e) { alert(e.message); }
  },

  // ===== ECONOMÍA (modificar saldo / transferir) =====
  renderEconomia() {
    return `
      <div class="grid-2">
        <div class="card" style="background:var(--bg-input);">
          <div class="card-header"><h4 style="margin:0;">Modificar Saldo</h4></div>
          <div class="form-group"><label>Usuario</label><input class="form-control" id="eco-buscar-user" placeholder="Buscar usuario..." oninput="PanelStaffUI.buscarUsuarioInput('eco-buscar-user','eco-user-id')"></div>
          <input type="hidden" id="eco-user-id">
          <div id="eco-buscar-user-result"></div>
          <div class="form-group"><label>Monto</label><input class="form-control" id="eco-monto" type="number" value="0"></div>
          <div class="form-group"><label>Motivo *</label><input class="form-control" id="eco-motivo" placeholder="Ej: Premio evento especial"></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-success" style="flex:1;" onclick="PanelStaffUI.modificarSaldo('agregar')"><i class="fas fa-plus"></i> Agregar</button>
            <button class="btn btn-danger" style="flex:1;" onclick="PanelStaffUI.modificarSaldo('quitar')"><i class="fas fa-minus"></i> Quitar</button>
          </div>
          <div id="eco-result"></div>
        </div>
        <div class="card" style="background:var(--bg-input);">
          <div class="card-header"><h4 style="margin:0;">Transferir entre usuarios</h4></div>
          <div class="form-group"><label>Origen</label><input class="form-control" id="eco-origen" placeholder="Usuario origen..." oninput="PanelStaffUI.buscarUsuarioInput('eco-origen','eco-origen-id')"></div>
          <input type="hidden" id="eco-origen-id">
          <div id="eco-origen-result"></div>
          <div class="form-group"><label>Destino</label><input class="form-control" id="eco-destino" placeholder="Usuario destino..." oninput="PanelStaffUI.buscarUsuarioInput('eco-destino','eco-destino-id')"></div>
          <input type="hidden" id="eco-destino-id">
          <div id="eco-destino-result"></div>
          <div class="form-group"><label>Monto</label><input class="form-control" id="eco-transf-monto" type="number" value="0"></div>
          <div class="form-group"><label>Motivo</label><input class="form-control" id="eco-transf-motivo" placeholder="Ej: Compra de vehículo"></div>
          <button class="btn btn-primary btn-block" onclick="PanelStaffUI.transferir()"><i class="fas fa-exchange-alt"></i> Confirmar Transferencia</button>
          <div id="eco-transf-result"></div>
        </div>
      </div>
    `;
  },

  async buscarUsuarioInput(inputId, hiddenId) {
    const valor = document.getElementById(inputId).value.trim();
    const resultId = inputId + '-result';
    const resultDiv = document.getElementById(resultId);
    if (!resultDiv) return;
    if (valor.length < 2) { resultDiv.innerHTML = ''; return; }
    const usuarios = await API.buscarUsuarioStaff(valor);
    resultDiv.innerHTML = usuarios.map(u => `
      <div style="padding:6px 8px;cursor:pointer;border-radius:6px;font-size:13px;" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='transparent'"
        onclick="document.getElementById('${inputId}').value='${u.nombre.replace(/'/g,"")}';document.getElementById('${hiddenId}').value='${u.id}';document.getElementById('${resultId}').innerHTML='';">
        ${u.nombre} <span style="color:var(--text-muted);">(${u.rut || 'sin RUT'})</span>
      </div>
    `).join('');
  },

  async modificarSaldo(accion) {
    const userId = document.getElementById('eco-user-id').value;
    const monto = parseInt(document.getElementById('eco-monto').value) || 0;
    const motivo = document.getElementById('eco-motivo').value.trim();
    const result = document.getElementById('eco-result');
    if (!userId || !monto || !motivo) { result.innerHTML = App.showAlert('Completá usuario, monto y motivo', 'danger'); return; }
    try {
      await API.modificarSaldoStaff(userId, monto, motivo, accion);
      result.innerHTML = App.showAlert('Saldo actualizado', 'success');
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  async transferir() {
    const origenId = document.getElementById('eco-origen-id').value;
    const destinoId = document.getElementById('eco-destino-id').value;
    const monto = parseInt(document.getElementById('eco-transf-monto').value) || 0;
    const motivo = document.getElementById('eco-transf-motivo').value.trim();
    const result = document.getElementById('eco-transf-result');
    if (!origenId || !destinoId || !monto) { result.innerHTML = App.showAlert('Completá origen, destino y monto', 'danger'); return; }
    try {
      await API.transferirStaff(origenId, destinoId, monto, motivo);
      result.innerHTML = App.showAlert('Transferencia realizada', 'success');
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== SUELDOS (preset) =====
  renderSueldos() {
    return `
      <div class="form-group"><label>Usuario *</label><input class="form-control" id="suel-buscar-user" placeholder="Buscar usuario..." oninput="PanelStaffUI.buscarUsuarioInput('suel-buscar-user','suel-user-id')"></div>
      <input type="hidden" id="suel-user-id">
      <div id="suel-buscar-user-result"></div>
      <h4 style="margin-top:16px;">Tipo de sueldo *</h4>
      <p style="color:var(--text-muted);font-size:13px;">Se paga solo, cada 3 días, mientras la asignación siga activa.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.sueldosPreset.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;cursor:pointer;" onclick="PanelStaffUI.seleccionarPreset('${s.key}', this)">
            <span>${s.nombre} ${s.badge ? `<span class="badge badge-info">${s.badge}</span>` : ''}</span>
            <span style="color:var(--success);font-weight:700;">$${s.monto.toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
      <input type="hidden" id="suel-preset-key">
      <button class="btn btn-success btn-block" style="margin-top:16px;" onclick="PanelStaffUI.asignarSueldo()"><i class="fas fa-money-bill-wave"></i> Asignar Sueldo</button>
      <div id="suel-result"></div>
    `;
  },

  seleccionarPreset(key, el) {
    document.getElementById('suel-preset-key').value = key;
    document.querySelectorAll('#staff-tab-content > div[style*="cursor:pointer"]').forEach(d => d.style.border = 'none');
    el.style.border = '2px solid var(--accent)';
  },

  async asignarSueldo() {
    const userId = document.getElementById('suel-user-id').value;
    const presetKey = document.getElementById('suel-preset-key').value;
    const result = document.getElementById('suel-result');
    if (!userId || !presetKey) { result.innerHTML = App.showAlert('Elegí un usuario y un tipo de sueldo', 'danger'); return; }
    try {
      await API.asignarSueldoStaff(userId, presetKey);
      result.innerHTML = App.showAlert('Sueldo asignado correctamente', 'success');
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== INVENTARIO =====
  renderInventarioBuscador() {
    return `
      <div class="form-group"><label>Buscar usuario</label><input class="form-control" id="inv-buscar-user" placeholder="Nombre o RUT..." oninput="PanelStaffUI.buscarUsuarioInventario(this.value)"></div>
      <div id="inv-user-result"></div>
      <div id="inv-detalle" style="margin-top:16px;"></div>
    `;
  },

  async buscarUsuarioInventario(valor) {
    const cont = document.getElementById('inv-user-result');
    if (valor.trim().length < 2) { cont.innerHTML = ''; return; }
    const usuarios = await API.buscarUsuarioStaff(valor);
    cont.innerHTML = usuarios.map(u => `
      <div style="padding:8px;cursor:pointer;border-radius:6px;" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'" onclick="PanelStaffUI.verInventario('${u.id}','${u.nombre.replace(/'/g,"")}')">
        ${u.nombre} <span style="color:var(--text-muted);">(${u.rut || 'sin RUT'})</span>
      </div>
    `).join('');
  },

  async verInventario(userId, nombre) {
    const data = await API.getInventarioStaff(userId);
    const cont = document.getElementById('inv-detalle');
    const inventario = data.inventario || [];
    const vehiculos = data.vehiculos || [];
    cont.innerHTML = `
      <h4>Inventario de ${nombre}</h4>
      <div class="grid-2">
        <div class="card" style="background:var(--bg-input);">
          <div class="card-header"><h4 style="margin:0;">Items (${inventario.length})</h4></div>
          ${inventario.map(i => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
              <span>${i.nombre} x${i.cantidad}</span>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.quitarItem('${userId}','${i.itemId}','${nombre.replace(/'/g,"")}')"><i class="fas fa-trash"></i></button>
            </div>
          `).join('') || '<p style="color:var(--text-muted);font-size:13px;">Sin items</p>'}
        </div>
        <div class="card" style="background:var(--bg-input);">
          <div class="card-header"><h4 style="margin:0;">Vehículos (${vehiculos.length})</h4></div>
          ${vehiculos.map(v => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
              <span>${v.marca} ${v.modelo} — ${v.patente}</span>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.quitarVehiculo('${userId}','${v.patente}','${nombre.replace(/'/g,"")}')"><i class="fas fa-trash"></i></button>
            </div>
          `).join('') || '<p style="color:var(--text-muted);font-size:13px;">Sin vehículos</p>'}
        </div>
      </div>
    `;
  },

  async quitarItem(userId, itemId, nombre) {
    if (!confirm('¿Quitar este item del inventario?')) return;
    await API.eliminarItemStaff(userId, itemId);
    this.verInventario(userId, nombre);
  },

  async quitarVehiculo(userId, vehiculoId, nombre) {
    if (!confirm('¿Quitar este vehículo?')) return;
    await API.eliminarVehiculoStaff(userId, vehiculoId);
    this.verInventario(userId, nombre);
  },

  // ===== MERCADO NEGRO =====
  renderMercadoNegro() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="margin:0;">Items del Mercado Negro (${this.mercadoNegro.length})</h4>
        <button class="btn btn-primary" onclick="PanelStaffUI.abrirFormItemMN()"><i class="fas fa-plus"></i> Nuevo Item</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.mercadoNegro.map(i => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${i.item}</strong>
              <div style="font-size:12px;color:var(--text-muted);">${i.vendedor} · $${i.precio.toLocaleString()} · Stock: ${i.stock}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-outline" onclick="PanelStaffUI.editarItemMN('${i._id}')"><i class="fas fa-pen"></i></button>
              <button class="btn btn-sm btn-danger" onclick="PanelStaffUI.eliminarItemMN('${i._id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay items en el mercado negro</p>'}
      </div>
    `;
  },

  abrirFormItemMN(it) {
    const item = it || {};
    App.showModal(item._id ? 'Editar Item' : 'Nuevo Item del Mercado Negro', `
      <form onsubmit="event.preventDefault();PanelStaffUI.guardarItemMN('${item._id || ''}')">
        <div class="form-group"><label>Nombre *</label><input class="form-control" id="mn-nombre" value="${item.item || ''}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Precio *</label><input class="form-control" id="mn-precio" type="number" value="${item.precio || ''}" required></div>
          <div class="form-group"><label>Stock</label><input class="form-control" id="mn-stock" type="number" value="${item.stock ?? 0}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Vendedor</label><input class="form-control" id="mn-vendedor" value="${item.vendedor || ''}"></div>
          <div class="form-group"><label>Categoría</label><input class="form-control" id="mn-categoria" value="${item.categoria || ''}"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  editarItemMN(id) {
    const item = this.mercadoNegro.find(x => x._id === id);
    if (item) this.abrirFormItemMN(item);
  },

  async guardarItemMN(id) {
    const data = {
      item: document.getElementById('mn-nombre').value.trim(),
      precio: parseInt(document.getElementById('mn-precio').value) || 0,
      stock: parseInt(document.getElementById('mn-stock').value) || 0,
      vendedor: document.getElementById('mn-vendedor').value.trim(),
      categoria: document.getElementById('mn-categoria').value.trim()
    };
    try {
      if (id) await API.updateBlackMarketItem(id, data);
      else await API.createBlackMarketItem(data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.cargarTab('mercado-negro');
    } catch (e) { alert(e.message); }
  },

  async eliminarItemMN(id) {
    if (!confirm('¿Eliminar este item del mercado negro?')) return;
    try { await API.deleteBlackMarketItem(id); await this.cargarTab('mercado-negro'); } catch (e) { alert(e.message); }
  },

  // ===== LOGS =====
  renderLogs() {
    return `
      <input class="form-control" placeholder="Buscar persona por nombre..." oninput="PanelStaffUI.buscarLogs(this.value)" style="margin-bottom:14px;">
      <div class="card" style="background:var(--bg-input);">
        <div class="card-header"><h4 style="margin:0;">Registro de acciones del Staff</h4><span class="badge badge-info">${this.logs.length} entradas</span></div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${this.logs.map(l => `
            <div style="border-bottom:1px solid var(--glass-border);padding-bottom:10px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="font-size:12px;color:var(--text-muted);">${new Date(l.created_at).toLocaleString('es-CL')} <span class="badge badge-secondary">${l.tipo}</span></span>
                <span style="font-size:12px;color:var(--info);">${l.staff_nombre} → ${l.objetivo_nombre}</span>
              </div>
              <div style="font-weight:600;margin-top:2px;">${l.descripcion}</div>
            </div>
          `).join('') || '<p style="color:var(--text-muted);">Sin registros todavía</p>'}
        </div>
      </div>
    `;
  },

  async buscarLogs(valor) {
    this.logs = await API.getLogsStaff(valor);
    document.getElementById('staff-tab-content').innerHTML = this.renderLogs();
  }
};

async function renderPanelStaff() {
  setTimeout(() => PanelStaffUI.cargarTab('cedulas'), 0);

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-user-shield"></i> Panel de Staff</h3>
        <span style="color:var(--text-muted);font-size:13px;">Gestión exclusiva — Administración</span>
      </div>
      <div class="chip-filtros" style="margin-top:10px;">
        <button class="chip staff-tab active" data-staff-tab="cedulas" onclick="PanelStaffUI.cargarTab('cedulas')"><i class="fas fa-id-card"></i> Cédulas</button>
        <button class="chip staff-tab" data-staff-tab="vehiculos" onclick="PanelStaffUI.cargarTab('vehiculos')"><i class="fas fa-car"></i> Vehículos</button>
        <button class="chip staff-tab" data-staff-tab="propiedades" onclick="PanelStaffUI.cargarTab('propiedades')"><i class="fas fa-home"></i> Propiedades</button>
        <button class="chip staff-tab" data-staff-tab="empresas" onclick="PanelStaffUI.cargarTab('empresas')"><i class="fas fa-building"></i> Empresas</button>
        <button class="chip staff-tab" data-staff-tab="economia" onclick="PanelStaffUI.cargarTab('economia')"><i class="fas fa-dollar-sign"></i> Economía</button>
        <button class="chip staff-tab" data-staff-tab="sueldos" onclick="PanelStaffUI.cargarTab('sueldos')"><i class="fas fa-wallet"></i> Sueldos</button>
        <button class="chip staff-tab" data-staff-tab="inventario" onclick="PanelStaffUI.cargarTab('inventario')"><i class="fas fa-box"></i> Inventario</button>
        <button class="chip staff-tab" data-staff-tab="mercado-negro" onclick="PanelStaffUI.cargarTab('mercado-negro')"><i class="fas fa-skull"></i> Mercado Negro</button>
        <button class="chip staff-tab" data-staff-tab="logs" onclick="PanelStaffUI.cargarTab('logs')"><i class="fas fa-file-alt"></i> Logs</button>
      </div>
    </div>
    <div class="card">
      <div id="staff-tab-content">Cargando...</div>
    </div>
  `;
}