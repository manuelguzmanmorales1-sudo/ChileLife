function renderDNI() {
  const u = Auth.currentUser;
  if (!u) return App.showAlert('Debes iniciar sesión', 'danger');

  if (!u.sexo) u.sexo = 'Masculino';
  if (!u.nacionalidad) u.nacionalidad = 'Chilena';

  const yaTieneDni = !!u.rut;
  const foto = u.dniFoto || u.robloxAvatar || '';
  const sexoShort = u.sexo === 'Femenino' ? 'F' : 'M';

  const partesNombre = (u.nombre || '').trim().split(' ');
  const nombres = partesNombre.slice(0, Math.ceil(partesNombre.length / 2)).join(' ') || u.nombre || '—';
  const apellidos = partesNombre.slice(Math.ceil(partesNombre.length / 2)).join(' ') || '';

  return `
    <div class="card" style="max-width:760px;margin:0 auto;">
      <div class="card-header">
        <h3><i class="fas fa-id-card"></i> Cédula de Identidad - República de Chile</h3>
        ${yaTieneDni ? `<button class="btn btn-sm btn-outline" onclick="dniActualizarAvatar()" title="Refrescar avatar de Roblox"><i class="fas fa-sync-alt"></i></button>` : ''}
      </div>

      ${!yaTieneDni ? `<div class="alert alert-warning" style="margin:12px 0;"><i class="fas fa-exclamation-triangle"></i> Todavía no tenés tu cédula. Completá los datos de abajo — el RUT y el número de documento se generan solos.</div>` : ''}

      <!-- ===== TARJETA SOBRE LA PLANTILLA OFICIAL ===== -->
      <div id="dni-card-preview" style="display:flex;justify-content:center;padding:10px 0 20px;">
        <div id="dni-card" style="
          width:700px;
          height:459px;
          position:relative;
          background-image:url('img/dni-plantilla.png');
          background-size:100% 100%;
          background-repeat:no-repeat;
          border-radius:8px;
          overflow:hidden;
          font-family:'Segoe UI',system-ui,sans-serif;
          box-shadow:0 4px 6px rgba(0,0,0,0.15),0 12px 28px rgba(0,0,0,0.25),0 20px 48px rgba(0,0,0,0.3);
        ">
          <!-- Foto (va sobre el recuadro celeste de la plantilla) -->
          <div style="position:absolute;left:14px;top:79px;width:181px;height:238px;border-radius:2px;overflow:hidden;">
            ${foto
              ? `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">`
              : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8fa3bd;">
                   <i class="fas fa-user-astronaut" style="font-size:38px;"></i>
                   <span style="font-size:9px;margin-top:6px;text-align:center;padding:0 10px;">Buscá tu usuario<br>de Roblox</span>
                 </div>`
            }
          </div>

          <!-- APELLIDOS -->
          <div style="position:absolute;left:231px;top:77px;width:420px;font-size:19px;font-weight:700;color:#1a2b4c;">${apellidos || '—'}</div>

          <!-- NOMBRES -->
          <div style="position:absolute;left:231px;top:147px;width:420px;font-size:19px;font-weight:700;color:#1a2b4c;">${nombres}</div>

          <!-- NACIONALIDAD / SEXO -->
          <div style="position:absolute;left:231px;top:216px;width:230px;font-size:15px;color:#1a2b4c;">${u.nacionalidad}</div>
          <div style="position:absolute;left:484px;top:216px;width:120px;font-size:15px;color:#1a2b4c;">${sexoShort}</div>

          <!-- FECHA NACIMIENTO / N° DOCUMENTO -->
          <div style="position:absolute;left:231px;top:260px;width:230px;font-size:15px;color:#1a2b4c;">${u.fechaNacimiento || '—'}</div>
          <div style="position:absolute;left:484px;top:260px;width:200px;font-size:15px;color:#1a2b4c;">${u.dniNumero || '—'}</div>

          <!-- FECHA EMISIÓN / VENCIMIENTO -->
          <div style="position:absolute;left:231px;top:306px;width:230px;font-size:15px;color:#1a2b4c;">${u.dniFechaEmision || '—'}</div>
          <div style="position:absolute;left:484px;top:306px;width:200px;font-size:15px;color:#1a2b4c;">${u.dniFechaVencimiento || '—'}</div>

          <!-- FIRMA -->
          <div style="position:absolute;left:231px;top:351px;width:300px;font-family:'Brush Script MT','Segoe Script',cursive;font-size:19px;color:#1a2b4c;">${u.dniFirma || u.nombre}</div>

          <!-- RUN -->
          <div style="position:absolute;left:75px;top:367px;font-size:17px;font-weight:800;color:#1a2b4c;">${u.rut || 'Pendiente'}</div>
        </div>
      </div>

      <!-- ===== FORMULARIO ===== -->
      ${yaTieneDni ? `
      <!-- DNI ya creado: SOLO se puede tocar el usuario de Roblox -->
      <div class="card" style="background:var(--bg-input);">
        <div class="card-header"><h3 style="font-size:15px;"><i class="fas fa-user-astronaut"></i> Actualizar foto (Roblox)</h3></div>
        <p style="color:var(--text-muted);font-size:12px;margin-bottom:10px;">Tu cédula ya está creada y no se puede modificar. Lo único que podés cambiar es tu usuario de Roblox, para actualizar la foto.</p>
        <div style="display:flex;gap:8px;">
          <input class="form-control" id="dni-roblox" value="${u.robloxUsername || ''}" placeholder="Tu username de Roblox" style="flex:1;">
          <button type="button" class="btn btn-primary" onclick="dniActualizarAvatar()"><i class="fas fa-sync-alt"></i> Actualizar Avatar</button>
        </div>
        <div id="dni-roblox-result"></div>
      </div>
      ` : `
      <form id="dni-form" onsubmit="event.preventDefault();crearDNI()">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input class="form-control" id="dni-nombre" value="${u.nombre || ''}" required>
          </div>
          <div class="form-group">
            <label>Fecha de Nacimiento *</label>
            <input class="form-control" id="dni-fechaNacimiento" type="date" value="${u.fechaNacimiento || ''}" required onchange="dniGenerarRut()">
          </div>

          <div class="form-group">
            <label>Sexo</label>
            <select class="form-control" id="dni-sexo">
              <option value="Masculino" ${u.sexo === 'Masculino' ? 'selected' : ''}>Masculino</option>
              <option value="Femenino" ${u.sexo === 'Femenino' ? 'selected' : ''}>Femenino</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nacionalidad</label>
            <input class="form-control" id="dni-nacionalidad" value="${u.nacionalidad}" required>
          </div>

          <div class="form-group" style="grid-column:1/-1;">
            <label>Firma (texto)</label>
            <input class="form-control" id="dni-firma" value="${u.dniFirma || ''}" placeholder="Nombre como firma">
          </div>

          <div class="form-group" style="grid-column:1/-1;">
            <label>Usuario de Roblox <small style="color:var(--text-muted);">(trae tu foto automática)</small></label>
            <div style="display:flex;gap:8px;">
              <input class="form-control" id="dni-roblox" value="${u.robloxUsername || ''}" placeholder="Tu username de Roblox" style="flex:1;">
              <button type="button" class="btn btn-outline" onclick="dniBuscarRoblox()"><i class="fas fa-user-astronaut"></i> Buscar</button>
            </div>
            <div id="dni-roblox-result"></div>
          </div>

          <!-- Campos automáticos: solo lectura, no editables -->
          <div class="form-group">
            <label>RUT <small style="color:var(--text-muted);">(automático)</small></label>
            <input class="form-control" id="dni-rut" value="" placeholder="Se genera al elegir tu fecha de nacimiento" readonly disabled>
          </div>
          <div class="form-group">
            <label>N° Documento <small style="color:var(--text-muted);">(automático)</small></label>
            <input class="form-control" id="dni-numero" value="" placeholder="Se genera solo" readonly disabled>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-glow" style="margin-top:16px;"><i class="fas fa-save"></i> Crear DNI</button>
      </form>
      `}
      <div id="dni-result"></div>
    </div>
  `;
}

