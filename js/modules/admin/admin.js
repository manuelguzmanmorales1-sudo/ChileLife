async function renderAdminPanel() {
  const roleNames = { ciudadano: 'Ciudadano', carabinero: 'Carabinero', pdi: 'PDI', medico: 'Médico', municipal: 'Municipal', admin: 'Admin' };
  const roleColors = { ciudadano: '#95a5a6', carabinero: '#2ecc71', pdi: '#3498db', medico: '#e91e63', municipal: '#9b59b6', admin: '#f1c40f' };

  let usuarios = [];
  try {
    usuarios = await API.getUsers();
    DB.usuarios = usuarios;
  } catch (err) {
    console.error('Error cargando usuarios:', err);
    usuarios = DB.usuarios || [];
  }

  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-crown" style="color:var(--accent);"></i> Panel de Administración</h3>
        <span class="badge" style="background:var(--accent)33;color:var(--accent);">Admin</span>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="admin-roles">Gestión de Usuarios</div>
      <div class="tab" data-tab="admin-stats">Estadísticas</div>
    </div>

    <div id="admin-roles" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-users-cog"></i> Usuarios Registrados (${usuarios.length})</h3>
          <button class="btn btn-sm btn-primary" onclick="adminRefrescar()"><i class="fas fa-sync-alt"></i> Refrescar</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>RUT</th>
                <th>Rol</th>
                <th>Nivel</th>
                <th>Dinero</th>
                <th>Dinero Negro</th>
                <th>Cambiar Rol</th>
              </tr>
            </thead>
            <tbody>
              ${usuarios.map(u => `
                <tr>
                  <td><strong>${u.nombre}</strong></td>
                  <td>${u.rut}</td>
                  <td><span class="rp-badge" style="background:${roleColors[u.rol] || '#95a5a6'}33;color:${roleColors[u.rol] || '#95a5a6'};">${roleNames[u.rol] || u.rol}</span></td>
                  <td>Nv. ${u.nivel}</td>
                  <td>$${(u.dinero || 0).toLocaleString()}</td>
                  <td style="color:var(--danger);">$${(u.dineroNegro || 0).toLocaleString()}</td>
                  <td>
                    <select class="form-control" id="admin-rol-${u._id}" style="width:150px;display:inline-block;padding:4px 8px;font-size:12px;" onchange="adminCambiarRol('${u._id}', '${u.rut}', '${u.nombre.replace(/'/g, "\\'")}')">
                      <option value="">-- Seleccionar --</option>
                      <option value="ciudadano" ${u.rol === 'ciudadano' ? 'selected' : ''}>Ciudadano</option>
                      <option value="carabinero" ${u.rol === 'carabinero' ? 'selected' : ''}>Carabinero</option>
                      <option value="pdi" ${u.rol === 'pdi' ? 'selected' : ''}>PDI</option>
                      <option value="medico" ${u.rol === 'medico' ? 'selected' : ''}>Médico</option>
                      <option value="municipal" ${u.rol === 'municipal' ? 'selected' : ''}>Municipal</option>
                      <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
              ${usuarios.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No hay usuarios</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        <div id="admin-rol-result"></div>
      </div>
    </div>

    <div id="admin-stats" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-chart-pie"></i> Distribución de Roles</h3></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${Object.entries(roleNames).map(([key, name]) => {
              const count = usuarios.filter(u => u.rol === key).length;
              const pct = usuarios.length > 0 ? Math.round(count / usuarios.length * 100) : 0;
              return `
                <div style="display:flex;align-items:center;gap:12px;">
                  <span class="rp-badge" style="background:${roleColors[key]}33;color:${roleColors[key]};min-width:100px;text-align:center;">${name}</span>
                  <div class="progress-bar" style="flex:1;height:8px;">
                    <div class="progress-fill" style="width:${pct}%;background:${roleColors[key]};"></div>
                  </div>
                  <span style="font-size:12px;color:var(--text-muted);min-width:50px;text-align:right;">${count} (${pct}%)</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-database"></i> Info del Servidor</h3></div>
          <div class="grid-2" style="gap:10px;">
            <div class="stat-card"><i class="fas fa-users" style="color:var(--info);"></i><span class="stat-value">${usuarios.length}</span><span class="stat-label">Usuarios</span></div>
            <div class="stat-card"><i class="fas fa-user-tie" style="color:var(--success);"></i><span class="stat-value">${(DB.funcionarios || []).length}</span><span class="stat-label">Funcionarios</span></div>
            <div class="stat-card"><i class="fas fa-file-alt" style="color:var(--warning);"></i><span class="stat-value">${(DB.denuncias || []).length}</span><span class="stat-label">Denuncias</span></div>
            <div class="stat-card"><i class="fas fa-search" style="color:var(--accent);"></i><span class="stat-value">${(DB.investigaciones || []).length}</span><span class="stat-label">Investigaciones</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function adminRefrescar() {
  await API.loadAll();
  App.navigate('admin-panel');
}

async function adminCambiarRol(id, rut, nombre) {
  const select = document.getElementById('admin-rol-' + id);
  const nuevoRol = select.value;
  if (!nuevoRol) return;

  const roleNames = { ciudadano: 'Ciudadano', carabinero: 'Carabinero', pdi: 'PDI', medico: 'Médico', municipal: 'Municipal', admin: 'Admin' };

  if (!confirm('¿Asignar rol ' + roleNames[nuevoRol] + ' a ' + nombre + ' (' + rut + ')?')) {
    const u = DB.usuarios.find(x => x._id === id);
    if (u) select.value = u.rol;
    return;
  }

  try {
    const res = await API.updateUserRol(id, nuevoRol);
    if (res.success) {
      const u = DB.usuarios.find(x => x._id === id);
      if (u) {
        u.rol = nuevoRol;
        u.rango = roleNames[nuevoRol];
      }

      if (Auth.currentUser && Auth.currentUser.rut === rut) {
        Auth.currentUser.rol = nuevoRol;
        Auth.currentUser.rango = roleNames[nuevoRol];
        localStorage.setItem('wcrp_user', JSON.stringify(Auth.currentUser));
        Auth.updateUI();
        App.applyRoleFilter();
        App.registerPages();
        App.setupNavigation();
      }

      document.getElementById('admin-rol-result').innerHTML = App.showAlert('Rol de ' + nombre + ' actualizado a ' + roleNames[nuevoRol], 'success');
    }
  } catch (err) {
    document.getElementById('admin-rol-result').innerHTML = App.showAlert('Error al cambiar rol: ' + err.message, 'danger');
  }
}

function adminCrearUsuario() {
  App.showLogin();
}