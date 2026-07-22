function renderODSistema() {
  const u = Auth.currentUser;
  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-cogs"></i> Sistema OD - Organizaciones Delictivas</h3>
        ${u ? `<span style="color:var(--text-muted);font-size:13px;">Dinero Negro: <strong style="color:var(--danger);">$${u.dineroNegro.toLocaleString()}</strong></span>` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="od-grupos">Grupos (Roles Discord)</div>
      <div class="tab" data-tab="od-dinero">Dinero Negro</div>
      <div class="tab" data-tab="od-exp">Nivel EXP</div>
      <div class="tab" data-tab="od-merkado">Mercado Negro</div>
    </div>

    <div id="od-grupos" class="tab-content active">${odGrupos()}</div>
    <div id="od-dinero" class="tab-content">${odDinero()}</div>
    <div id="od-exp" class="tab-content">${odExp()}</div>
    <div id="od-merkado" class="tab-content">${odMercadoNegro()}</div>
  `;
}

function odGrupos() {
  const isAdmin = Auth.currentUser && Auth.currentUser.rol === 'admin';
  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Roles de Discord</h3></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${DB.gruposDiscord.map(g => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-input);border-radius:var(--radius);border-left:4px solid ${g.color};">
              <div style="width:12px;height:12px;border-radius:50%;background:${g.color};"></div>
              <div style="flex:1;">
                <strong>${g.nombre}</strong>
                <span style="color:var(--text-muted);font-size:12px;margin-left:8px;">${g.miembros} miembros</span>
              </div>
              <span class="badge" style="background:${g.color}33;color:${g.color};">${g.color === '#f1c40f' ? '⭐' : g.color === '#f1c40f' ? '⚡' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ${isAdmin ? `
      <div class="card">
        <div class="card-header"><h3>Gestión de Grupos</h3></div>
        <form onsubmit="event.preventDefault();odCrearGrupo()">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del Grupo</label>
              <input class="form-control" id="od-grupo-nombre" placeholder="Nombre" required>
            </div>
            <div class="form-group">
              <label>Color (hex)</label>
              <input class="form-control" id="od-grupo-color" type="color" value="#3498db">
            </div>
          </div>
          <div class="form-group">
            <label>Miembros</label>
            <input class="form-control" id="od-grupo-miembros" type="number" value="0" min="0">
          </div>
          <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-plus"></i> Crear Grupo</button>
        </form>
        <div id="od-grupo-result"></div>
      </div>
      ` : ''}
    </div>
    ${isAdmin ? `
    <div class="card">
      <div class="card-header"><h3>Asignar Rol a Usuario</h3></div>
      <form onsubmit="event.preventDefault();odAsignarRol()">
        <div class="form-row">
          <div class="form-group">
            <label>Usuario (RUT)</label>
            <select class="form-control" id="od-asignar-usuario">
              ${DB.usuarios.map(u => `<option value="${u.rut}">${u.nombre} (${u.rut})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select class="form-control" id="od-asignar-rol">
              ${DB.gruposDiscord.map(g => `<option value="${g.nombre}">${g.nombre}</option>`).join('')}
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-user-tag"></i> Asignar Rol</button>
      </form>
      <div id="od-asignar-result"></div>
    </div>
    ` : ''}
  `;
}

async function odCrearGrupo() {
  const nombre = document.getElementById('od-grupo-nombre').value.trim();
  const color = document.getElementById('od-grupo-color').value;
  if (!nombre) { document.getElementById('od-grupo-result').innerHTML = App.showAlert('Ingrese un nombre', 'danger'); return; }
  if (DB.gruposDiscord.find(g => g.nombre.toLowerCase() === nombre.toLowerCase())) {
    document.getElementById('od-grupo-result').innerHTML = App.showAlert('El grupo ya existe', 'danger'); return;
  }
  try {
    await API.createGrupoDiscord({ nombre, color });
    await API.loadAll();
    document.getElementById('od-grupo-result').innerHTML = App.showAlert(`Grupo "${nombre}" creado`, 'success');
    document.getElementById('od-grupo-nombre').value = '';
  } catch (e) {
    document.getElementById('od-grupo-result').innerHTML = App.showAlert('Error al crear grupo', 'danger');
  }
}

async function odAsignarRol() {
  const rut = document.getElementById('od-asignar-usuario').value;
  const rol = document.getElementById('od-asignar-rol').value;
  try {
    await API.asignarRol(rut, rol);
    await API.loadAll();
    document.getElementById('od-asignar-result').innerHTML = App.showAlert(`Rol "${rol}" asignado a usuario ${rut}`, 'success');
  } catch (e) {
    document.getElementById('od-asignar-result').innerHTML = App.showAlert('Error al asignar rol', 'danger');
  }
}

function odDinero() {
  const u = Auth.currentUser;
  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Mi Dinero Negro</h3></div>
        <div style="text-align:center;padding:20px;">
          <i class="fas fa-money-bill-wave" style="font-size:48px;color:var(--danger);margin-bottom:8px;"></i>
          <p style="font-size:13px;color:var(--text-muted);">Dinero Negro</p>
          <p style="font-size:36px;font-weight:700;color:var(--danger);">$${(u ? u.dineroNegro : 0).toLocaleString()}</p>
          <p style="font-size:13px;color:var(--text-muted);">Dinero Legal: $${(u ? u.dinero : 0).toLocaleString()}</p>
          <hr style="border-color:var(--border);margin:16px 0;">
          <p style="font-size:12px;color:var(--text-muted);">El dinero negro no puede ser depositado en el banco ni transferido legalmente.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Operaciones</h3></div>
        <form onsubmit="event.preventDefault();odLavarDinero()">
          <div class="form-group">
            <label>Monto a Lavar</label>
            <div style="display:flex;gap:8px;">
              <input class="form-control" id="od-lavar-monto" type="number" placeholder="Monto" min="1" style="flex:1;">
              <button type="submit" class="btn btn-success"><i class="fas fa-recycle"></i> Lavar</button>
            </div>
          </div>
        </form>
        <div id="od-lavar-result"></div>
        <hr style="border-color:var(--border);margin:12px 0;">
        <form onsubmit="event.preventDefault();odTransferirNegro()">
          <h4 style="margin-bottom:10px;"><i class="fas fa-hand-holding-usd"></i> Pagar con Dinero Negro</h4>
          <div class="form-group">
            <label>RUT del destinatario</label>
            <input class="form-control" id="od-transf-rut" placeholder="RUT">
          </div>
          <div class="form-group">
            <label>Monto a pagar</label>
            <input class="form-control" id="od-transf-monto" type="number" placeholder="Monto">
          </div>
          <div class="form-group">
            <label>Motivo (opcional)</label>
            <input class="form-control" id="od-transf-concepto" placeholder="Ej: Pago de servicio, mercancía, etc.">
          </div>
          <button type="submit" class="btn btn-danger btn-block"><i class="fas fa-money-check-alt"></i> Pagar</button>
        </form>
        <div id="od-transf-result"></div>
      </div>
    </div>
  `;
}

async function odLavarDinero() {
  const u = Auth.currentUser;
  if (!u) return;
  const monto = parseInt(document.getElementById('od-lavar-monto').value);
  if (!monto || monto <= 0) { document.getElementById('od-lavar-result').innerHTML = App.showAlert('Monto inválido', 'danger'); return; }
  if (monto > u.dineroNegro) { document.getElementById('od-lavar-result').innerHTML = App.showAlert('Dinero negro insuficiente', 'danger'); return; }
  const comision = Math.floor(monto * 0.25);
  const neto = monto - comision;
  try {
    const res = await API.lavarDinero(monto);
    Auth.currentUser.dineroNegro = res.dineroNegro;
    Auth.currentUser.dinero = res.dinero;
    localStorage.setItem('wcrp_user', JSON.stringify(Auth.currentUser));
    document.getElementById('od-lavar-result').innerHTML = App.showAlert(`Lavado: $${monto.toLocaleString()} → $${neto.toLocaleString()} (comisión 25%: $${comision.toLocaleString()})`, 'success');
  } catch (e) {
    document.getElementById('od-lavar-result').innerHTML = App.showAlert('Error al lavar dinero', 'danger');
  }
  document.getElementById('od-lavar-monto').value = '';
}

async function odTransferirNegro() {
  const u = Auth.currentUser;
  if (!u) return;
  const rut = document.getElementById('od-transf-rut').value.trim();
  const monto = parseInt(document.getElementById('od-transf-monto').value);
  const concepto = document.getElementById('od-transf-concepto').value.trim();
  const result = document.getElementById('od-transf-result');
  if (!rut || !monto || monto <= 0) { result.innerHTML = App.showAlert('Datos inválidos', 'danger'); return; }
  if (monto > u.dineroNegro) { result.innerHTML = App.showAlert('Dinero negro insuficiente', 'danger'); return; }
  const destino = DB.usuarios.find(user => user.rut === rut);
  if (!destino) { result.innerHTML = App.showAlert('Destinatario no encontrado', 'danger'); return; }
  try {
    const res = await API.transferirNegro(rut, monto, concepto);
    Auth.currentUser.dineroNegro = res.dineroNegro;
    localStorage.setItem('wcrp_user', JSON.stringify(Auth.currentUser));
    result.innerHTML = App.showAlert(`Pagaste $${monto.toLocaleString()} a ${destino.nombre}${concepto ? ' — ' + concepto : ''}`, 'success');
  } catch (e) {
    result.innerHTML = App.showAlert(e.message || 'Error al pagar', 'danger');
  }
  document.getElementById('od-transf-rut').value = '';
  document.getElementById('od-transf-monto').value = '';
  document.getElementById('od-transf-concepto').value = '';
}

function odExp() {
  const u = Auth.currentUser;
  const niveles = DB.niveles;

  const expActual = u ? u.exp : 0;
  const nivelActual = u ? u.nivel : 1;

  let nivelInfo = null;
  let proxNivel = null;
  for (let i = 0; i < niveles.length; i++) {
    if (niveles[i].nivel === nivelActual) nivelInfo = niveles[i];
    if (niveles[i].nivel === nivelActual + 1) proxNivel = niveles[i];
  }

  const expMin = nivelInfo ? nivelInfo.exp : 0;
  const expMax = proxNivel ? proxNivel.exp : (nivelInfo ? nivelInfo.exp + 2000 : 2000);
  const expPorcentaje = expMax > expMin ? Math.min(100, Math.floor((expActual - expMin) / (expMax - expMin) * 100)) : 100;
  const expFaltante = proxNivel ? expMax - expActual : 0;

  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Mi Progreso</h3></div>
        <div style="text-align:center;padding:20px;">
          <i class="fas fa-star" style="font-size:48px;color:var(--warning);margin-bottom:8px;"></i>
          <p style="font-size:13px;color:var(--text-muted);">Nivel Actual</p>
          <p style="font-size:40px;font-weight:700;color:var(--warning);">${nivelActual}</p>
          <p style="font-size:16px;color:var(--text-muted);">${nivelInfo ? nivelInfo.rango : 'Leyenda'}</p>
          <div style="margin:16px 0;">
            <p style="font-size:13px;color:var(--text-muted);">EXP: ${expActual} / ${expMax}</p>
            <div class="progress-bar" style="margin-top:4px;">
              <div class="progress-fill" style="width:${expPorcentaje}%;"></div>
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">${expFaltante > 0 ? `${expFaltante} EXP para el siguiente nivel` : '¡Nivel máximo alcanzado!'}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Tabla de Niveles</h3></div>
        <table>
          <thead><tr><th>Nivel</th><th>EXP Requerido</th><th>Rango</th></tr></thead>
          <tbody>
            ${niveles.map(n => `
              <tr style="${n.nivel === nivelActual ? 'background:rgba(243,156,18,0.1);' : ''}">
                <td><strong>${n.nivel}</strong></td>
                <td>${n.exp.toLocaleString()} EXP</td>
                <td>${n.rango} ${n.nivel === nivelActual ? '<span class="badge badge-warning">Actual</span>' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>¿Cómo ganar EXP?</h3></div>
      <div class="grid-3">
        <div class="stat-card" style="text-align:left;">
          <i class="fas fa-file-alt" style="font-size:24px;color:var(--info);"></i>
          <h4 style="margin:4px 0;">Denuncias</h4>
          <p style="font-size:12px;color:var(--text-muted);">+50 EXP por denuncia presentada</p>
        </div>
        <div class="stat-card" style="text-align:left;">
          <i class="fas fa-handcuffs" style="font-size:24px;color:var(--success);"></i>
          <h4 style="margin:4px 0;">Participación</h4>
          <p style="font-size:12px;color:var(--text-muted);">+100 EXP por operativo</p>
        </div>
        <div class="stat-card" style="text-align:left;">
          <i class="fas fa-clock" style="font-size:24px;color:var(--warning);"></i>
          <h4 style="margin:4px 0;">Tiempo en Servidor</h4>
          <p style="font-size:12px;color:var(--text-muted);">+10 EXP por hora conectado</p>
        </div>
      </div>
    </div>
  `;
}

function odMercadoNegro() {
  const u = Auth.currentUser;
  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-skull"></i> Mercado Negro</h3>
        <span style="color:var(--danger);font-weight:600;">Dinero Negro: $${(u ? u.dineroNegro : 0).toLocaleString()}</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:16px;">Artículos ilegales disponibles. Solo se acepta <strong style="color:var(--danger);">dinero negro</strong>.</p>
      <div class="grid-3">
        ${DB.blackMarket.map(item => `
          <div class="stat-card" style="text-align:left;border-color:rgba(241,196,15,0.3);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;cursor:pointer;" onclick="odComprarBlack('${item._id}')">
              <i class="fas fa-${item.item.includes('Pistola') || item.item.includes('Arma') ? 'gun' : item.item.includes('Chaleco') ? 'shield-alt' : item.item.includes('Teléfono') ? 'mobile-alt' : item.item.includes('Documentos') ? 'file-contract' : item.item.includes('Diamantes') ? 'gem' : 'box'}" style="font-size:24px;color:var(--danger);"></i>
              <h4 style="font-size:14px;">${item.item}</h4>
            </div>
            <p style="font-size:12px;color:var(--text-muted);">Vendedor: ${item.vendedor}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
              <span style="font-weight:700;color:var(--danger);">$${item.precio.toLocaleString()}</span>
              <span class="badge badge-${item.stock > 3 ? 'success' : item.stock > 0 ? 'warning' : 'danger'}">Stock: ${item.stock}</span>
            </div>
            <button class="btn btn-sm btn-danger btn-block" style="margin-top:8px;" ${item.stock <= 0 ? 'disabled' : ''} onclick="odComprarBlack('${item._id}')"><i class="fas fa-shopping-cart"></i> ${item.stock <= 0 ? 'Agotado' : 'Comprar'}</button>
          </div>
        `).join('')}
      </div>
      <div id="od-market-result"></div>
    </div>
  `;
}

async function odComprarBlack(id) {
  const u = Auth.currentUser;
  if (!u) return;
  const item = DB.blackMarket.find(i => i._id === id);
  if (!item || item.stock <= 0) { document.getElementById('od-market-result').innerHTML = App.showAlert('Artículo agotado', 'danger'); return; }
  if (u.dineroNegro < item.precio) { document.getElementById('od-market-result').innerHTML = App.showAlert(`Saldo negro insuficiente. Necesitas $${item.precio.toLocaleString()}`, 'danger'); return; }
  if (!confirm(`¿Comprar "${item.item}" por $${item.precio.toLocaleString()} (dinero negro)?`)) return;
  try {
    const res = await API.comprarBlackMarket(id);
    Auth.currentUser.dineroNegro = res.dineroNegro;
    if (res.inventario) { Auth.currentUser.inventario = res.inventario; }
    item.stock--;
    localStorage.setItem('wcrp_user', JSON.stringify(Auth.currentUser));
    await API.loadAll();
    document.getElementById('od-market-result').innerHTML = App.showAlert(`¡${item.item} adquirido en el mercado negro!`, 'success');
  } catch (e) {
    document.getElementById('od-market-result').innerHTML = App.showAlert('Error al comprar', 'danger');
  }
}

function odAbrirFormularioItem(item) {
  const it = item || {};
  App.showModal(it._id ? 'Editar Item del Mercado Negro' : 'Agregar Item al Mercado Negro', `
    <form onsubmit="event.preventDefault(); odGuardarItem('${it._id || ''}')">
      <div class="form-group">
        <label>Nombre del Item *</label>
        <input class="form-control" id="od-item-nombre" value="${it.item || ''}" placeholder="Ej: Pistola 9mm" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Precio (dinero negro) *</label>
          <input class="form-control" id="od-item-precio" type="number" value="${it.precio || ''}" placeholder="Precio" required>
        </div>
        <div class="form-group">
          <label>Stock</label>
          <input class="form-control" id="od-item-stock" type="number" value="${it.stock ?? 0}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Vendedor</label>
          <input class="form-control" id="od-item-vendedor" value="${it.vendedor || ''}" placeholder="Nombre del vendedor">
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <input class="form-control" id="od-item-categoria" value="${it.categoria || ''}" placeholder="Ej: Armas">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
    </form>
  `);
}

function odEditarItem(id) {
  const item = DB.blackMarket.find(i => i._id === id);
  if (item) odAbrirFormularioItem(item);
}

async function odGuardarItem(id) {
  const data = {
    item: document.getElementById('od-item-nombre').value.trim(),
    precio: parseInt(document.getElementById('od-item-precio').value) || 0,
    stock: parseInt(document.getElementById('od-item-stock').value) || 0,
    vendedor: document.getElementById('od-item-vendedor').value.trim(),
    categoria: document.getElementById('od-item-categoria').value.trim()
  };
  if (!data.item || !data.precio) {
    alert('Nombre y precio son obligatorios');
    return;
  }
  try {
    if (id) await API.updateBlackMarketItem(id, data);
    else await API.createBlackMarketItem(data);
    document.getElementById('modal-overlay').classList.add('hidden');
    await API.loadAll();
    App.navigate('od-sistema');
  } catch (err) {
    alert(err.message);
  }
}

async function odEliminarItem(id) {
  if (!confirm('¿Eliminar este item del mercado negro?')) return;
  try {
    await API.deleteBlackMarketItem(id);
    await API.loadAll();
    App.navigate('od-sistema');
  } catch (err) {
    alert(err.message);
  }
}