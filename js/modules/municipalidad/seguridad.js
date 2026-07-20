function renderSeguridad() {
  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-shield-alt"></i> SNSM - Sistema Nacional de Seguridad Municipal</h3>
      </div>
      <p style="color:var(--text-muted);">Base de datos ciudadana conectada con AUPOL (Carabineros) y GEPOL (PDI). Consultá el historial completo de cualquier persona por su RUT.</p>
    </div>

    <div class="card">
      <div class="card-header"><h3>Consulta Ciudadana</h3></div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <input class="form-control" id="snsm-rut" placeholder="RUT del ciudadano (ej: 12.345.678-9)" style="flex:1;" onkeydown="if(event.key==='Enter')snsmBuscar()">
        <button class="btn btn-primary" onclick="snsmBuscar()"><i class="fas fa-search"></i> Consultar</button>
      </div>
      <div id="snsm-resultado"></div>
    </div>
  `;
}

async function snsmBuscar() {
  const rut = document.getElementById('snsm-rut').value.trim();
  const cont = document.getElementById('snsm-resultado');
  if (!rut) { cont.innerHTML = App.showAlert('Ingrese un RUT', 'danger'); return; }
  cont.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Consultando...</p>';
  try {
    const data = await API.consultaSNSM(rut);
    cont.innerHTML = `
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
            <thead><tr><th>Delito</th><th>Institución</th><th>Fecha</th></tr></thead>
            <tbody>
              ${data.antecedentes.map(a => `<tr><td>${a.delito}</td><td>${a.institucion}</td><td>${a.fecha}</td></tr>`).join('')}
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
    `;
  } catch (err) {
    cont.innerHTML = App.showAlert(err.message || 'Ciudadano no encontrado', 'danger');
  }
}
