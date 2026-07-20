var hospitalPacientes = [];
var hospitalLoading = false;

async function hospitalCargarPacientes() {
  if (hospitalLoading) return;
  hospitalLoading = true;
  try {
    hospitalPacientes = await API.getPacientes();
  } catch (err) {
    console.error('Error cargando pacientes:', err);
    hospitalPacientes = [];
  }
  hospitalLoading = false;
}

function hospitalGravedadBadge(g) {
  if (g === 'Grave') return 'danger';
  if (g === 'Moderada') return 'warning';
  return 'success';
}

function hospitalEstadoBadge(e) {
  if (e === 'En cirugía' || e === 'Dado de alta') return 'danger';
  if (e === 'En tratamiento') return 'warning';
  return 'info';
}

async function renderHospitalAtencion() {
  await hospitalCargarPacientes();
  var activos = hospitalPacientes.filter(function(p) { return p.estado !== 'Dado de alta'; });

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-hospital"></i> Atención Médica - Hospital Central</h3>
        <span class="badge badge-info">Pacientes activos: ${activos.length}</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-procedures"></i> Pacientes en Atención</h3></div>
        <table>
          <thead><tr><th>Paciente</th><th>Motivo</th><th>Gravedad</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${activos.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No hay pacientes activos</td></tr>' : ''}
            ${activos.map(function(p) {
              return `
                <tr>
                  <td><strong>${p.nombre}</strong><br><small style="color:var(--text-muted);">${p.rut || '—'}</small></td>
                  <td>${p.motivo}</td>
                  <td><span class="badge badge-${hospitalGravedadBadge(p.gravedad)}">${p.gravedad}</span></td>
                  <td><span class="badge badge-${hospitalEstadoBadge(p.estado)}">${p.estado}</span></td>
                  <td>
                    <button class="btn btn-sm btn-info" onclick="hospitalVerPaciente('${p._id}')" title="Ver"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="hospitalEditarPaciente('${p._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-success" onclick="hospitalDarAlta('${p._id}','${p.nombre.replace(/'/g, "\\'")}')" title="Dar de alta"><i class="fas fa-check-circle"></i></button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-user-plus"></i> Nuevo Ingreso</h3></div>
        <form onsubmit="event.preventDefault();hospitalIngresarPaciente()">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del Paciente *</label>
              <input class="form-control" id="hosp-nombre" placeholder="Nombre completo" required>
            </div>
            <div class="form-group">
              <label>RUT</label>
              <input class="form-control" id="hosp-rut" placeholder="12.345.678-9">
            </div>
          </div>
          <div class="form-group">
            <label>Motivo de Ingreso *</label>
            <select class="form-control" id="hosp-motivo">
              <option value="Herida de bala">Herida de bala</option>
              <option value="Accidente vehicular">Accidente vehicular</option>
              <option value="Fractura">Fractura</option>
              <option value="Intoxicación">Intoxicación</option>
              <option value="Quemaduras">Quemaduras</option>
              <option value="Ataque cardíaco">Ataque cardíaco</option>
              <option value="Traumatismo">Traumatismo craneoencefálico</option>
              <option value="Herida cortante">Herida cortante</option>
              <option value="Sobredosis">Sobredosis</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label>Gravedad *</label>
            <select class="form-control" id="hosp-gravedad">
              <option value="Leve">Leve - Observación</option>
              <option value="Moderada">Moderada - Tratamiento</option>
              <option value="Grave">Grave - Emergencia</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Grupo Sanguíneo</label>
              <input class="form-control" id="hosp-sangre" placeholder="O+, A-, B+, etc.">
            </div>
            <div class="form-group">
              <label>Alergias</label>
              <input class="form-control" id="hosp-alergias" placeholder="Penicilina, Sulfa...">
            </div>
          </div>
          <div class="form-group">
            <label>Notas Médicas</label>
            <textarea class="form-control" id="hosp-notas" rows="3" placeholder="Observaciones, signos vitales, medicación..."></textarea>
          </div>
          <button type="submit" class="btn btn-danger btn-block"><i class="fas fa-ambulance"></i> Registrar Ingreso</button>
        </form>
        <div id="hosp-result"></div>
      </div>
    </div>
  `;
}

async function hospitalIngresarPaciente() {
  var nombre = document.getElementById('hosp-nombre').value.trim();
  var rut = document.getElementById('hosp-rut').value.trim();
  var motivo = document.getElementById('hosp-motivo').value;
  var gravedad = document.getElementById('hosp-gravedad').value;
  var notas = document.getElementById('hosp-notas').value.trim();
  var sangre = document.getElementById('hosp-sangre').value.trim();
  var alergias = document.getElementById('hosp-alergias').value.trim();
  var result = document.getElementById('hosp-result');

  if (!nombre) { result.innerHTML = App.showAlert('Complete el nombre del paciente', 'danger'); return; }

  try {
    await API.createPaciente({ nombre, rut, motivo, gravedad, notas, grupoSanguineo: sangre, alergias, medicoAsignado: Auth.currentUser ? Auth.currentUser.nombre : '' });
    result.innerHTML = App.showAlert('Paciente ' + nombre + ' ingresado por ' + motivo + '. ¡Médico notificado!', 'success');
    hospitalPacientes = [];
    hospitalLoading = false;
    App.navigate('hospital-atencion');
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function hospitalVerPaciente(id) {
  try {
    var p = await API.getPaciente(id);
    if (!p) return;
    var visitasHTML = (p.historialVisitas && p.historialVisitas.length > 0)
      ? '<h4 style="margin-bottom:8px;">Historial de Visitas</h4>' +
        '<table><thead><tr><th>Fecha</th><th>Motivo</th><th>Diagnóstico</th><th>Tratamiento</th><th>Médico</th></tr></thead><tbody>' +
        p.historialVisitas.map(function(v) {
          return '<tr><td>' + (v.fecha || '—') + '</td><td>' + (v.motivo || '—') + '</td><td>' + (v.diagnostico || '—') + '</td><td>' + (v.tratamiento || '—') + '</td><td>' + (v.medico || '—') + '</td></tr>';
        }).join('') +
        '</tbody></table>'
      : '<p style="color:var(--text-muted);">Sin historial de visitas registrado.</p>';

    App.showModal(p.nombre + ' - Historia Clínica', `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <i class="fas fa-user-injured" style="font-size:48px;color:var(--danger);"></i>
        <div>
          <h4>${p.nombre}</h4>
          <p style="color:var(--text-muted);font-size:13px;">RUT: ${p.rut || '—'} | Ingreso: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CL') : '—'}</p>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <h4>Datos del Paciente</h4>
        <div class="form-row">
          <p><strong>Motivo:</strong> ${p.motivo}</p>
          <p><strong>Gravedad:</strong> <span class="badge badge-${hospitalGravedadBadge(p.gravedad)}">${p.gravedad}</span></p>
          <p><strong>Estado:</strong> <span class="badge badge-${hospitalEstadoBadge(p.estado)}">${p.estado}</span></p>
        </div>
        <div class="form-row">
          <p><strong>Grupo Sanguíneo:</strong> ${p.grupoSanguineo || '—'}</p>
          <p><strong>Alergias:</strong> ${p.alergias || 'Ninguna'}</p>
          <p><strong>Médico:</strong> ${p.medicoAsignado || '—'}</p>
        </div>
        ${p.peso ? '<p><strong>Peso:</strong> ' + p.peso + '</p>' : ''}
        ${p.altura ? '<p><strong>Altura:</strong> ' + p.altura + '</p>' : ''}
      </div>
      <hr style="border-color:var(--border);margin:12px 0;">
      <p><strong>Notas Médicas:</strong><br>${p.notas || 'Sin notas'}</p>
      <p style="margin-top:8px;"><strong>Medicación:</strong><br>${p.medicacion || 'Sin medicación'}</p>
      <hr style="border-color:var(--border);margin:16px 0;">
      ${visitasHTML}
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-warning btn-sm" onclick="document.getElementById('modal-overlay').classList.add('hidden');hospitalEditarPaciente('${p._id}')"><i class="fas fa-edit"></i> Modificar</button>
        <button class="btn btn-success btn-sm" onclick="document.getElementById('modal-overlay').classList.add('hidden');hospitalAgregarVisita('${p._id}')"><i class="fas fa-plus-circle"></i> Agregar Visita</button>
      </div>
    `);
  } catch (err) {
    App.showAlert('Error al cargar paciente: ' + err.message, 'danger');
  }
}

async function hospitalEditarPaciente(id) {
  try {
    var p = await API.getPaciente(id);
    if (!p) return;
    var content = `
      <div class="card" style="max-width:600px;margin:0 auto;">
        <div class="card-header"><h3><i class="fas fa-edit"></i> Modificar Paciente: ${p.nombre}</h3></div>
        <form onsubmit="event.preventDefault();hospitalGuardarEdicion('${id}')">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre *</label>
              <input class="form-control" id="hosp-edit-nombre" value="${p.nombre}" required>
            </div>
            <div class="form-group">
              <label>RUT</label>
              <input class="form-control" id="hosp-edit-rut" value="${p.rut || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Motivo *</label>
            <select class="form-control" id="hosp-edit-motivo">
              ${['Herida de bala','Accidente vehicular','Fractura','Intoxicación','Quemaduras','Ataque cardíaco','Traumatismo','Herida cortante','Sobredosis','Otro'].map(function(m) {
                return '<option value="' + m + '" ' + (p.motivo === m ? 'selected' : '') + '>' + m + '</option>';
              }).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Gravedad</label>
              <select class="form-control" id="hosp-edit-gravedad">
                <option value="Leve" ${p.gravedad === 'Leve' ? 'selected' : ''}>Leve - Observación</option>
                <option value="Moderada" ${p.gravedad === 'Moderada' ? 'selected' : ''}>Moderada - Tratamiento</option>
                <option value="Grave" ${p.gravedad === 'Grave' ? 'selected' : ''}>Grave - Emergencia</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <input class="form-control" id="hosp-edit-estado" value="${p.estado || ''}" placeholder="En observación, En tratamiento, etc.">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Grupo Sanguíneo</label>
              <input class="form-control" id="hosp-edit-sangre" value="${p.grupoSanguineo || ''}">
            </div>
            <div class="form-group">
              <label>Alergias</label>
              <input class="form-control" id="hosp-edit-alergias" value="${p.alergias || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Peso</label>
              <input class="form-control" id="hosp-edit-peso" value="${p.peso || ''}" placeholder="75 kg">
            </div>
            <div class="form-group">
              <label>Altura</label>
              <input class="form-control" id="hosp-edit-altura" value="${p.altura || ''}" placeholder="1.75m">
            </div>
          </div>
          <div class="form-group">
            <label>Notas Médicas</label>
            <textarea class="form-control" id="hosp-edit-notas" rows="3">${p.notas || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Medicación</label>
            <input class="form-control" id="hosp-edit-medicacion" value="${p.medicacion || ''}" placeholder="Medicamentos recetados">
          </div>
          <button type="submit" class="btn btn-warning btn-block"><i class="fas fa-save"></i> Guardar Cambios</button>
        </form>
        <div id="hosp-edit-result"></div>
      </div>
    `;
    document.getElementById('page-content').innerHTML = content;
    document.getElementById('page-title').textContent = 'Modificar Paciente - Hospital Central';
  } catch (err) {
    App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function hospitalGuardarEdicion(id) {
  var data = {
    nombre: document.getElementById('hosp-edit-nombre').value.trim(),
    rut: document.getElementById('hosp-edit-rut').value.trim(),
    motivo: document.getElementById('hosp-edit-motivo').value,
    gravedad: document.getElementById('hosp-edit-gravedad').value,
    estado: document.getElementById('hosp-edit-estado').value.trim(),
    notas: document.getElementById('hosp-edit-notas').value.trim(),
    medicacion: document.getElementById('hosp-edit-medicacion').value.trim(),
    grupoSanguineo: document.getElementById('hosp-edit-sangre').value.trim(),
    alergias: document.getElementById('hosp-edit-alergias').value.trim(),
    peso: document.getElementById('hosp-edit-peso').value.trim(),
    altura: document.getElementById('hosp-edit-altura').value.trim()
  };
  var result = document.getElementById('hosp-edit-result');
  try {
    await API.updatePaciente(id, data);
    result.innerHTML = App.showAlert('Paciente actualizado correctamente', 'success');
    hospitalPacientes = [];
    hospitalLoading = false;
    setTimeout(function() { App.navigate('hospital-atencion'); }, 600);
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function hospitalAgregarVisita(id) {
  try {
    var p = await API.getPaciente(id);
    if (!p) return;
    var content = `
      <div class="card" style="max-width:500px;margin:0 auto;">
        <div class="card-header"><h3><i class="fas fa-plus-circle"></i> Agregar Visita - ${p.nombre}</h3></div>
        <form onsubmit="event.preventDefault();hospitalGuardarVisita('${id}')">
          <div class="form-group">
            <label>Motivo de la visita *</label>
            <input class="form-control" id="hosp-visita-motivo" placeholder="Control, emergencia, etc." required>
          </div>
          <div class="form-group">
            <label>Diagnóstico</label>
            <input class="form-control" id="hosp-visita-diagnostico" placeholder="Diagnóstico médico">
          </div>
          <div class="form-group">
            <label>Tratamiento</label>
            <input class="form-control" id="hosp-visita-tratamiento" placeholder="Tratamiento aplicado">
          </div>
          <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Registrar Visita</button>
        </form>
        <div id="hosp-visita-result"></div>
      </div>
    `;
    document.getElementById('page-content').innerHTML = content;
    document.getElementById('page-title').textContent = 'Agregar Visita - Hospital Central';
  } catch (err) {
    App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function hospitalGuardarVisita(id) {
  var nuevaVisita = {
    motivo: document.getElementById('hosp-visita-motivo').value.trim(),
    diagnostico: document.getElementById('hosp-visita-diagnostico').value.trim(),
    tratamiento: document.getElementById('hosp-visita-tratamiento').value.trim()
  };
  var result = document.getElementById('hosp-visita-result');
  try {
    await API.updatePaciente(id, { nuevaVisita: nuevaVisita });
    result.innerHTML = App.showAlert('Visita registrada correctamente', 'success');
    hospitalPacientes = [];
    hospitalLoading = false;
    setTimeout(function() { App.navigate('hospital-atencion'); }, 600);
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function hospitalDarAlta(id, nombre) {
  if (!confirm('¿Dar de alta a ' + nombre + '?\n\nEsto marcará al paciente como "Dado de alta".')) return;
  try {
    await API.darAltaPaciente(id);
    hospitalPacientes = [];
    hospitalLoading = false;
    App.navigate('hospital-atencion');
  } catch (err) {
    App.showAlert('Error: ' + err.message, 'danger');
  }
}

async function renderHospitalHistorial() {
  await hospitalCargarPacientes();

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-notes-medical"></i> Historial Clínico</h3>
        <span class="badge badge-info">${hospitalPacientes.length} pacientes registrados</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Buscar Historial</h3></div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <input class="form-control" id="hosp-hist-search" placeholder="Buscar por RUT o Nombre..." style="flex:1;">
        <button class="btn btn-primary" onclick="hospitalBuscarHistorial()"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="hosp-hist-result">
        <table>
          <thead><tr><th>Paciente</th><th>RUT</th><th>Grupo Sang.</th><th>Alergias</th><th>Visitas</th><th>Última Visita</th><th>Acciones</th></tr></thead>
          <tbody>
            ${hospitalPacientes.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No hay pacientes registrados</td></tr>' : ''}
            ${hospitalPacientes.map(function(h) {
              var ultimaVisita = h.historialVisitas && h.historialVisitas.length > 0
                ? h.historialVisitas[h.historialVisitas.length - 1].fecha
                : (h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '—');
              return `
                <tr>
                  <td><strong>${h.nombre}</strong></td>
                  <td>${h.rut || '—'}</td>
                  <td><span class="badge badge-${(h.grupoSanguineo || '').includes('-') ? 'danger' : 'info'}">${h.grupoSanguineo || '—'}</span></td>
                  <td>${h.alergias || 'Ninguna'}</td>
                  <td>${h.visitas || 1}</td>
                  <td>${ultimaVisita}</td>
                  <td>
                    <button class="btn btn-sm btn-info" onclick="hospitalVerPaciente('${h._id}')" title="Ver"><i class="fas fa-folder-open"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="hospitalEditarPaciente('${h._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function hospitalBuscarHistorial() {
  var q = document.getElementById('hosp-hist-search').value.trim().toLowerCase();
  if (!q) { hospitalCargarPacientes().then(function() { App.navigate('hospital-historial'); }); return; }
  var result = document.getElementById('hosp-hist-result');
  result.innerHTML = '<div class="alert alert-info">Buscando historial de "' + q + '"...</div>';
  try {
    var filtrados = await API.getPacientes(q);
    if (filtrados.length === 0) {
      result.innerHTML = '<div class="alert alert-warning">No se encontraron pacientes con ese criterio</div>';
    } else {
      result.innerHTML = filtrados.map(function(h) {
        var ultimaVisita = h.historialVisitas && h.historialVisitas.length > 0
          ? h.historialVisitas[h.historialVisitas.length - 1].fecha
          : (h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '—');
        return '<div class="card" style="margin-bottom:8px;cursor:pointer;" onclick="hospitalVerPaciente(\'' + h._id + '\')">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<i class="fas fa-user-circle" style="font-size:32px;color:var(--danger);"></i>' +
            '<div style="flex:1;">' +
              '<strong>' + h.nombre + '</strong>' +
              '<p style="color:var(--text-muted);font-size:12px;">RUT: ' + (h.rut || '—') + ' | Sangre: ' + (h.grupoSanguineo || '—') + ' | Alergias: ' + (h.alergias || 'Ninguna') + ' | ' + (h.visitas || 1) + ' visitas | Última: ' + ultimaVisita + '</p>' +
            '</div>' +
            '<i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>' +
          '</div>' +
        '</div>';
      }).join('');
    }
  } catch (err) {
    result.innerHTML = '<div class="alert alert-danger">Error: ' + err.message + '</div>';
  }
}

async function renderHospitalGestion() {
  var personal = [
    { id: 1, nombre: 'Dr. Alejandro Silva', cargo: 'Director Médico', especialidad: 'Cirugía General', estado: 'En servicio' },
    { id: 2, nombre: 'Dra. Carmen Vega', cargo: 'Jefa de Urgencias', especialidad: 'Medicina de Urgencia', estado: 'En servicio' },
    { id: 3, nombre: 'Dr. Roberto Fuentes', cargo: 'Médico Internista', especialidad: 'Medicina Interna', estado: 'Descanso' },
    { id: 4, nombre: 'Enf. Patricia Ríos', cargo: 'Enfermera Jefe', especialidad: 'Cuidados Intensivos', estado: 'En servicio' },
    { id: 5, nombre: 'Enf. Miguel Soto', cargo: 'Enfermero', especialidad: 'Traumatología', estado: 'En servicio' },
    { id: 6, nombre: 'Param. Luis Araya', cargo: 'Paramédico', especialidad: 'Emergencias', estado: 'En servicio' }
  ];

  await hospitalCargarPacientes();
  var activos = hospitalPacientes.filter(function(p) { return p.estado !== 'Dado de alta'; });
  var dadosDeAlta = hospitalPacientes.filter(function(p) { return p.estado === 'Dado de alta'; });
  var graves = hospitalPacientes.filter(function(p) { return p.gravedad === 'Grave' && p.estado !== 'Dado de alta'; });

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-clinic-medical"></i> Gestión Hospitalaria</h3>
        <span class="badge badge-success">Personal activo: ${personal.filter(function(p) { return p.estado === 'En servicio'; }).length}</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-user-md"></i> Personal Médico</h3></div>
        <table>
          <thead><tr><th>Nombre</th><th>Cargo</th><th>Especialidad</th><th>Estado</th></tr></thead>
          <tbody>
            ${personal.map(function(p) {
              return `
                <tr>
                  <td><strong>${p.nombre}</strong></td>
                  <td>${p.cargo}</td>
                  <td>${p.especialidad}</td>
                  <td><span class="badge badge-${p.estado === 'En servicio' ? 'success' : 'warning'}">${p.estado}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-tasks"></i> Recursos Hospitalarios</h3></div>
        <div class="grid-2">
          <div class="stat-card"><i class="fas fa-procedures" style="color:var(--info);"></i><span class="stat-value">${activos.length}</span><span class="stat-label">Pacientes activos</span></div>
          <div class="stat-card"><i class="fas fa-heart-broken" style="color:var(--danger);"></i><span class="stat-value">${graves.length}</span><span class="stat-label">Casos graves</span></div>
          <div class="stat-card"><i class="fas fa-check-circle" style="color:var(--success);"></i><span class="stat-value">${dadosDeAlta.length}</span><span class="stat-label">Dados de alta</span></div>
          <div class="stat-card"><i class="fas fa-hospital" style="color:var(--warning);"></i><span class="stat-value">${hospitalPacientes.length}</span><span class="stat-label">Total registros</span></div>
        </div>
        <hr style="border-color:var(--border);margin:16px 0;">
        <h4 style="margin-bottom:8px;">Registrar Personal</h4>
        <form onsubmit="event.preventDefault();hospitalRegistrarPersonal()">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre</label>
              <input class="form-control" id="hosp-pers-nombre" placeholder="Nombre completo" required>
            </div>
            <div class="form-group">
              <label>Cargo</label>
              <select class="form-control" id="hosp-pers-cargo">
                <option value="Médico">Médico</option>
                <option value="Enfermero/a">Enfermero/a</option>
                <option value="Paramédico">Paramédico</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <select class="form-control" id="hosp-pers-esp">
              <option value="Medicina General">Medicina General</option>
              <option value="Cirugía">Cirugía</option>
              <option value="Urgencias">Urgencias</option>
              <option value="Traumatología">Traumatología</option>
              <option value="Pediatría">Pediatría</option>
              <option value="Cuidados Intensivos">Cuidados Intensivos</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-user-plus"></i> Registrar Personal</button>
        </form>
        <div id="hosp-pers-result"></div>
      </div>
    </div>
  `;
}

function hospitalRegistrarPersonal() {
  var nombre = document.getElementById('hosp-pers-nombre').value.trim();
  if (!nombre) { document.getElementById('hosp-pers-result').innerHTML = App.showAlert('Complete el nombre', 'danger'); return; }
  document.getElementById('hosp-pers-result').innerHTML = App.showAlert('Personal ' + nombre + ' registrado en el Hospital Central', 'success');
  document.getElementById('hosp-pers-nombre').value = '';
}
