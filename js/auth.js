const Auth = {
  currentUser: null,
  isLoggedIn: false,

  async init() {
    const token = localStorage.getItem('cm_token');
    if (token) {
      try {
        this.currentUser = await API.getMe();
        this.isLoggedIn = true;
      } catch {
        localStorage.removeItem('cm_token');
        API.token = null;
      }
    }
    this.updateUI();
    return this.isLoggedIn;
  },

  loginWithDiscord() {
    window.location.href = '/api/auth/discord';
  },

  async loadSession() {
    try {
      this.currentUser = await API.getMe();
      this.isLoggedIn = true;
      this.updateUI();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  logout() {
    this.currentUser = null;
    this.isLoggedIn = false;
    localStorage.removeItem('cm_token');
    API.token = null;
  },

  getRango(nivel) {
    if (!window.DB || !window.DB.niveles) return { nivel: 1, rango: 'Principiante' };
    const r = window.DB.niveles.filter(n => n.nivel <= nivel);
    return r.length ? r[r.length - 1] : { nivel: 1, rango: 'Principiante' };
  },

  updateUI() {
    const el = document.getElementById('user-name');
    if (el && this.currentUser) {
      el.textContent = this.currentUser.nombre;
    }
    const badge = document.getElementById('user-role-badge');
    if (badge && this.currentUser) {
      const names = { ciudadano: 'Ciudadano', carabinero: 'Carabinero', pdi: 'PDI', municipal: 'Municipal', admin: 'Admin', medico: 'Médico' };
      const colors = { ciudadano: '#95a5a6', carabinero: '#2ecc71', pdi: '#3498db', municipal: '#9b59b6', admin: '#f1c40f', medico: '#e91e63' };
      badge.textContent = names[this.currentUser.rol] || 'Ciudadano';
      badge.style.display = 'inline';
      badge.style.color = colors[this.currentUser.rol] || '#95a5a6';
    }
  }
};
