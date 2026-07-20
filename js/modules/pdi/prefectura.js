function renderPrefectura() {
  const tiposDenuncia = [
    'Homicidio', 'Secuestro', 'Tráfico de drogas', 'Lavado de activos',
    'Delitos económicos', 'Corrupción', 'Ciberdelitos', 'Trata de personas',
    'Delitos sexuales', 'Organización criminal', 'Fraude', 'Otros'
  ];
  const secciones = [
    'Datos del Denunciante', 'Datos del Hecho', 'Datos del Imputado',
    'Testigos', 'Evidencias', 'Revisión y Envío'
  ];

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-building"></i> Prefectura Virtual - PDI</h3>
        <span class="badge badge-info">Casos activos: ${DB.denuncias.filter(d => d.institucion === 'PDI' && d.estado !== 'Cerrada').length}</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:16px;">Policía de Investigaciones de Chile - Sistema de Denuncias</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Personas Buscadas</h3></div>
        <table>
          <thead><tr><th>Nombre</th><th>Delito</th><th>Estado</th></tr></thead>
          <tbody>
            ${DB.personasBuscadas.map(p => `<tr>
              <td>${p.nombre}</td><td>${p.delito}</td>
              <td><span class="badge ${p.estado === 'Capturado' ? 'badge-success' : 'badge-danger'}">${p.estado}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header"><h3>Agregar Persona Buscada</h3></div>
        <form onsubmit="event.preventDefault();agregarPersonaBuscada()">
          <div class="form-group">
            <label>Nombre *</label>
            <input class="form-control" id="pb-nombre" placeholder="Nombre completo" required>
          </div>
          <div class="form-group">
            <label>RUT</label>
            <input class="form-control" id="pb-rut" placeholder="RUT">
          </div>
          <div class="form-group">
            <label>Delito *</label>
            <input class="form-control" id="pb-delito" placeholder="Delito que se imputa" required>
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea class="form-control" id="pb-desc" rows="2" placeholder="Características físicas"></textarea>
          </div>
          <button type="submit" class="btn btn-danger btn-block"><i class="fas fa-user-plus"></i> Agregar a Buscados</button>
        </form>
        <div id="pb-result"></div>
      </div>
    </div>

    <div id="pdi-denuncias" class="card">
      <div class="card-header">
        <h3>Denuncias PDI</h3>
        <button class="btn btn-primary" onclick="pdiNuevaDenuncia()"><i class="fas fa-plus"></i> Nueva Denuncia</button>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Anónima</th></tr></thead>
        <tbody>
          ${DB.denuncias.filter(d => d.institucion === 'PDI').map(d => `
            <tr>
              <td>#${d.id}</td><td>${d.tipo}</td><td>${d.fecha}</td>
              <td><span class="badge badge-${d.estado === 'Cerrada' ? 'success' : d.estado === 'En Investigación' ? 'info' : 'warning'}">${d.estado}</span></td>
              <td>${d.anonimo ? '<span class="badge badge-warning">Sí</span>' : '<span class="badge badge-success">No</span>'}</td>
            </tr>
          `).join('')}
          ${DB.denuncias.filter(d => d.institucion === 'PDI').length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No hay denuncias registradas</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div id="pdi-form" class="card hidden">
      <div class="card-header"><h3>Nueva Denuncia PDI</h3></div>
      <div class="tabs" id="pdi-denuncia-tabs">
        ${secciones.map((s, i) => `<div class="tab ${i === 0 ? 'active' : ''}" data-tab="pdi-sec-${i}" onclick="pdiDenunciaTab(${i})">${i + 1}. ${s}</div>`).join('')}
      </div>

      <div id="pdi-sec-0" class="tab-content active">
        <h4 style="margin-bottom:12px;">Datos del Denunciante</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input class="form-control" id="pdi-den-nombre" placeholder="Nombre del denunciante">
          </div>
          <div class="form-group">
            <label>RUT</label>
            <input class="form-control" id="pdi-den-rut" placeholder="12.345.678-9">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Teléfono</label>
            <input class="form-control" id="pdi-den-tel" placeholder="+56 9 XXXX XXXX">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input class="form-control" id="pdi-den-email" type="email" placeholder="correo@ejemplo.com">
          </div>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="pdi-den-anonimo"> Denuncia Anónima</label>
        </div>
      </div>

      <div id="pdi-sec-1" class="tab-content">
        <h4 style="margin-bottom:12px;">Datos del Hecho</h4>
        <div class="form-group">
          <label>Tipo de Delito *</label>
          <select class="form-control" id="pdi-den-tipo">
            <option value="">Seleccione un tipo</option>
            ${tiposDenuncia.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Descripción Detallada *</label>
          <textarea class="form-control" id="pdi-den-desc" rows="5" placeholder="Describa los hechos en detalle"></textarea>
        </div>
        <div class="form-group">
          <label>Dirección del Hecho *</label>
          <input class="form-control" id="pdi-den-dir" placeholder="Calle, número, comuna">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Fecha</label>
            <input class="form-control" id="pdi-den-fecha" type="date">
          </div>
          <div class="form-group">
            <label>Hora</label>
            <input class="form-control" id="pdi-den-hora" type="time">
          </div>
        </div>
      </div>

      <div id="pdi-sec-2" class="tab-content">
        <h4 style="margin-bottom:12px;">Datos del Imputado</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input class="form-control" id="pdi-imp-nombre" placeholder="Nombre del imputado">
          </div>
          <div class="form-group">
            <label>RUT</label>
            <input class="form-control" id="pdi-imp-rut" placeholder="RUT del imputado">
          </div>
        </div>
        <div class="form-group">
          <label>Descripción Física</label>
          <textarea class="form-control" id="pdi-imp-desc" rows="3" placeholder="Características"></textarea>
        </div>
      </div>

      <div id="pdi-sec-3" class="tab-content">
        <h4 style="margin-bottom:12px;">Testigos</h4>
        <div class="form-group">
          <label>Información de Testigos</label>
          <textarea class="form-control" id="pdi-testigos" rows="3" placeholder="Nombre, RUT y contacto de testigos"></textarea>
        </div>
      </div>

      <div id="pdi-sec-4" class="tab-content">
        <h4 style="margin-bottom:12px;">Evidencias</h4>
        <div class="form-group">
          <label>Evidencias Disponibles</label>
          <textarea class="form-control" id="pdi-evidencias" rows="4" placeholder="Describa las evidencias (fotos, videos, documentos, etc.)"></textarea>
        </div>
      </div>

      <div id="pdi-sec-5" class="tab-content">
        <h4 style="margin-bottom:12px;">Revisión y Envío</h4>
        <div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Revise que todos los datos sean correctos antes de enviar.</div>
        <button class="btn btn-primary btn-block" onclick="enviarDenunciaPDI()"><i class="fas fa-paper-plane"></i> Enviar Denuncia</button>
      </div>
      <div id="pdi-form-result" style="margin-top:12px;"></div>
    </div>
  `;
}

function pdiDenunciaTab(idx) {
  document.querySelectorAll('#pdi-denuncia-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('[id^="pdi-sec-"]').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function pdiNuevaDenuncia() {
  document.getElementById('pdi-form').classList.remove('hidden');
  document.getElementById('pdi-form').scrollIntoView({ behavior: 'smooth' });
}

async function enviarDenunciaPDI() {
  const anonimo = document.getElementById('pdi-den-anonimo').checked;
  const tipo = document.getElementById('pdi-den-tipo').value;
  const desc = document.getElementById('pdi-den-desc').value;
  const dir = document.getElementById('pdi-den-dir').value;

  if (!tipo || !desc || !dir) {
    document.getElementById('pdi-form-result').innerHTML = App.showAlert('Complete los campos obligatorios', 'danger');
    return;
  }

  const impNombre = document.getElementById('pdi-imp-nombre').value;
  const impRut = document.getElementById('pdi-imp-rut').value;
  const impDesc = document.getElementById('pdi-imp-desc').value;
  const testigos = document.getElementById('pdi-testigos').value;
  const evidencias = document.getElementById('pdi-evidencias').value;

  await API.createDenuncia({
    tipo, descripcion: desc, direccion: dir, anonimo,
    institucion: 'PDI',
    impNombre, impRut, impDesc, testigos, evidencias
  });

  document.getElementById('pdi-form-result').innerHTML = App.showAlert('Denuncia creada exitosamente', 'success');
  document.getElementById('pdi-form').classList.add('hidden');

  await API.ganarExp(50);
  await API.loadAll();
  App.navigate('pdi-prefectura');
}

async function agregarPersonaBuscada() {
  const nombre = document.getElementById('pb-nombre').value.trim();
  const delito = document.getElementById('pb-delito').value.trim();
  if (!nombre || !delito) { document.getElementById('pb-result').innerHTML = App.showAlert('Complete nombre y delito', 'danger'); return; }
  const rut = document.getElementById('pb-rut').value.trim() || 'Desconocido';
  const descripcion = document.getElementById('pb-desc').value.trim();

  await API.createPersonaBuscada({ nombre, rut, delito, descripcion });

  document.getElementById('pb-result').innerHTML = App.showAlert(`${nombre} agregado a personas buscadas`, 'success');
  document.querySelectorAll('#pb-nombre, #pb-rut, #pb-delito, #pb-desc').forEach(el => el.value = '');
}
