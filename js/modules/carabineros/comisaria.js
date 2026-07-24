function renderComisaria() {
  const tiposDenuncia = [
    'Robo en lugar habitado', 'Robo con intimidación', 'Robo por sorpresa',
    'Hurto', 'Amenazas', 'Violencia Intrafamiliar', 'Lesiones',
    'Daños a la propiedad', 'Estafa', 'Violación de domicilio',
    'Desórdenes públicos', 'Consumo de alcohol en vía pública',
    'Tenencia de drogas', 'Tráfico de drogas', 'Otros'
  ];
  const secciones = [
    'Datos del Denunciante', 'Datos del Hecho', 'Datos del Imputado',
    'Testigos', 'Evidencias', 'Revisión y Envío'
  ];

  setTimeout(() => cargarEmergenciasVivo(), 0);
  if (window._emergenciasInterval) clearInterval(window._emergenciasInterval);
  window._emergenciasInterval = setInterval(cargarEmergenciasVivo, 10000);

  return `
    <div class="card" id="comisaria-emergencias">
      <div class="card-header">
        <h3><i class="fas fa-phone" style="color:var(--danger);"></i> Emergencias 911 (en vivo)</h3>
        <span class="badge badge-danger" id="emergencias-badge">0 pendientes</span>
      </div>
      <div id="comisaria-emergencias-lista"><p style="color:var(--text-muted);">Cargando...</p></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-building"></i> Comisaría Virtual - Carabineros de Santiago Prime</h3>
        <span class="badge badge-info">Denuncias activas: ${DB.denuncias.filter(d => d.institucion === 'Carabineros' && d.estado !== 'Cerrada').length}</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:16px;">Complete los siguientes formularios para crear una denuncia. Las secciones marcadas con * son obligatorias.</p>
    </div>

    <div id="comisaria-denuncias" class="card">
      <div class="card-header">
        <h3>Denuncias Registradas</h3>
        <button class="btn btn-primary" onclick="comisariaNuevaDenuncia()"><i class="fas fa-plus"></i> Nueva Denuncia</button>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${DB.denuncias.filter(d => d.institucion === 'Carabineros').map(d => `
            <tr>
              <td>#${d.id}</td>
              <td>${d.tipo}</td>
              <td>${d.fecha}</td>
              <td><span class="badge badge-${d.estado === 'Cerrada' ? 'success' : d.estado === 'En Investigación' ? 'info' : 'warning'}">${d.estado}</span></td>
              <td><button class="btn btn-sm btn-info" onclick="verDenuncia(${d.id})"><i class="fas fa-eye"></i></button></td>
            </tr>
          `).join('')}
          ${DB.denuncias.filter(d => d.institucion === 'Carabineros').length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No hay denuncias registradas</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div id="comisaria-form" class="card hidden">
      <div class="card-header"><h3>Nueva Denuncia</h3></div>
      <div class="tabs" id="denuncia-tabs">
        ${secciones.map((s, i) => `<div class="tab ${i === 0 ? 'active' : ''}" data-tab="denuncia-sec-${i}" onclick="denunciaTab(${i})">${i + 1}. ${s}</div>`).join('')}
      </div>

      <div id="denuncia-sec-0" class="tab-content active">
        <h4 style="margin-bottom:12px;">Datos del Denunciante</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input class="form-control" id="den-nombre" placeholder="Nombre del denunciante">
          </div>
          <div class="form-group">
            <label>RUT *</label>
            <input class="form-control" id="den-rut" placeholder="12.345.678-9">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Teléfono</label>
            <input class="form-control" id="den-telefono" placeholder="+56 9 XXXX XXXX">
          </div>
          <div class="form-group">
            <label>Dirección</label>
            <input class="form-control" id="den-direccion" placeholder="Dirección del denunciante">
          </div>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="den-anonimo"> Denuncia Anónima</label>
        </div>
      </div>

      <div id="denuncia-sec-1" class="tab-content">
        <h4 style="margin-bottom:12px;">Datos del Hecho</h4>
        <div class="form-group">
          <label>Tipo de Delito *</label>
          <select class="form-control" id="den-tipo">
            <option value="">Seleccione un tipo</option>
            ${tiposDenuncia.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Descripción Detallada *</label>
          <textarea class="form-control" id="den-descripcion" rows="5" placeholder="Describa los hechos en detalle"></textarea>
        </div>
        <div class="form-group">
          <label>Dirección del Hecho *</label>
          <input class="form-control" id="den-direccion-hecho" placeholder="Calle, número, comuna">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Fecha del Hecho</label>
            <input class="form-control" id="den-fecha" type="date">
          </div>
          <div class="form-group">
            <label>Hora Aproximada</label>
            <input class="form-control" id="den-hora" type="time">
          </div>
        </div>
      </div>

      <div id="denuncia-sec-2" class="tab-content">
        <h4 style="margin-bottom:12px;">Datos del Imputado (si se conoce)</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input class="form-control" id="den-imp-nombre" placeholder="Nombre del imputado">
          </div>
          <div class="form-group">
            <label>RUT</label>
            <input class="form-control" id="den-imp-rut" placeholder="RUT del imputado">
          </div>
        </div>
        <div class="form-group">
          <label>Descripción Física</label>
          <textarea class="form-control" id="den-imp-desc" rows="3" placeholder="Altura, complexión, vestimenta, características"></textarea>
        </div>
        <div class="form-group">
          <label>Última Ubicación Conocida</label>
          <input class="form-control" id="den-imp-ubicacion" placeholder="Lugar donde fue visto">
        </div>
      </div>

      <div id="denuncia-sec-3" class="tab-content">
        <h4 style="margin-bottom:12px;">Testigos</h4>
        <div class="form-group">
          <label>¿Hay testigos?</label>
          <select class="form-control" id="den-testigos-tiene">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nombres de Testigos</label>
          <textarea class="form-control" id="den-testigos-nombres" rows="3" placeholder="Nombre, RUT y contacto de cada testigo"></textarea>
        </div>
      </div>

      <div id="denuncia-sec-4" class="tab-content">
        <h4 style="margin-bottom:12px;">Evidencias</h4>
        <div class="form-group">
          <label>¿Qué evidencias tiene?</label>
          <textarea class="form-control" id="den-evidencias" rows="4" placeholder="Describa las evidencias: fotos, videos, documentos, objetos, etc."></textarea>
        </div>
      </div>

      <div id="denuncia-sec-5" class="tab-content">
        <h4 style="margin-bottom:12px;">Revisión y Envío</h4>
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> Revise que todos los datos ingresados sean correctos antes de enviar.
        </div>
        <p style="margin-bottom:16px;">Al enviar esta denuncia, usted declara bajo juramento que los hechos descritos son verdaderos.</p>
        <button class="btn btn-primary btn-block" onclick="enviarDenunciaCarabineros()"><i class="fas fa-paper-plane"></i> Enviar Denuncia</button>
      </div>

      <div id="comisaria-form-result" style="margin-top:12px;"></div>
    </div>
  `;
}