async function dniGenerarRut() {
  const fecha = document.getElementById('dni-fechaNacimiento').value;
  if (!fecha) return;
  const rutInput = document.getElementById('dni-rut');
  const numeroInput = document.getElementById('dni-numero');
  rutInput.value = 'Generando...';
  try {
    const res = await API.generarRut(fecha);
    rutInput.value = res.rut;
    numeroInput.value = res.dniNumero;
  } catch (err) {
    rutInput.value = '';
    document.getElementById('dni-result').innerHTML = App.showAlert('No se pudo generar el RUT: ' + err.message, 'danger');
  }
}

async function dniBuscarRoblox() {
  const username = document.getElementById('dni-roblox').value.trim();
  const result = document.getElementById('dni-roblox-result');
  if (!username) { result.innerHTML = App.showAlert('Ingresá tu usuario de Roblox', 'danger'); return; }
  result.innerHTML = '<p style="color:var(--text-muted);font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Buscando...</p>';
  try {
    const data = await API.getAvatarRoblox(username);
    window._dniAvatarPendiente = data.avatarUrl;

    const cardImg = document.querySelector('#dni-card img');
    if (cardImg) {
      cardImg.src = data.avatarUrl;
      cardImg.style.display = '';
      if (cardImg.nextElementSibling) cardImg.nextElementSibling.style.display = 'none';
    }
    result.innerHTML = App.showAlert(`Avatar de ${data.displayName || data.username} cargado`, 'success');
  } catch (err) {
    result.innerHTML = App.showAlert(err.message || 'Usuario de Roblox no encontrado', 'danger');
  }
}

