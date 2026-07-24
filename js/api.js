const API = {
  token: localStorage.getItem('cm_token'),
  base: '/api',

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  async fetch(url, options = {}) {
    try {
      const res = await fetch(`${this.base}${url}`, { ...options, headers: this.headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');
      return data;
    } catch (err) {
      console.error(`[API] ${url}:`, err.message);
      throw err;
    }
  },

  setToken(token) {
    this.token = token;
    localStorage.setItem('cm_token', token);
  },

  async getMe() {
    return (await this.fetch('/auth/me')).user;
  },

  async updateProfile(updates) {
    return this.fetch('/auth/update', { method: 'PUT', body: JSON.stringify(updates) });
  },

  async generarRut(fechaNacimiento) {
    return this.fetch('/auth/generar-rut', { method: 'POST', body: JSON.stringify({ fechaNacimiento }) });
  },

  async getAvatarRoblox(username) {
    return this.fetch(`/roblox/avatar?username=${encodeURIComponent(username)}`);
  },

  async comprar(monto) {
    return this.fetch('/auth/comprar', { method: 'POST', body: JSON.stringify({ monto }) });
  },

  async getUsers() {
    return this.fetch('/auth/users');
  },

  async getTopRicos(limite = 10) {
    return this.fetch(`/auth/top-ricos?limite=${limite}`);
  },

  async updateUserRol(userId, rol) {
    return this.fetch(`/auth/users/${userId}/rol`, { method: 'PUT', body: JSON.stringify({ rol }) });
  },

  async updateUserDinero(userId, dinero, dineroNegro) {
    return this.fetch(`/auth/users/${userId}/dinero`, { method: 'PUT', body: JSON.stringify({ dinero, dineroNegro }) });
  },

  async getDenuncias(query = '') {
    return this.fetch(`/denuncias${query}`);
  },

  async getMisDenuncias() {
    return this.fetch('/denuncias/mis');
  },

  async createDenuncia(data) {
    return this.fetch('/denuncias', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateDenunciaEstado(id, estado) {
    return this.fetch(`/denuncias/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) });
  },

  async getFuncionarios(unidad = '') {
    return this.fetch(`/funcionarios${unidad ? `?unidad=${unidad}` : ''}`);
  },

  async createSumario(id, motivo) {
    return this.fetch(`/funcionarios/${id}/sumario`, {
      method: 'POST', body: JSON.stringify({ motivo })
    });
  },

  async getInvestigaciones(estado = '') {
    return this.fetch(`/investigaciones${estado ? `?estado=${estado}` : ''}`);
  },

  async createInvestigacion(data) {
    return this.fetch('/investigaciones', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateInvestigacion(id, data) {
    return this.fetch(`/investigaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async toggleInvestigacion(id) {
    return this.fetch(`/investigaciones/${id}/toggle`, { method: 'PUT' });
  },

  async agregarEvidenciaInvestigacion(id, texto) {
    return this.fetch(`/investigaciones/${id}/evidencia`, { method: 'POST', body: JSON.stringify({ texto }) });
  },

  async getPersonasBuscadas(estado = '') {
    return this.fetch(`/personas-buscadas${estado ? `?estado=${estado}` : ''}`);
  },

  async createPersonaBuscada(data) {
    return this.fetch('/personas-buscadas', { method: 'POST', body: JSON.stringify(data) });
  },

  async capturarPersona(id) {
    return this.fetch(`/personas-buscadas/${id}/capturar`, { method: 'PUT' });
  },

  async getIncautaciones(institucion = '') {
    return this.fetch(`/incautaciones${institucion ? `?institucion=${institucion}` : ''}`);
  },

  async createIncautacion(data) {
    return this.fetch('/incautaciones', { method: 'POST', body: JSON.stringify(data) });
  },

  async incautarDesdeInventario(rut, itemId, procedencia) {
    return this.fetch('/incautaciones/desde-inventario', { method: 'POST', body: JSON.stringify({ rut, itemId, procedencia }) });
  },

  async updateIncautacionEstado(id, estado) {
    return this.fetch(`/incautaciones/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) });
  },

  async getMultas(rut = '', institucion = '') {
    let q = '';
    if (rut) q += `rut=${rut}&`;
    if (institucion) q += `institucion=${institucion}`;
    return this.fetch(`/multas${q ? '?' + q : ''}`);
  },

  async createMulta(data) {
    return this.fetch('/multas', { method: 'POST', body: JSON.stringify(data) });
  },

  async pagarMulta(id) {
    return this.fetch(`/multas/${id}/pagar`, { method: 'PUT' });
  },

  async getVehiculos() {
    return this.fetch('/vehiculos');
  },

  async searchVehiculos(q) {
    return this.fetch(`/vehiculos/search?q=${encodeURIComponent(q)}`);
  },

  async createVehiculo(data) {
    return this.fetch('/vehiculos', { method: 'POST', body: JSON.stringify(data) });
  },

  async getBienes(rutDuenio = '') {
    return this.fetch(`/bienes${rutDuenio ? `?rutDuenio=${rutDuenio}` : ''}`);
  },

  async createBien(data) {
    return this.fetch('/bienes', { method: 'POST', body: JSON.stringify(data) });
  },

  async getAntecedentes(rut = '', institucion = '') {
    let q = '';
    if (rut) q += `rut=${rut}&`;
    if (institucion) q += `institucion=${institucion}`;
    return this.fetch(`/antecedentes${q ? '?' + q : ''}`);
  },

  async createAntecedente(data) {
    return this.fetch('/antecedentes', { method: 'POST', body: JSON.stringify(data) });
  },

  async getSumarios(estado = '') {
    return this.fetch(`/sumarios${estado ? `?estado=${estado}` : ''}`);
  },

  async createSumarioOD(data) {
    return this.fetch('/sumarios', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateSumario(id, data) {
    return this.fetch(`/sumarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async getBlackMarket() {
    return this.fetch('/blackmarket');
  },

  async getAllBlackMarket() {
    return this.fetch('/blackmarket/all');
  },

  async createBlackMarketItem(data) {
    return this.fetch('/blackmarket', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateBlackMarketItem(id, data) {
    return this.fetch(`/blackmarket/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteBlackMarketItem(id) {
    return this.fetch(`/blackmarket/${id}`, { method: 'DELETE' });
  },

  async getTiendaItems() {
    return this.fetch('/tienda');
  },

  async createTiendaItem(data) {
    return this.fetch('/tienda', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateTiendaItem(id, data) {
    return this.fetch(`/tienda/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteTiendaItem(id) {
    return this.fetch(`/tienda/${id}`, { method: 'DELETE' });
  },

  async comprarItemTienda(itemId) {
    return this.fetch('/auth/comprar-tienda-item', { method: 'POST', body: JSON.stringify({ itemId }) });
  },

  async getGruposDiscord() {
    return this.fetch('/od/grupos');
  },

  async getConcesionario() {
    return this.fetch('/concesionario');
  },

  async getSueldos() {
    return this.fetch('/sueldos');
  },

  // ===== Panel de Staff =====
  async getCedulas(search = '') {
    return this.fetch(`/staff/cedulas${search ? '?search=' + encodeURIComponent(search) : ''}`);
  },
  async congelarCedula(id) {
    return this.fetch(`/staff/cedulas/${id}/congelar`, { method: 'POST' });
  },
  async eliminarCedula(id) {
    return this.fetch(`/staff/cedulas/${id}`, { method: 'DELETE' });
  },
  async buscarUsuarioStaff(q) {
    return this.fetch(`/staff/buscar-usuario?q=${encodeURIComponent(q)}`);
  },
  async getSueldosPreset() {
    return this.fetch('/staff/sueldos-preset');
  },
  async asignarSueldoStaff(userId, presetKey) {
    return this.fetch('/staff/asignar-sueldo', { method: 'POST', body: JSON.stringify({ userId, presetKey }) });
  },
  async modificarSaldoStaff(userId, monto, motivo, accion) {
    return this.fetch('/staff/economia/modificar-saldo', { method: 'POST', body: JSON.stringify({ userId, monto, motivo, accion }) });
  },

  async modificarDineroNegroStaff(userId, monto, motivo, accion) {
    return this.fetch('/staff/economia/modificar-dinero-negro', { method: 'POST', body: JSON.stringify({ userId, monto, motivo, accion }) });
  },

  async getSueldosConfig() {
    return this.fetch('/staff/sueldos-config');
  },

  async actualizarSueldoConfig(rol, data) {
    return this.fetch(`/staff/sueldos-config/${rol}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async transferirStaff(origenId, destinoId, monto, motivo) {
    return this.fetch('/staff/economia/transferir', { method: 'POST', body: JSON.stringify({ origenId, destinoId, monto, motivo }) });
  },
  async getInventarioStaff(userId) {
    return this.fetch(`/staff/inventario/${userId}`);
  },
  async eliminarItemStaff(userId, itemId) {
    return this.fetch(`/staff/inventario/${userId}/item/${itemId}`, { method: 'DELETE' });
  },
  async eliminarVehiculoStaff(userId, vehiculoId) {
    return this.fetch(`/staff/inventario/${userId}/vehiculo/${vehiculoId}`, { method: 'DELETE' });
  },
  async getLogsStaff(search = '') {
    return this.fetch(`/staff/logs${search ? '?search=' + encodeURIComponent(search) : ''}`);
  },

  // ===== Propiedades =====
  async getPropiedades() {
    return this.fetch('/propiedades');
  },
  async crearPropiedad(data) {
    return this.fetch('/propiedades', { method: 'POST', body: JSON.stringify(data) });
  },
  async actualizarPropiedad(id, data) {
    return this.fetch(`/propiedades/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async comprarPropiedad(id) {
    return this.fetch(`/propiedades/${id}/comprar`, { method: 'POST' });
  },
  async gestionarLlave(id, rut, accion) {
    return this.fetch(`/propiedades/${id}/llaves`, { method: 'POST', body: JSON.stringify({ rut, accion }) });
  },
  async eliminarPropiedad(id) {
    return this.fetch(`/propiedades/${id}`, { method: 'DELETE' });
  },

  // ===== Empresas =====
  async getEmpresas() {
    return this.fetch('/empresas');
  },
  async crearEmpresa(data) {
    return this.fetch('/empresas', { method: 'POST', body: JSON.stringify(data) });
  },
  async actualizarEmpresa(id, data) {
    return this.fetch(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async eliminarEmpresa(id) {
    return this.fetch(`/empresas/${id}`, { method: 'DELETE' });
  },

  async consultaSNSM(rut) {
    return this.fetch(`/snsm/consulta/${encodeURIComponent(rut)}`);
  },

  async getCamaras() {
    return this.fetch('/snsm/camaras');
  },

  async createCamara(data) {
    return this.fetch('/snsm/camaras', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteCamara(id) {
    return this.fetch(`/snsm/camaras/${id}`, { method: 'DELETE' });
  },

  async getPatrullajes(sector) {
    return this.fetch(`/snsm/patrullajes${sector ? '?sector=' + encodeURIComponent(sector) : ''}`);
  },

  async createPatrullaje(data) {
    return this.fetch('/snsm/patrullajes', { method: 'POST', body: JSON.stringify(data) });
  },

  async actualizarSueldo(rol, data) {
    return this.fetch(`/sueldos/${rol}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async createVehiculoConcesionario(data) {
    return this.fetch('/concesionario', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateVehiculoConcesionario(id, data) {
    return this.fetch(`/concesionario/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteVehiculoConcesionario(id) {
    return this.fetch(`/concesionario/${id}`, { method: 'DELETE' });
  },

  async comprarVehiculoConcesionario(id) {
    return this.fetch(`/concesionario/${id}/comprar`, { method: 'POST' });
  },

  async createGrupoDiscord(data) {
    return this.fetch('/od/grupos', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteGrupoDiscord(id) {
    return this.fetch(`/od/grupos/${id}`, { method: 'DELETE' });
  },

  async asignarRol(rutDestino, rol) {
    return this.fetch('/od/asignar-rol', { method: 'POST', body: JSON.stringify({ rutDestino, rol }) });
  },

  async lavarDinero(monto) {
    return this.fetch('/od/lavar', { method: 'POST', body: JSON.stringify({ monto }) });
  },

  async transferirNegro(rutDestino, monto, concepto) {
    return this.fetch('/od/transferir-negro', { method: 'POST', body: JSON.stringify({ rutDestino, monto, concepto }) });
  },

  async transferirBanco(rutDestino, monto, concepto) {
    return this.fetch('/banco/transferir', { method: 'POST', body: JSON.stringify({ rutDestino, monto, concepto }) });
  },

  async comprarBlackMarket(itemId) {
    return this.fetch('/od/comprar-black', { method: 'POST', body: JSON.stringify({ itemId }) });
  },

  async getNiveles() {
    return this.fetch('/od/niveles');
  },

  async ganarExp(cantidad) {
    return this.fetch('/od/ganar-exp', { method: 'POST', body: JSON.stringify({ cantidad }) });
  },

  async loadAll() {
    const keys = ['denuncias','funcionarios','investigaciones','personas','incautadas','multas','vehiculos','bienes','antecedentes','sumarios','blackMarket','grupos','niveles'];
    const resultados = await Promise.allSettled([
      this.getDenuncias(),
      this.getFuncionarios(),
      this.getInvestigaciones(),
      this.getPersonasBuscadas(),
      this.getIncautaciones(),
      this.getMultas(),
      this.getVehiculos(),
      this.getBienes(),
      this.getAntecedentes(),
      this.getSumarios(),
      this.getAllBlackMarket(),
      this.getGruposDiscord(),
      this.getNiveles()
    ]);

    const valores = {};
    let huboError = false;
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        valores[keys[i]] = r.value;
      } else {
        huboError = true;
        valores[keys[i]] = [];
        console.error(`[API] Error cargando "${keys[i]}":`, r.reason && r.reason.message);
      }
    });

    const existing = window.DB || {};
    window.DB = {
      denuncias: valores.denuncias.length ? valores.denuncias : (existing.denuncias || []),
      funcionarios: valores.funcionarios.length ? valores.funcionarios : (existing.funcionarios || []),
      investigaciones: valores.investigaciones.length ? valores.investigaciones : (existing.investigaciones || []),
      personasBuscadas: valores.personas.length ? valores.personas : (existing.personasBuscadas || []),
      incautaciones: valores.incautadas.length ? valores.incautadas : (existing.incautaciones || []),
      multas: valores.multas.length ? valores.multas : (existing.multas || []),
      vehiculos: valores.vehiculos.length ? valores.vehiculos : (existing.vehiculos || []),
      bienes: valores.bienes.length ? valores.bienes : (existing.bienes || []),
      antecedentes: valores.antecedentes.length ? valores.antecedentes : (existing.antecedentes || []),
      sumarios: valores.sumarios.length ? valores.sumarios : (existing.sumarios || []),
      blackMarket: valores.blackMarket.length ? valores.blackMarket : (existing.blackMarket || []),
      gruposDiscord: valores.grupos.length ? valores.grupos : (existing.gruposDiscord || []),
      niveles: valores.niveles.length ? valores.niveles : (existing.niveles || []),
      usuarios: existing.usuarios || []
    };

    return !huboError;
  },

  async getMisPertenencias() {
    return this.fetch('/pertenencias/mias');
  },
  async getPertenenciasDe(rut) {
    return this.fetch(`/pertenencias/${encodeURIComponent(rut)}`);
  },
  async crearDocumento(data) {
    return this.fetch('/pertenencias/documentos', { method: 'POST', body: JSON.stringify(data) });
  },
  async eliminarDocumento(id) {
    return this.fetch(`/pertenencias/documentos/${id}`, { method: 'DELETE' });
  },

  // ===== Casino =====
  async casinoRuleta(apuesta, tipo, valor) {
    return this.fetch('/casino/ruleta/jugar', { method: 'POST', body: JSON.stringify({ apuesta, tipo, valor }) });
  },
  async casinoSlots(apuesta) {
    return this.fetch('/casino/slots/jugar', { method: 'POST', body: JSON.stringify({ apuesta }) });
  },
  async casinoCrash(apuesta, cashout) {
    return this.fetch('/casino/crash/jugar', { method: 'POST', body: JSON.stringify({ apuesta, cashout }) });
  },
  async casinoMoneda(apuesta, eleccion) {
    return this.fetch('/casino/moneda/jugar', { method: 'POST', body: JSON.stringify({ apuesta, eleccion }) });
  },
  async casinoDados(apuesta, objetivo) {
    return this.fetch('/casino/dados/jugar', { method: 'POST', body: JSON.stringify({ apuesta, objetivo }) });
  },
  async casinoBlackjackIniciar(apuesta) {
    return this.fetch('/casino/blackjack/iniciar', { method: 'POST', body: JSON.stringify({ apuesta }) });
  },
  async casinoBlackjackPedir(id) {
    return this.fetch(`/casino/blackjack/${id}/pedir`, { method: 'POST' });
  },
  async casinoBlackjackPlantarse(id) {
    return this.fetch(`/casino/blackjack/${id}/plantarse`, { method: 'POST' });
  },
  async casinoMinasIniciar(apuesta, minas) {
    return this.fetch('/casino/minas/iniciar', { method: 'POST', body: JSON.stringify({ apuesta, minas }) });
  },
  async casinoMinasRevelar(id, casilla) {
    return this.fetch(`/casino/minas/${id}/revelar`, { method: 'POST', body: JSON.stringify({ casilla }) });
  },
  async casinoMinasRetirar(id) {
    return this.fetch(`/casino/minas/${id}/retirar`, { method: 'POST' });
  }
};