function denunciaTab(idx) {
  document.querySelectorAll('#denuncia-tabs .tab').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('[id^="denuncia-sec-"]').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
}

function comisariaNuevaDenuncia() {
  document.getElementById('comisaria-form').classList.remove('hidden');
  document.getElementById('comisaria-form').scrollIntoView({ behavior: 'smooth' });
}

async function enviarDenunciaCarabineros() {
  const nombre = document.getElementById('den-nombre').value || 'Anónimo';
  const anonimo = document.getElementById('den-anonimo').checked;
  const tipo = document.getElementById('den-tipo').value;
  const desc = document.getElementById('den-descripcion').value;
  const dir = document.getElementById('den-direccion-hecho').value;

  if (!tipo || !desc || !dir) {
    document.getElementById('comisaria-form-result').innerHTML = App.showAlert('Complete los campos obligatorios (Tipo, Descripción, Dirección del hecho)', 'danger');
    return;
  }

  const impNombre = document.getElementById('den-imp-nombre').value;
  const impRut = document.getElementById('den-imp-rut').value;
  const impDesc = document.getElementById('den-imp-desc').value;
  const testigos = document.getElementById('den-testigos-nombres').value;
  const evidencias = document.getElementById('den-evidencias').value;

  await API.createDenuncia({
    tipo, descripcion: desc, direccion: dir, anonimo,
    institucion: 'Carabineros',
    impNombre, impRut, impDesc, testigos, evidencias
  });

  document.getElementById('comisaria-form-result').innerHTML = App.showAlert('Denuncia creada exitosamente', 'success');
  document.getElementById('comisaria-form').classList.add('hidden');

  await API.ganarExp(50);
  await API.loadAll();
  App.navigate('carabineros-comisaria');
}

function verDenuncia(id) {
  const d = DB.denuncias.find(x => x.id === id);
  if (!d) return;
  App.showModal(`Denuncia #${d.id}`, `
    <p><strong>Tipo:</strong> ${d.tipo}</p>
    <p><strong>Descripción:</strong> ${d.descripcion}</p>
    <p><strong>Dirección:</strong> ${d.direccion}</p>
    <p><strong>Fecha:</strong> ${d.fecha}</p>
    <p><strong>Estado:</strong> ${d.estado}</p>
    <p><strong>Denunciante:</strong> ${d.ciudadano} ${d.anonimo ? '<span class="badge badge-warning">Anónimo</span>' : ''}</p>
    <p><strong>Institución:</strong> ${d.institucion}</p>
  `);
}

async function cargarEmergenciasVivo() {
  const cont = document.getElementById('comisaria-emergencias-lista');
  if (!cont) { clearInterval(window._emergenciasInterval); return; }
  try {
    const emergencias = await API.getEmergencias('Pendiente');
    const badge = document.getElementById('emergencias-badge');
    if (badge) badge.textContent = `${emergencias.length} pendientes`;
    cont.innerHTML = emergencias.length ? emergencias.map(e => `
      <div style="background:var(--bg-input);border-left:3px solid var(--danger);border-radius:var(--radius);padding:12px 16px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;">
          <strong>${e.nombreReportante}</strong>
          <span style="font-size:11px;color:var(--text-muted);">${new Date(e.fecha).toLocaleTimeString('es-CL')}</span>
        </div>
        <p style="font-size:13px;margin:6px 0;">${e.descripcion}</p>
        ${e.ubicacion ? `<p style="font-size:12px;color:var(--text-muted);"><i class="fas fa-map-marker-alt"></i> ${e.ubicacion}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-sm btn-success" onclick="atenderEmergenciaVivo('${e._id}')"><i class="fas fa-check"></i> Atender</button>
          <button class="btn btn-sm btn-outline" onclick="descartarEmergenciaVivo('${e._id}')"><i class="fas fa-times"></i> Descartar</button>
        </div>
      </div>
    `).join('') : '<p style="color:var(--text-muted);">No hay emergencias pendientes.</p>';
  } catch (e) {
    cont.innerHTML = '<p style="color:var(--danger);">No se pudieron cargar las emergencias.</p>';
  }
}

async function atenderEmergenciaVivo(id) {
  try { await API.atenderEmergencia(id); await cargarEmergenciasVivo(); } catch (e) { alert(e.message); }
}

async function descartarEmergenciaVivo(id) {
  try { await API.descartarEmergencia(id); await cargarEmergenciasVivo(); } catch (e) { alert(e.message); }
}
