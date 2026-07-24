const App = {
  currentPage: 'inicio',
  pages: {},
  initialized: false,

  async init() {
    this.setupClock();
    this.setupModal();

    document.getElementById('page-content').innerHTML = `
      <div style="text-align:center;padding:120px 20px;">
        <i class="fas fa-shield-alt fa-spin" style="font-size:64px;background:linear-gradient(135deg,var(--accent),var(--info));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"></i>
        <p style="margin-top:24px;font-size:18px;font-weight:700;background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Chile Metropolitano</p>
        <p style="margin-top:8px;color:var(--text-muted);font-size:14px;">Conectando con el servidor...</p>
        <div class="progress-bar" style="max-width:300px;margin:20px auto 0;height:4px;"><div class="progress-fill" style="width:100%;animation:progressGlow 2s ease-in-out infinite;"></div></div>
      </div>
    `;

    // Red de seguridad: si algo se cuelga más de 15s, se muestra un error en vez de dejar el spinner pegado
    const timeoutId = setTimeout(() => {
      const content = document.getElementById('page-content');
      if (content && content.innerHTML.includes('Conectando con el servidor')) {
        content.innerHTML = `
          <div style="text-align:center;padding:120px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--danger,#e74c3c);"></i>
            <p style="margin-top:16px;font-size:16px;">La carga está tardando demasiado.</p>
            <p style="margin-top:4px;color:var(--text-muted);font-size:13px;">Puede que el servidor no esté respondiendo. Revisa la consola (F12) o recarga la página.</p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="location.reload()"><i class="fas fa-sync-alt"></i> Recargar</button>
          </div>
        `;
      }
    }, 15000);

    try {
      // Si venimos de vuelta del OAuth2 de Discord, la URL trae ?token=...
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get('token');
      const oauthError = params.get('error');
      if (oauthToken) {
        API.setToken(oauthToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      let loggedIn = await Auth.init();

      if (!loggedIn && oauthToken) {
        const res = await Auth.loadSession();
        loggedIn = res.success;
      }

      if (loggedIn) {
        await API.loadAll();
        this.applyRoleFilter();
      } else {
        this.hideAllNavSections();
      }

      this.initialized = true;
      this.registerPages();
      this.setupNavigation();

      if (loggedIn) {
        if (!Auth.currentUser.rut) {
          this.hideAllNavSections();
          this.navigate('dni');
        } else {
          this.navigate('inicio');
        }
      } else {
        this.showLogin(oauthError);
      }
    } catch (err) {
      console.error('[App] Error inesperado durante el inicio:', err);
      document.getElementById('page-content').innerHTML = `
        <div style="text-align:center;padding:120px 20px;">
          <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--danger,#e74c3c);"></i>
          <p style="margin-top:16px;font-size:16px;">Ocurrió un error al iniciar el portal.</p>
          <p style="margin-top:4px;color:var(--text-muted);font-size:13px;">${err.message || 'Error desconocido'}</p>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="location.reload()"><i class="fas fa-sync-alt"></i> Recargar</button>
        </div>
      `;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  showLogin(oauthError) {
    document.getElementById('page-title').textContent = 'Iniciar Sesión';
    document.getElementById('page-content').innerHTML = `
      <div class="card" style="max-width:440px;margin:40px auto;text-align:center;">
        <div style="margin-bottom:24px;">
          <img src="img/logo.png" alt="Logo" class="login-logo-simple" style="width:56px;height:56px;filter:drop-shadow(0 0 12px var(--accent-glow));">
          <h1 style="font-size:24px;margin:8px 0 4px;background:linear-gradient(135deg,var(--accent),#fff,var(--info));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200%;animation:gradientShift 4s ease infinite;">Chile Metropolitano</h1>
          <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Ingresa con tu cuenta de Discord para acceder al portal.</p>
        </div>
        ${oauthError ? `<div class="alert alert-danger" style="margin-bottom:16px;"><i class="fas fa-times-circle"></i> No se pudo verificar tu cuenta de Discord. Intenta de nuevo.</div>` : ''}
        <button type="button" class="btn btn-primary btn-block" style="background:#5865F2;border-color:#5865F2;" onclick="Auth.loginWithDiscord()">
          <i class="fab fa-discord"></i> Entrar al Portal
        </button>
        <div id="auth-result" style="margin-top:12px;"></div>
      </div>
    `;
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { input.type = 'password'; icon.className = 'fas fa-eye'; }
  },

  showAlertMsg(msg, type) {
    const result = document.getElementById('auth-result');
    if (result) result.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  },

  applyRoleFilter() {
    const role = Auth.currentUser ? Auth.currentUser.rol : 'ciudadano';
    document.querySelectorAll('#main-nav .nav-section').forEach(section => {
      const roles = (section.dataset.roles || '').split(',');
      section.style.display = roles.includes(role) ? '' : 'none';
    });
    this.updateRoleBadge();
  },

  hideAllNavSections() {
    document.querySelectorAll('#main-nav .nav-section').forEach(s => s.style.display = 'none');
  },

  updateRoleBadge() {
    const badge = document.getElementById('user-role-badge');
    if (!badge || !Auth.currentUser) return;
    const roleNames = { ciudadano: 'Ciudadano', carabinero: 'Carabinero', pdi: 'PDI', municipal: 'Municipal', admin: 'Admin' };
    const roleColors = { ciudadano: '#95a5a6', carabinero: '#2ecc71', pdi: '#3498db', municipal: '#9b59b6', admin: '#f1c40f' };
    badge.textContent = roleNames[Auth.currentUser.rol] || 'Ciudadano';
    badge.style.display = 'inline';
    badge.style.color = roleColors[Auth.currentUser.rol] || '#95a5a6';
  },

  getAllowedPages() {
    const role = Auth.currentUser ? Auth.currentUser.rol : 'ciudadano';
    const common = ['inicio', 'dashboard', 'dni', 'banco', 'tienda', 'concesionario', 'inventario', 'od-sistema', 'ranking', 'casino'];
    const rolePages = {
      ciudadano: [],
      carabinero: ['carabineros-comisaria', 'carabineros-aupol'],
      pdi: ['pdi-prefectura', 'pdi-gepol'],
      municipal: ['municipalidad-seguridad'],
      admin: ['carabineros-comisaria', 'carabineros-aupol', 'pdi-prefectura', 'pdi-gepol', 'municipalidad-seguridad', 'admin-panel', 'panel-staff', 'gestion-usuarios', 'gestion-roles', 'gestion-economia']
    };
    return [...new Set([...common, ...(rolePages[role] || [])])];
  },

  registerPages() {
    this.pages = {
      inicio: () => this.renderInicio(),
      dashboard: () => this.renderDashboard(),
      dni: () => renderDNI(),
      banco: () => renderBanco(),
      tienda: () => renderTienda(),
      concesionario: async () => await renderConcesionario(),
      inventario: async () => await renderInventario(),
      'carabineros-comisaria': () => renderComisaria(),
      'carabineros-aupol': () => renderAUPOL(),
      'pdi-prefectura': () => renderPrefectura(),
      'pdi-gepol': () => renderGEPOL(),
      'municipalidad-seguridad': () => renderSeguridad(),
      'od-sistema': () => renderODSistema(),
      casino: () => renderCasino(),
      ranking: async () => await renderRanking(),
      'admin-panel': async () => await renderAdminPanel(),
      'panel-staff': async () => await renderPanelStaff(),
      'gestion-usuarios': async () => await renderGestionUsuarios(),
      'gestion-roles': async () => await renderGestionRoles(),
      'gestion-economia': async () => await renderGestionEconomia(),
    };
  },

  navigate(page) {
    if (!this.initialized || !Auth.isLoggedIn) {
      this.showLogin();
      return;
    }
    // Mientras no tenga su RUT (DNI completo), lo mandamos siempre a Crear DNI
    if (Auth.currentUser && !Auth.currentUser.rut && page !== 'dni') {
      page = 'dni';
    }
    const allowed = this.getAllowedPages();
    if (!allowed.includes(page)) {
      const content = document.getElementById('page-content');
      content.innerHTML = `
        <div class="card" style="max-width:540px;margin:60px auto;text-align:center;">
          <i class="fas fa-lock" style="font-size:64px;color:var(--danger);margin-bottom:16px;display:block;opacity:0.6;"></i>
          <h3 style="color:var(--danger);margin-bottom:8px;">Acceso Denegado</h3>
          <p style="color:var(--text-muted);margin-bottom:20px;">No tienes permisos para acceder a esta sección. Tu rol actual no está autorizado.</p>
          <button class="btn btn-primary" onclick="App.navigate('inicio')"><i class="fas fa-home"></i> Volver al Inicio</button>
        </div>
      `;
      document.getElementById('page-title').textContent = 'Acceso Denegado';
      return;
    }
    this.currentPage = page;
    const content = document.getElementById('page-content');
    const title = document.getElementById('page-title');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    const titles = {
      inicio: 'Inicio', dashboard: 'Dashboard', dni: 'Crear DNI',
      banco: 'Banco', tienda: 'Tienda', concesionario: 'Concesionario', inventario: 'Mis Pertenencias',
      'carabineros-comisaria': 'Comisaría Virtual - Carabineros',
      'carabineros-aupol': 'AUPOL - Carabineros',
      'pdi-prefectura': 'Prefectura Virtual - PDI',
      'pdi-gepol': 'GEPOL - PDI',
      'municipalidad-seguridad': 'SNSM - Sistema Nacional de Seguridad Municipal',
      'od-sistema': 'Sistema OD',
      casino: 'Casino',
      ranking: 'Ranking — Top 10',
      'admin-panel': 'Panel de Administración',
      'panel-staff': 'Panel de Staff',
      'gestion-usuarios': 'Gestión de Usuarios',
    };

    title.textContent = titles[page] || 'Chile Metropolitano';

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      if (page === 'inicio') {
        backBtn.classList.add('hidden');
      } else {
        backBtn.classList.remove('hidden');
      }
    }
    if (this.pages[page]) {
      const result = this.pages[page]();
      if (result instanceof Promise) {
        result.then(html => { content.innerHTML = html; }).catch(err => {
          console.error('Error rendering page:', err);
          content.innerHTML = '<div class="alert alert-danger">Error cargando la página</div>';
        });
      } else {
        content.innerHTML = result;
      }
    }

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }

    setTimeout(() => {
      content.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const parent = this.closest('.tabs');
          parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          parent.parentElement.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
          const target = document.getElementById(this.dataset.tab);
          if (target) target.classList.add('active');
        });
      });
    }, 50);
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      Auth.logout();
      window.DB = null;
      this.showLogin();
    });
  },

  setupClock() {
    function updateClock() {
      const now = new Date();
      const opts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const el = document.getElementById('clock');
      if (el) el.textContent = now.toLocaleDateString('es-CL', opts);
    }
    updateClock();
    setInterval(updateClock, 1000);
  },

  setupModal() {
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.add('hidden');
    });
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('modal-overlay').classList.add('hidden');
      }
    });
  },

  showModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  showAlert(msg, type = 'success') {
    return `<div class="alert alert-${type}">${msg}</div>`;
  },

  getModuleCards() {
    const role = Auth.currentUser ? Auth.currentUser.rol : 'ciudadano';
    const allModules = {
      dashboard:   { icon:'fa-tachometer-alt', color:'var(--info)',     title:'Dashboard',           desc:'Panel de control y estadísticas',       roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      dni:         { icon:'fa-id-card',        color:'var(--warning)',  title:'Crear DNI',            desc:'Cédula de identidad oficial',           roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      banco:       { icon:'fa-university',     color:'var(--success)',  title:'Banco',                desc:'Transferencias y finanzas',             roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      tienda:      { icon:'fa-store',          color:'var(--accent)',   title:'Tienda',               desc:'Equipamiento y suministros',            roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      concesionario:{ icon:'fa-car',           color:'#3498db',         title:'Concesionario',        desc:'Compra el vehículo de tus sueños',      roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      inventario:  { icon:'fa-briefcase',       color:'var(--info)',     title:'Mis Pertenencias',    desc:'Vehículos, documentos e items comprados',     roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      'carabineros-comisaria':  { icon:'fa-building',     color:'#2ecc71', title:'Comisaría Virtual', desc:'Denuncias Carabineros',        roles:['carabinero','admin'] },
      'carabineros-aupol':      { icon:'fa-search',       color:'#2ecc71', title:'AUPOL',             desc:'Sistema de consultas policiales', roles:['carabinero','admin'] },
      'pdi-prefectura':         { icon:'fa-building',     color:'#3498db', title:'Prefectura PDI',    desc:'Denuncias e Investigaciones',    roles:['pdi','admin'] },
      'pdi-gepol':              { icon:'fa-search',       color:'#3498db', title:'GEPOL',             desc:'Gestión criminal PDI',           roles:['pdi','admin'] },
      'municipalidad-seguridad':{ icon:'fa-shield-alt',   color:'#9b59b6', title:'SNSM',              desc:'Base de datos ciudadana municipal', roles:['municipal','admin'] },
      'od-sistema':             { icon:'fa-cogs',         color:'#f1c40f', title:'Sistema OD',        desc:'Mercado negro y organizaciones',  roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      casino:                   { icon:'fa-dice',         color:'#e74c3c', title:'Casino',            desc:'Ruleta, blackjack, minas y más',  roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      ranking:                  { icon:'fa-trophy',       color:'#f1c40f', title:'Ranking',           desc:'Top 10 con más plata',            roles:['ciudadano','carabinero','pdi','municipal','admin'] },
      'admin-panel':            { icon:'fa-crown',        color:'#f1c40f', title:'Panel Admin',       desc:'Administración del servidor',     roles:['admin'] },
      'panel-staff':            { icon:'fa-user-shield',  color:'#DA291C', title:'Panel de Staff',    desc:'Cédulas, vehículos, propiedades, saldos y más', roles:['admin'] },
      'gestion-usuarios':       { icon:'fa-users-cog',    color:'#f1c40f', title:'Gestión de Usuarios', desc:'Asigná el rol de cada persona', roles:['admin'] },
    };
    return Object.entries(allModules)
      .filter(([key, m]) => m.roles.includes(role))
      .map(([page, m]) => ({ page, ...m }));
  },

  renderInicio() {
    const u = Auth.currentUser;
    const rangoInfo = Auth.getRango(u ? u.nivel : 1);
    const role = u ? u.rol : 'ciudadano';
    const roleNames = { ciudadano:'Ciudadano', carabinero:'Carabinero', pdi:'PDI', municipal:'Municipal', admin:'Administrador' };
    const modules = this.getModuleCards();

    return `
      ${u ? `<div class="card welcome-card">
        <div class="welcome-avatar">
          ${u.robloxAvatar ? `<img src="${u.robloxAvatar}" alt="Avatar">` : `<i class="fas fa-user-circle"></i>`}
        </div>
        <div class="welcome-info">
          <h3>¡Bienvenido, ${u.nombre}!</h3>
          <div class="welcome-badges">
            <span class="rp-badge" style="background:${this.getRoleColor(role)}33;color:${this.getRoleColor(role)};">${roleNames[role] || role}</span>
            <span class="rp-badge" style="background:var(--warning)33;color:var(--warning);">Nivel ${u.nivel} - ${rangoInfo.rango}</span>
            <span class="rp-badge" style="background:var(--success)33;color:var(--success);">$${u.dinero.toLocaleString()}</span>
            ${u.dineroNegro > 0 ? `<span class="rp-badge" style="background:var(--danger)33;color:var(--danger);">$${u.dineroNegro.toLocaleString()} <small>negro</small></span>` : ''}
          </div>
        </div>
      </div>` : ''}

      <div class="section-title">
        <h3><i class="fas fa-th-large"></i> Accesos Rápidos</h3>
      </div>
      <div class="quick-access-grid">
        ${modules.map(m => `
          <div class="quick-access-item" onclick="App.navigate('${m.page}')">
            <div class="quick-access-icon" style="background:${m.color}22;color:${m.color};">
              <i class="fas ${m.icon}"></i>
            </div>
            <div class="quick-access-text">
              <h4>${m.title}</h4>
              <p>${m.desc}</p>
            </div>
            <i class="fas fa-chevron-right quick-access-arrow"></i>
          </div>
        `).join('')}
      </div>
    `;
  },

  getRoleColor(rol) {
    const colors = { ciudadano: '#95a5a6', carabinero: '#2ecc71', pdi: '#3498db', municipal: '#9b59b6', admin: '#f1c40f' };
    return colors[rol] || '#95a5a6';
  },

  renderDashboard() {
    const u = Auth.currentUser;
    const DB = window.DB || {};
    const role = u ? u.rol : 'ciudadano';
    const isCiudadano = role === 'ciudadano';
    const isCarabinero = role === 'carabinero';
    const isPDI = role === 'pdi';
    const isMunicipal = role === 'municipal';
    const isAdmin = role === 'admin';
    const isPolicial = isCarabinero || isPDI || isAdmin;
    const isAutoridad = isPolicial || isMunicipal;

    const allDenuncias = DB.denuncias || [];
    const allPersonas = DB.personasBuscadas || [];
    const allInvestigaciones = DB.investigaciones || [];
    const allIncautaciones = DB.incautaciones || [];
    const allFuncionarios = DB.funcionarios || [];
    const allMultas = DB.multas || [];
    const allVehiculos = DB.vehiculos || [];
    const allSumarios = DB.sumarios || [];
    const allAntecedentes = DB.antecedentes || [];
    const niveles = DB.niveles || [];

    const misDenuncias = isCiudadano
      ? allDenuncias.filter(d => d.userId === (u ? u.id : null) || d.anonimo === true)
      : isCarabinero ? allDenuncias.filter(d => d.institucion === 'Carabineros')
      : isPDI ? allDenuncias.filter(d => d.institucion === 'PDI')
      : isMunicipal ? allDenuncias.filter(d => d.institucion === 'Municipalidad Providencia' || d.institucion === 'Municipalidad')
      : allDenuncias;

    const denunciasActivas = misDenuncias.filter(d => d.estado !== 'Cerrada').length;
    const rangoInfo = Auth.getRango(u ? u.nivel : 1);

    const expProximo = niveles.find(n => n.nivel === (u ? u.nivel + 1 : 2));
    const expFaltante = expProximo ? expProximo.exp - (u ? u.exp : 0) : 0;
    const expActualNivel = niveles.find(n => n.nivel === (u ? u.nivel : 1));
    const expMin = expActualNivel ? expActualNivel.exp : 0;
    const expMax = expProximo ? expProximo.exp : (expActualNivel ? expActualNivel.exp + 2000 : 2000);
    const expPorcentaje = expMax > expMin ? Math.min(100, Math.max(0, ((u ? u.exp : 0) - expMin) / (expMax - expMin) * 100)) : 100;

    const misMultas = isCiudadano ? allMultas.filter(m => m.rut === (u ? u.rut : '')) : allMultas;
    const personasProfugas = allPersonas.filter(p => p.estado === 'Prófugo').length;
    const investigacionesActivas = allInvestigaciones.filter(i => i.estado === 'Activa').length;
    const sumariosActivos = allSumarios.filter(s => s.estado !== 'Cerrado').length;
    const vehiculosEncargo = allVehiculos.filter(v => v.estado && v.estado.includes('Encargo')).length;

    const seccionStats = () => {
      if (isAdmin) return `
        <div class="grid-4">
          <div class="stat-card"><i class="fas fa-file-alt" style="color:var(--info);"></i><span class="stat-value">${allDenuncias.length}</span><span class="stat-label">Total Denuncias</span></div>
          <div class="stat-card"><i class="fas fa-exclamation-circle" style="color:var(--warning);"></i><span class="stat-value">${denunciasActivas}</span><span class="stat-label">Denuncias Activas</span></div>
          <div class="stat-card"><i class="fas fa-search" style="color:var(--accent);"></i><span class="stat-value">${investigacionesActivas}</span><span class="stat-label">Investigaciones</span></div>
          <div class="stat-card"><i class="fas fa-user-tie" style="color:var(--success);"></i><span class="stat-value">${allFuncionarios.length}</span><span class="stat-label">Funcionarios</span></div>
        </div>`;
      if (isCiudadano) return `
        <div class="grid-3">
          <div class="stat-card"><i class="fas fa-file-alt" style="color:var(--info);"></i><span class="stat-value">${misDenuncias.length}</span><span class="stat-label">Mis Denuncias</span></div>
          <div class="stat-card"><i class="fas fa-ticket-alt" style="color:var(--warning);"></i><span class="stat-value">${misMultas.filter(m => !m.pagada).length}</span><span class="stat-label">Multas Pendientes</span></div>
          <div class="stat-card"><i class="fas fa-car" style="color:var(--success);"></i><span class="stat-value">${allVehiculos.filter(v => v.rutDuenio === (u ? u.rut : '')).length}</span><span class="stat-label">Mis Vehículos</span></div>
        </div>`;
      if (isPolicial) return `
        <div class="grid-4">
          <div class="stat-card"><i class="fas fa-file-alt" style="color:var(--info);"></i><span class="stat-value">${misDenuncias.length}</span><span class="stat-label">Denuncias ${isCarabinero ? 'Carabineros' : 'PDI'}</span></div>
          <div class="stat-card"><i class="fas fa-exclamation-circle" style="color:var(--warning);"></i><span class="stat-value">${denunciasActivas}</span><span class="stat-label">Activas</span></div>
          <div class="stat-card"><i class="fas fa-search" style="color:var(--accent);"></i><span class="stat-value">${investigacionesActivas}</span><span class="stat-label">Investigaciones</span></div>
          <div class="stat-card"><i class="fas fa-box" style="color:var(--danger);"></i><span class="stat-value">${allIncautaciones.length}</span><span class="stat-label">Incautaciones</span></div>
        </div>`;
      if (isMunicipal) return `
        <div class="grid-4">
          <div class="stat-card"><i class="fas fa-file-alt" style="color:#9b59b6;"></i><span class="stat-value">${misDenuncias.length}</span><span class="stat-label">Denuncias Municipales</span></div>
          <div class="stat-card"><i class="fas fa-exclamation-circle" style="color:var(--warning);"></i><span class="stat-value">${denunciasActivas}</span><span class="stat-label">Activas</span></div>
          <div class="stat-card"><i class="fas fa-ticket-alt" style="color:var(--danger);"></i><span class="stat-value">${allMultas.filter(m => m.institucion === 'Municipalidad').length}</span><span class="stat-label">Multas Emitidas</span></div>
          <div class="stat-card"><i class="fas fa-gavel" style="color:var(--info);"></i><span class="stat-value">${sumariosActivos}</span><span class="stat-label">Sumarios</span></div>
        </div>`;
    };

    const seccionTablas = () => {
      if (isCiudadano) return `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-gavel"></i> Mis Denuncias</h3></div>
            <table class="table-dash"><thead><tr><th>Tipo</th><th>Estado</th><th>Institución</th></tr></thead>
              <tbody>${misDenuncias.slice(0, 5).map(d => `<tr><td>${d.tipo}</td><td><span class="badge badge-${d.estado === 'Cerrada' ? 'success' : d.estado === 'En Investigación' ? 'info' : 'warning'}">${d.estado}</span></td><td>${d.institucion}</td></tr>`).join('')}
              ${misDenuncias.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">No has hecho denuncias</td></tr>' : ''}
              </tbody></table>
          </div>
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-ticket-alt"></i> Mis Multas</h3></div>
            <table class="table-dash"><thead><tr><th>Motivo</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>${misMultas.slice(0, 5).map(m => `<tr><td>${m.motivo}</td><td>$${m.monto.toLocaleString()}</td><td><span class="badge badge-${m.pagada ? 'success' : 'danger'}">${m.pagada ? 'Pagada' : 'Pendiente'}</span></td></tr>`).join('')}
              ${misMultas.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">Sin multas</td></tr>' : ''}
              </tbody></table>
          </div>
        </div>`;
      if (isAutoridad) return `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-gavel"></i> Denuncias Recientes</h3></div>
            <table class="table-dash"><thead><tr><th>Tipo</th><th>Estado</th><th>Institución</th></tr></thead>
              <tbody>${misDenuncias.slice(0, 5).map(d => `<tr><td>${d.tipo}</td><td><span class="badge badge-${d.estado === 'Cerrada' ? 'success' : d.estado === 'En Investigación' ? 'info' : 'warning'}">${d.estado}</span></td><td>${d.institucion}</td></tr>`).join('')}
              ${misDenuncias.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">Sin denuncias</td></tr>' : ''}
              </tbody></table>
          </div>
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-crosshairs"></i> Personas Buscadas</h3></div>
            <table class="table-dash"><thead><tr><th>Nombre</th><th>Delito</th><th>Estado</th></tr></thead>
              <tbody>${allPersonas.map(p => `<tr><td>${p.nombre}</td><td>${p.delito}</td><td><span class="badge badge-${p.estado === 'Capturado' ? 'success' : 'danger'}">${p.estado}</span></td></tr>`).join('')}
              ${allPersonas.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">Sin buscados</td></tr>' : ''}
              </tbody></table>
          </div>
        </div>`;
    };

    const seccionAcciones = () => {
      let btns = `
        <button class="btn btn-primary btn-block" onclick="App.navigate('dni')"><i class="fas fa-id-card"></i> Ver / Editar DNI</button>
        <button class="btn btn-success btn-block" onclick="App.navigate('banco')"><i class="fas fa-university"></i> Ir al Banco</button>
        <button class="btn btn-info btn-block" onclick="App.navigate('tienda')"><i class="fas fa-store"></i> Ir a la Tienda</button>`;
      if (isCarabinero) btns += `<button class="btn btn-block" style="background:#2ecc71;color:#000;" onclick="App.navigate('carabineros-comisaria')"><i class="fas fa-building"></i> Comisaría Virtual</button>`;
      if (isPDI) btns += `<button class="btn btn-block" style="background:#3498db;color:#fff;" onclick="App.navigate('pdi-prefectura')"><i class="fas fa-building"></i> Prefectura PDI</button>`;
      if (isMunicipal) btns += `<button class="btn btn-block" style="background:#9b59b6;color:#fff;" onclick="App.navigate('municipalidad-seguridad')"><i class="fas fa-shield-alt"></i> SNSM</button>`;
      if (isAdmin) btns += `<button class="btn btn-block" style="background:#f1c40f;color:#000;" onclick="App.navigate('admin-panel')"><i class="fas fa-crown"></i> Panel Admin</button>`;
      btns += `<button class="btn btn-warning btn-block" onclick="API.loadAll().then(() => App.navigate('dashboard'))"><i class="fas fa-sync-alt"></i> Refrescar Datos</button>`;
      return btns;
    };

    const seccionResumen = () => {
      if (isCiudadano) return '';
      return `
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-activity"></i> Resumen del Servidor</h3></div>
          <div class="dash-summary">
            ${isPolicial || isAdmin ? `
              <div class="dash-summary-item"><i class="fas fa-car-crash" style="color:var(--warning);"></i><div><strong>${vehiculosEncargo}</strong><small>Vehículos con encargo</small></div></div>
              <div class="dash-summary-item"><i class="fas fa-user-slash" style="color:var(--danger);"></i><div><strong>${personasProfugas}</strong><small>Prófugos buscados</small></div></div>
              <div class="dash-summary-item"><i class="fas fa-search" style="color:var(--accent);"></i><div><strong>${investigacionesActivas}</strong><small>Investigaciones activas</small></div></div>
            ` : ''}
            <div class="dash-summary-item"><i class="fas fa-gavel" style="color:var(--info);"></i><div><strong>${sumariosActivos}</strong><small>Sumarios pendientes</small></div></div>
            <div class="dash-summary-item"><i class="fas fa-users" style="color:var(--success);"></i><div><strong>${allFuncionarios.length}</strong><small>Funcionarios activos</small></div></div>
          </div>
        </div>`;
    };

    return `
      <div class="grid-4">
        <div class="stat-card"><i class="fas fa-user" style="color:var(--info);"></i><span class="stat-value">${u ? u.nivel : 1}</span><span class="stat-label">Nivel</span></div>
        <div class="stat-card"><i class="fas fa-star" style="color:var(--warning);"></i><span class="stat-value">${rangoInfo.rango}</span><span class="stat-label">Rango</span></div>
        <div class="stat-card"><i class="fas fa-dollar-sign" style="color:var(--success);"></i><span class="stat-value">$${(u ? u.dinero : 0).toLocaleString()}</span><span class="stat-label">Dinero Legal</span></div>
        <div class="stat-card"><i class="fas fa-backpack" style="color:var(--accent);"></i><span class="stat-value">${u && u.inventario ? u.inventario.reduce(function(s,i){return s+(i.cantidad||1);},0) : 0}</span><span class="stat-label">Items Inventario</span></div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-line"></i> Progreso de Experiencia</h3></div>
        <div style="margin-bottom:6px;display:flex;justify-content:space-between;font-size:13px;">
          <span>EXP: <strong>${(u ? u.exp : 0).toLocaleString()}</strong> / ${expMax.toLocaleString()}</span>
          <span>${expFaltante > 0 ? `<strong>${expFaltante.toLocaleString()}</strong> EXP para Nivel ${(u ? u.nivel + 1 : 2)}` : '<span style="color:var(--accent);">¡Nivel Máximo!</span>'}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${expPorcentaje}%;background:linear-gradient(90deg,var(--accent),var(--warning));"></div>
        </div>
      </div>

      ${!isCiudadano ? `<div class="section-title"><h3><i class="fas fa-chart-pie"></i> Estadísticas de ${isCarabinero ? 'Carabineros' : isPDI ? 'PDI' : isMunicipal ? 'Municipalidad' : 'Administración'}</h3></div>` : `<div class="section-title"><h3><i class="fas fa-chart-pie"></i> Mis Estadísticas</h3></div>`}
      ${seccionStats()}

      ${seccionTablas()}

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-clipboard-list"></i> Acciones Rápidas</h3></div>
          <div class="quick-actions">${seccionAcciones()}</div>
        </div>
        ${seccionResumen()}
      </div>
    `;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());