const AupolUI = {
  tabActual: 'consulta',
  resultadoConsulta: null,
  buscados: [],
  vehiculosResultado: [],
  bienes: [],
  incautaciones: [],
  inventarioCiudadano: null,
  inventarioRut: '',

  cargarTab(tab) {
    this.tabActual = tab;
    document.querySelectorAll('.aupol-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'buscados') this.cargarBuscados();
    if (tab === 'bienes') this.cargarBienes();
    if (tab === 'incautado') this.cargarIncautaciones();
    this.render();
  },

  render() {
    const cont = document.getElementById('aupol-tab-content');
    if (!cont) return;
    const renderers = {
      consulta: () => this.renderConsulta(),
      antecedente: () => this.renderNuevoAntecedente(),
      multa: () => this.renderNuevaMulta(),
      bienes: () => this.renderBienes(),
      incautado: () => this.renderIncautado(),
      buscados: () => this.renderBuscados(),
      vehiculos: () => this.renderVehiculos()
    };
    cont.innerHTML = renderers[this.tabActual] ? renderers[this.tabActual]() : '';
  },

  // ===== CONSULTA POR RUT =====
  renderConsulta() {
    return `
      <div style="display:flex;gap:10px;margin-bottom:16px;">
        <input class="form-control" id="aupol-rut" placeholder="RUT a consultar (ej: 12.345.678-9)" onkeydown="if(event.key==='Enter')AupolUI.consultarRut()">
        <button class="btn btn-primary" onclick="AupolUI.consultarRut()"><i class="fas fa-search"></i> Consultar</button>
      </div>
      <div id="aupol-consulta-result">${this.renderResultadoConsulta()}</div>
    `;
  },

  renderResultadoConsulta() {
    if (!this.resultadoConsulta) return '<p style="color:var(--text-muted);">Ingresa un RUT para ver su ficha completa.</p>';
    const data = this.resultadoConsulta;
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Datos del Ciudadano</h3></div>
          <p><strong>Nombre:</strong> ${data.ciudadano.nombre}</p>
          <p><strong>RUT:</strong> ${data.ciudadano.rut}</p>
          <p><strong>Dirección registrada:</strong> ${data.ciudadano.direccion || 'No registrada'}</p>
          <p><strong>Teléfono:</strong> ${data.ciudadano.telefono || '—'}</p>
          <p><strong>Edad:</strong> ${data.ciudadano.edad || '—'}</p>
          <p><strong>Nacionalidad:</strong> ${data.ciudadano.nacionalidad || '—'}</p>
        </div>
        <div class="card">
          <div class="card-header"><h3>Vehículos Asociados</h3></div>
          ${data.vehiculos.length ? `
          <table>
            <thead><tr><th>Patente</th><th>Marca</th><th>Modelo</th><th>Estado</th></tr></thead>
            <tbody>
              ${data.vehiculos.map(v => `<tr>
                <td>${v.patente}</td><td>${v.marca}</td><td>${v.modelo}</td>
                <td><span class="badge ${v.estado === 'Sin encargo' ? 'badge-success' : 'badge-danger'}">${v.estado}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:var(--text-muted);">Sin vehículos registrados</p>'}
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Reportes e Incidentes (Carabineros/PDI)</h3></div>
          <h4 style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Denuncias</h4>
          ${data.denuncias.length ? `
          <table>
            <thead><tr><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              ${data.denuncias.map(d => `<tr><td>${d.tipo}</td><td>${d.fecha}</td><td><span class="badge badge-info">${d.estado}</span></td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:var(--text-muted);font-size:12px;">Sin denuncias</p>'}

          <h4 style="font-size:13px;color:var(--text-muted);margin:14px 0 6px;">Antecedentes</h4>
          ${data.antecedentes.length ? `
          <table>
            <thead><tr><th>Delito</th><th>Descripción</th><th>Institución</th><th>Fecha</th></tr></thead>
            <tbody>
              ${data.antecedentes.map(a => `<tr><td>${a.delito}</td><td style="font-size:12px;color:var(--text-muted);">${a.descripcion || '—'}</td><td>${a.institucion}</td><td>${a.fecha}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:var(--text-muted);font-size:12px;">Sin antecedentes</p>'}
        </div>

        <div class="card">
          <div class="card-header"><h3>Órdenes Municipales (Multas)</h3></div>
          ${data.multas.length ? `
          <table>
            <thead><tr><th>Motivo</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              ${data.multas.map(m => `<tr><td>${m.motivo}</td><td>$${m.monto.toLocaleString()}</td><td><span class="badge ${m.pagada ? 'badge-success' : 'badge-danger'}">${m.pagada ? 'Pagada' : 'Pendiente'}</span></td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:var(--text-muted);">Sin órdenes municipales registradas</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-briefcase"></i> Pertenencias</h3>
          <button class="btn btn-info" style="padding:6px 14px;font-size:13px;" onclick="AupolUI.verPertenencias('${data.ciudadano.rut}')"><i class="fas fa-eye"></i> Ver ficha completa</button>
        </div>
        <div id="aupol-pertenencias-result"><p style="color:var(--text-muted);font-size:13px;">Haz clic en "Ver ficha completa" para revisar vehículos, documentos e inventario.</p></div>
      </div>
    `;
  },

  async verPertenencias(rut) {
    const cont = document.getElementById('aupol-pertenencias-result');
    cont.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
    try {
      const ficha = await API.getPertenenciasDe(rut);
      cont.innerHTML = `
        <div class="grid-3">
          <div>
            <h4 style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Vehículos (${ficha.vehiculos.length})</h4>
            ${ficha.vehiculos.length ? ficha.vehiculos.map(v => `<p style="font-size:13px;margin:4px 0;">${v.marca} ${v.modelo} — <span class="badge badge-warning">${v.patente}</span></p>`).join('') : '<p style="color:var(--text-muted);font-size:12px;">Sin vehículos</p>'}
          </div>
          <div>
            <h4 style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Documentos (${ficha.documentos.length})</h4>
            ${ficha.documentos.length ? ficha.documentos.map(d => `<p style="font-size:13px;margin:4px 0;">${d.tipo} — <span class="badge ${d.estado === 'Vigente' ? 'badge-success' : 'badge-danger'}">${d.estado}</span></p>`).join('') : '<p style="color:var(--text-muted);font-size:12px;">Sin documentos</p>'}
          </div>
          <div>
            <h4 style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Mochila (${ficha.mochila.length})</h4>
            ${ficha.mochila.length ? ficha.mochila.map(i => `<p style="font-size:13px;margin:4px 0;">${i.nombre} <span class="badge badge-info">x${i.cantidad || 1}</span></p>`).join('') : '<p style="color:var(--text-muted);font-size:12px;">Vacía</p>'}
          </div>
        </div>
      `;
    } catch (e) {
      cont.innerHTML = App.showAlert(e.message || 'No se pudo cargar la ficha', 'danger');
    }
  },

  async consultarRut() {
    const rut = document.getElementById('aupol-rut').value.trim();
    const cont = document.getElementById('aupol-consulta-result');
    if (!rut) return;
    cont.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Consultando...</p>';
    try {
      this.resultadoConsulta = await API.consultaSNSM(rut);
    } catch (e) {
      cont.innerHTML = App.showAlert(e.message || 'Ciudadano no encontrado', 'danger');
      this.resultadoConsulta = null;
      return;
    }
    cont.innerHTML = this.renderResultadoConsulta();
  },

  // ===== NUEVO ANTECEDENTE =====
  renderNuevoAntecedente() {
    return `
      <div style="max-width:480px;">
        <div class="form-group"><label>RUT</label><input class="form-control" id="ant-rut" placeholder="12.345.678-9"></div>
        <div class="form-group"><label>Nombre</label><input class="form-control" id="ant-nombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Delito</label><input class="form-control" id="ant-delito" placeholder="Ej: Robo, Hurto..."></div>
        <div class="form-group"><label>Descripción</label><textarea class="form-control" id="ant-desc" rows="3"></textarea></div>
        <button class="btn btn-primary btn-block" onclick="AupolUI.crearAntecedente()"><i class="fas fa-plus"></i> Registrar</button>
        <div id="ant-result" style="margin-top:12px;"></div>
      </div>
    `;
  },

  async crearAntecedente() {
    const rut = document.getElementById('ant-rut').value.trim();
    const nombre = document.getElementById('ant-nombre').value.trim();
    const delito = document.getElementById('ant-delito').value.trim();
    const descripcion = document.getElementById('ant-desc').value.trim();
    const result = document.getElementById('ant-result');
    if (!rut || !delito) { result.innerHTML = App.showAlert('RUT y delito son obligatorios', 'danger'); return; }
    try {
      await API.createAntecedente({ rut, nombre, delito, descripcion, institucion: 'Carabineros' });
      result.innerHTML = App.showAlert('Antecedente registrado', 'success');
      ['ant-rut', 'ant-nombre', 'ant-delito', 'ant-desc'].forEach(id => document.getElementById(id).value = '');
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo registrar', 'danger');
    }
  },

  // ===== NUEVA MULTA =====
  renderNuevaMulta() {
    return `
      <div style="max-width:480px;">
        <div class="form-group"><label>RUT</label><input class="form-control" id="multa-rut" placeholder="12.345.678-9"></div>
        <div class="form-group"><label>Nombre</label><input class="form-control" id="multa-nombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Motivo</label><input class="form-control" id="multa-motivo" placeholder="Ej: Exceso de velocidad"></div>
        <div class="form-group"><label>Monto</label><input class="form-control" type="number" id="multa-monto" placeholder="0"></div>
        <button class="btn btn-primary btn-block" onclick="AupolUI.crearMulta()"><i class="fas fa-plus"></i> Cursar Multa</button>
        <div id="multa-result" style="margin-top:12px;"></div>
      </div>
    `;
  },

  async crearMulta() {
    const rut = document.getElementById('multa-rut').value.trim();
    const nombre = document.getElementById('multa-nombre').value.trim();
    const motivo = document.getElementById('multa-motivo').value.trim();
    const monto = parseInt(document.getElementById('multa-monto').value, 10);
    const result = document.getElementById('multa-result');
    if (!rut || !motivo || !monto) { result.innerHTML = App.showAlert('RUT, motivo y monto son obligatorios', 'danger'); return; }
    try {
      await API.createMulta({ rut, nombre, motivo, monto, institucion: 'Carabineros' });
      result.innerHTML = App.showAlert('Multa cursada', 'success');
      ['multa-rut', 'multa-nombre', 'multa-motivo', 'multa-monto'].forEach(id => document.getElementById(id).value = '');
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo cursar la multa', 'danger');
    }
  },

  // ===== PERSONAS BUSCADAS =====
  async cargarBuscados() {
    try { this.buscados = await API.getPersonasBuscadas(); } catch (e) { this.buscados = []; }
  },

  renderBuscados() {
    return `
      <button class="btn btn-sm btn-outline" style="margin-bottom:14px;" onclick="AupolUI.formNuevoBuscado()"><i class="fas fa-plus"></i> Agregar persona buscada</button>
      <div id="buscado-form"></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.buscados.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <div>
              <strong>${p.nombre}</strong> <span class="badge badge-${p.estado === 'Capturado' ? 'success' : 'danger'}">${p.estado}</span>
              <div style="font-size:12px;color:var(--text-muted);">${p.rut} · ${p.delito}</div>
            </div>
            ${p.estado === 'Prófugo' ? `<button class="btn btn-sm btn-primary" onclick="AupolUI.capturar('${p._id}')">Marcar capturado</button>` : ''}
          </div>
        `).join('') || '<p style="color:var(--text-muted);">No hay personas buscadas.</p>'}
      </div>
    `;
  },

  formNuevoBuscado() {
    document.getElementById('buscado-form').innerHTML = `
      <div class="card" style="margin-bottom:14px;">
        <div class="form-group"><label>Nombre</label><input class="form-control" id="busc-nombre"></div>
        <div class="form-group"><label>RUT (si se conoce)</label><input class="form-control" id="busc-rut" placeholder="Desconocido"></div>
        <div class="form-group"><label>Delito</label><input class="form-control" id="busc-delito"></div>
        <div class="form-group"><label>Descripción</label><textarea class="form-control" id="busc-desc" rows="2"></textarea></div>
        <button class="btn btn-primary" onclick="AupolUI.crearBuscado()">Guardar</button>
      </div>
    `;
  },

  async crearBuscado() {
    const nombre = document.getElementById('busc-nombre').value.trim();
    const rut = document.getElementById('busc-rut').value.trim();
    const delito = document.getElementById('busc-delito').value.trim();
    const descripcion = document.getElementById('busc-desc').value.trim();
    if (!nombre || !delito) return;
    try {
      await API.createPersonaBuscada({ nombre, rut, delito, descripcion });
      document.getElementById('buscado-form').innerHTML = '';
      await this.cargarBuscados();
      this.render();
    } catch (e) {
      App.showAlertMsg(e.message || 'No se pudo registrar', 'danger');
    }
  },

  async capturar(id) {
    try {
      await API.capturarPersona(id);
      await this.cargarBuscados();
      this.render();
    } catch (e) {
      App.showAlertMsg(e.message || 'No se pudo actualizar', 'danger');
    }
  },

  // ===== VEHÍCULOS =====
  renderVehiculos() {
    return `
      <div style="display:flex;gap:10px;margin-bottom:16px;">
        <input class="form-control" id="veh-buscar" placeholder="Patente, marca o modelo...">
        <button class="btn btn-primary" onclick="AupolUI.buscarVehiculo()"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.vehiculosResultado.map(v => `
          <div style="background:var(--bg-input);border-radius:var(--radius);padding:12px 16px;">
            <strong>${v.patente}</strong> — ${v.marca} ${v.modelo} ${v.año || ''}
            <div style="font-size:12px;color:var(--text-muted);">Dueño: ${v.duenio || '—'} (${v.rutDuenio || 's/rut'}) · Estado: ${v.estado}</div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">Busca por patente, marca o modelo.</p>'}
      </div>
    `;
  },

  async buscarVehiculo() {
    const q = document.getElementById('veh-buscar').value.trim();
    if (!q) return;
    try { this.vehiculosResultado = await API.searchVehiculos(q); } catch (e) { this.vehiculosResultado = []; }
    this.render();
  },

  // ===== BIENES =====
  async cargarBienes() {
    try { this.bienes = await API.getBienes('', 'Carabineros'); } catch (e) { this.bienes = []; }
  },

  renderBienes() {
    return `
      <div style="max-width:480px;margin-bottom:20px;">
        <div class="form-group">
          <label>Tipo de Bien</label>
          <select class="form-control" id="bien-tipo">
            <option value="Inmueble">Inmueble</option>
            <option value="Vehículo">Vehículo</option>
            <option value="Arma">Arma</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Descripción</label><input class="form-control" id="bien-desc" placeholder="Descripción del bien"></div>
        <div class="form-group"><label>Propietario (nombre)</label><input class="form-control" id="bien-duenio" placeholder="Nombre del propietario"></div>
        <div class="form-group"><label>RUT del propietario</label><input class="form-control" id="bien-rut" placeholder="12.345.678-9"></div>
        <button class="btn btn-primary btn-block" onclick="AupolUI.crearBien()"><i class="fas fa-save"></i> Registrar Bien</button>
        <div id="bien-result" style="margin-top:12px;"></div>
      </div>
      <h4 style="margin-bottom:8px;">Bienes registrados (${this.bienes.length})</h4>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.bienes.map(b => `
          <div style="background:var(--bg-input);border-radius:var(--radius);padding:10px 14px;">
            <strong>${b.tipo}</strong> — ${b.descripcion}
            <div style="font-size:12px;color:var(--text-muted);">Propietario: ${b.duenio || '—'} (${b.rutDuenio})</div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">Sin bienes registrados.</p>'}
      </div>
    `;
  },

  async crearBien() {
    const tipo = document.getElementById('bien-tipo').value;
    const descripcion = document.getElementById('bien-desc').value.trim();
    const duenio = document.getElementById('bien-duenio').value.trim();
    const rutDuenio = document.getElementById('bien-rut').value.trim();
    const result = document.getElementById('bien-result');
    if (!descripcion || !rutDuenio) { result.innerHTML = App.showAlert('Descripción y RUT del propietario son obligatorios', 'danger'); return; }
    try {
      await API.createBien({ tipo, descripcion, duenio, rutDuenio, institucion: 'Carabineros' });
      result.innerHTML = App.showAlert('Bien registrado', 'success');
      ['bien-desc', 'bien-duenio', 'bien-rut'].forEach(id => document.getElementById(id).value = '');
      await this.cargarBienes();
      this.render();
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo registrar', 'danger');
    }
  },

  // ===== INCAUTADO =====
  async cargarIncautaciones() {
    try { this.incautaciones = await API.getIncautaciones('Carabineros'); } catch (e) { this.incautaciones = []; }
  },

  renderIncautado() {
    return `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h4 style="margin:0;">Incautar del inventario de un ciudadano</h4></div>
        <div style="display:flex;gap:10px;margin:12px 0;">
          <input class="form-control" id="inv-rut" placeholder="RUT del ciudadano (ej: 12.345.678-9)" onkeydown="if(event.key==='Enter')AupolUI.buscarInventario()">
          <button class="btn btn-primary" onclick="AupolUI.buscarInventario()"><i class="fas fa-search"></i> Buscar inventario</button>
        </div>
        <div id="inv-resultado">${this.renderInventarioCiudadano()}</div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h4 style="margin:0;">Registrar incautación manual</h4></div>
        <p style="color:var(--text-muted);font-size:13px;margin:6px 0 14px;">Para cosas que no están en el inventario del sistema (dinero en efectivo, drogas, etc).</p>
        <div style="max-width:480px;">
          <div class="form-group">
            <label>Tipo</label>
            <select class="form-control" id="inca-tipo">
              <option value="Vehículo">Vehículo</option>
              <option value="Arma">Arma</option>
              <option value="Objeto">Objeto</option>
              <option value="Dinero">Dinero</option>
              <option value="Drogas">Drogas</option>
            </select>
          </div>
          <div class="form-group"><label>Descripción</label><input class="form-control" id="inca-desc" placeholder="Descripción"></div>
          <div class="form-group"><label>N° Serie / Patente</label><input class="form-control" id="inca-serie" placeholder="Opcional"></div>
          <div class="form-group"><label>Procedencia</label><input class="form-control" id="inca-proc" placeholder="Lugar de incautación"></div>
          <button class="btn btn-primary btn-block" onclick="AupolUI.crearIncautacion()"><i class="fas fa-box"></i> Registrar Incautación</button>
          <div id="inca-result" style="margin-top:12px;"></div>
        </div>
      </div>

      <h4 style="margin-bottom:8px;">Registro de incautaciones (${this.incautaciones.length})</h4>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.incautaciones.map(i => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:10px 14px;">
            <div>
              <span class="badge badge-warning">${i.tipo}</span> ${i.descripcion}
              <div style="font-size:12px;color:var(--text-muted);">${i.serie ? 'Serie/Patente: ' + i.serie + ' · ' : ''}${i.procedencia || 'sin procedencia'} · ${i.fecha}</div>
            </div>
            <select class="form-control" style="width:auto;" onchange="AupolUI.cambiarEstadoIncautacion('${i._id}', this.value)">
              <option value="En custodia" ${i.estado === 'En custodia' ? 'selected' : ''}>En custodia</option>
              <option value="Devuelto" ${i.estado === 'Devuelto' ? 'selected' : ''}>Devuelto</option>
              <option value="Destruido" ${i.estado === 'Destruido' ? 'selected' : ''}>Destruido</option>
            </select>
          </div>
        `).join('') || '<p style="color:var(--text-muted);">Sin incautaciones registradas.</p>'}
      </div>
    `;
  },

  renderInventarioCiudadano() {
    if (!this.inventarioCiudadano) return '<p style="color:var(--text-muted);">Busca un RUT para ver qué tiene en su inventario.</p>';
    if (this.inventarioCiudadano.length === 0) return '<p style="color:var(--text-muted);">Este ciudadano no tiene ítems en su inventario.</p>';
    return `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${this.inventarioCiudadano.map(item => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:10px 14px;">
            <div><strong>${item.nombre}</strong> <span style="color:var(--text-muted);font-size:12px;">${item.categoria || ''} · x${item.cantidad}</span></div>
            <button class="btn btn-sm btn-danger" onclick="AupolUI.incautarItem('${item.itemId}')"><i class="fas fa-hand-paper"></i> Incautar</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async buscarInventario() {
    const rut = document.getElementById('inv-rut').value.trim();
    const cont = document.getElementById('inv-resultado');
    if (!rut) return;
    this.inventarioRut = rut;
    cont.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Buscando...</p>';
    try {
      const data = await API.consultaSNSM(rut);
      this.inventarioCiudadano = data.inventario || [];
    } catch (e) {
      this.inventarioCiudadano = null;
      cont.innerHTML = App.showAlert(e.message || 'Ciudadano no encontrado', 'danger');
      return;
    }
    cont.innerHTML = this.renderInventarioCiudadano();
  },

  async incautarItem(itemId) {
    const cont = document.getElementById('inv-resultado');
    try {
      await API.incautarDesdeInventario(this.inventarioRut, itemId, `Inventario de ${this.inventarioRut}`);
      App.showAlertMsg('Ítem incautado y sacado del inventario', 'success');
      await this.buscarInventario();
      await this.cargarIncautaciones();
      this.render();
    } catch (e) {
      cont.innerHTML = App.showAlert(e.message || 'No se pudo incautar', 'danger');
    }
  },

  async crearIncautacion() {
    const tipo = document.getElementById('inca-tipo').value;
    const descripcion = document.getElementById('inca-desc').value.trim();
    const serie = document.getElementById('inca-serie').value.trim();
    const procedencia = document.getElementById('inca-proc').value.trim();
    const result = document.getElementById('inca-result');
    if (!descripcion) { result.innerHTML = App.showAlert('La descripción es obligatoria', 'danger'); return; }
    try {
      await API.createIncautacion({ tipo, descripcion, serie, procedencia, institucion: 'Carabineros' });
      result.innerHTML = App.showAlert('Incautación registrada', 'success');
      ['inca-desc', 'inca-serie', 'inca-proc'].forEach(id => document.getElementById(id).value = '');
      await this.cargarIncautaciones();
      this.render();
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo registrar', 'danger');
    }
  },

  async cambiarEstadoIncautacion(id, estado) {
    try {
      await API.updateIncautacionEstado(id, estado);
      await this.cargarIncautaciones();
    } catch (e) {
      App.showAlertMsg(e.message || 'No se pudo actualizar', 'danger');
    }
  }
};

async function renderAUPOL() {
  return `
    <div class="card">
      <div class="card-header"><h3><i class="fas fa-search"></i> AUPOL — Sistema de Consultas Policiales</h3></div>
      <div class="chip-filtros" style="margin-top:10px;">
        <button class="chip aupol-tab active" data-tab="consulta" onclick="AupolUI.cargarTab('consulta')"><i class="fas fa-id-card"></i> Consulta Ciudadana</button>
        <button class="chip aupol-tab" data-tab="antecedente" onclick="AupolUI.cargarTab('antecedente')"><i class="fas fa-file-alt"></i> Registrar Antecedente</button>
        <button class="chip aupol-tab" data-tab="multa" onclick="AupolUI.cargarTab('multa')"><i class="fas fa-ticket-alt"></i> Cursar Multa</button>
        <button class="chip aupol-tab" data-tab="bienes" onclick="AupolUI.cargarTab('bienes')"><i class="fas fa-home"></i> Registro de Bienes</button>
        <button class="chip aupol-tab" data-tab="incautado" onclick="AupolUI.cargarTab('incautado')"><i class="fas fa-box"></i> Incautado</button>
        <button class="chip aupol-tab" data-tab="buscados" onclick="AupolUI.cargarTab('buscados')"><i class="fas fa-user-secret"></i> Personas Buscadas</button>
        <button class="chip aupol-tab" data-tab="vehiculos" onclick="AupolUI.cargarTab('vehiculos')"><i class="fas fa-car"></i> Vehículos</button>
      </div>
    </div>
    <div class="card">
      <div id="aupol-tab-content">${AupolUI.renderConsulta()}</div>
    </div>
  `;
}