// Para cuando el DNI YA existe: refresca la foto de Roblox y la guarda directo, sin tocar el resto del DNI
async function dniActualizarAvatar() {
  const username = document.getElementById('dni-roblox').value.trim();
  const result = document.getElementById('dni-roblox-result');
  if (!username) { result.innerHTML = App.showAlert('Ingresá tu usuario de Roblox', 'danger'); return; }
  result.innerHTML = '<p style="color:var(--text-muted);font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Actualizando...</p>';
  try {
    const data = await API.getAvatarRoblox(username);
    const response = await API.updateProfile({ robloxUsername: username, robloxAvatar: data.avatarUrl, dniFoto: data.avatarUrl });
    if (response && response.user) Object.assign(Auth.currentUser, response.user);
    result.innerHTML = App.showAlert(`Avatar de ${data.displayName || data.username} actualizado`, 'success');
    App.navigate('dni');
  } catch (err) {
    result.innerHTML = App.showAlert(err.message || 'Usuario de Roblox no encontrado', 'danger');
  }
}

async function crearDNI() {
  const rut = document.getElementById('dni-rut').value;
  if (!rut || rut === 'Generando...') {
    document.getElementById('dni-result').innerHTML = App.showAlert('Elegí tu fecha de nacimiento para generar el RUT primero', 'danger');
    return;
  }

  const fechaNacimiento = document.getElementById('dni-fechaNacimiento').value;
  const hoy = new Date();
  const vencimiento = new Date();
  vencimiento.setFullYear(vencimiento.getFullYear() + 8);

  const fields = {
    nombre: document.getElementById('dni-nombre').value,
    rut,
    dniNumero: document.getElementById('dni-numero').value,
    fechaNacimiento,
    sexo: document.getElementById('dni-sexo').value,
    nacionalidad: document.getElementById('dni-nacionalidad').value,
    dniFechaEmision: hoy.toISOString().split('T')[0],
    dniFechaVencimiento: vencimiento.toISOString().split('T')[0],
    dniFirma: document.getElementById('dni-firma').value,
    dniFoto: window._dniAvatarPendiente || '',
    robloxUsername: document.getElementById('dni-roblox').value.trim(),
    robloxAvatar: window._dniAvatarPendiente || ''
  };

  if (fechaNacimiento) {
    const birth = new Date(fechaNacimiento);
    const now = new Date();
    let edad = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      edad--;
    }
    fields.edad = edad;
  }

  try {
    const response = await API.updateProfile(fields);
    if (response && response.user) Object.assign(Auth.currentUser, response.user);
    Auth.updateUI();
    if (Auth.currentUser.rut) App.applyRoleFilter();
    document.getElementById('dni-result').innerHTML = App.showAlert('DNI creado correctamente', 'success');
    App.navigate('dni');
  } catch (err) {
    document.getElementById('dni-result').innerHTML = App.showAlert('Error al guardar: ' + err.message, 'danger');
  }
}
