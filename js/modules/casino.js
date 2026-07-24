const CasinoUI = {
  tab: 'ruleta',
  bjSesion: null,
  bjEstado: null,
  minasSesion: null,
  minasMultiplicador: 1,
  minasReveladas: [],
  minasCantidad: 5,

  cargarTab(tab) {
    this.tab = tab;
    document.querySelectorAll('.casino-tab').forEach(t => t.classList.toggle('active', t.dataset.casinoTab === tab));
    document.getElementById('casino-tab-content').innerHTML = this.renderers()[tab]();
  },

  renderers() {
    return {
      ruleta: () => this.renderRuleta(),
      slots: () => this.renderSlots(),
      crash: () => this.renderCrash(),
      moneda: () => this.renderMoneda(),
      dados: () => this.renderDados(),
      blackjack: () => this.renderBlackjack(),
      minas: () => this.renderMinas()
    };
  },

  saldoActual() {
    return Auth.currentUser ? Auth.currentUser.dinero : 0;
  },

  actualizarSaldoUI(dinero) {
    Auth.currentUser.dinero = dinero;
    const el = document.getElementById('casino-saldo');
    if (el) el.textContent = '$' + dinero.toLocaleString();
  },

  // ===== RULETA =====
  renderRuleta() {
    return `
      <h4><i class="fas fa-circle-notch"></i> Ruleta Europea</h4>
      <p style="color:var(--text-muted);font-size:13px;">Número pleno paga 35x · Color/Par-Impar/Mayor-Menor pagan 1x · Docena paga 2x</p>
      <div class="form-group"><label>Apuesta</label><input class="form-control" id="rl-apuesta" type="number" value="1000"></div>
      <div class="form-row">
        <div class="form-group">
          <label>Tipo de apuesta</label>
          <select class="form-control" id="rl-tipo" onchange="CasinoUI.actualizarValorRuleta()">
            <option value="color">Color (Rojo/Negro)</option>
            <option value="paridad">Par / Impar</option>
            <option value="mitad">1-18 / 19-36</option>
            <option value="docena">Docena</option>
            <option value="numero">Número pleno (0-36)</option>
          </select>
        </div>
        <div class="form-group" id="rl-valor-cont"><label>Valor</label>
          <select class="form-control" id="rl-valor"><option value="rojo">Rojo</option><option value="negro">Negro</option></select>
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="CasinoUI.jugarRuleta()"><i class="fas fa-dice"></i> Girar</button>
      <div id="rl-result" style="margin-top:14px;"></div>
    `;
  },

  actualizarValorRuleta() {
    const tipo = document.getElementById('rl-tipo').value;
    const cont = document.getElementById('rl-valor-cont');
    if (tipo === 'color') cont.innerHTML = '<label>Valor</label><select class="form-control" id="rl-valor"><option value="rojo">Rojo</option><option value="negro">Negro</option></select>';
    else if (tipo === 'paridad') cont.innerHTML = '<label>Valor</label><select class="form-control" id="rl-valor"><option value="par">Par</option><option value="impar">Impar</option></select>';
    else if (tipo === 'mitad') cont.innerHTML = '<label>Valor</label><select class="form-control" id="rl-valor"><option value="menor">1 al 18</option><option value="mayor">19 al 36</option></select>';
    else if (tipo === 'docena') cont.innerHTML = '<label>Valor</label><select class="form-control" id="rl-valor"><option value="1">1ra (1-12)</option><option value="2">2da (13-24)</option><option value="3">3ra (25-36)</option></select>';
    else cont.innerHTML = '<label>Número</label><input class="form-control" id="rl-valor" type="number" min="0" max="36" value="0">';
  },

  async jugarRuleta() {
    const apuesta = parseInt(document.getElementById('rl-apuesta').value);
    const tipo = document.getElementById('rl-tipo').value;
    const valor = document.getElementById('rl-valor').value;
    const result = document.getElementById('rl-result');
    try {
      const res = await API.casinoRuleta(apuesta, tipo, valor);
      this.actualizarSaldoUI(res.dinero);
      const colorBadge = res.color === 'rojo' ? 'badge-danger' : res.color === 'negro' ? 'badge-secondary' : 'badge-success';
      result.innerHTML = `
        <div class="alert alert-${res.gano ? 'success' : 'danger'}">
          Salió <strong>${res.numero}</strong> <span class="badge ${colorBadge}">${res.color}</span> —
          ${res.gano ? `¡Ganaste $${res.pago.toLocaleString()}!` : 'Perdiste esta ronda.'}
        </div>`;
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== SLOTS =====
  renderSlots() {
    return `
      <h4><i class="fas fa-dice"></i> Tragamonedas</h4>
      <p style="color:var(--text-muted);font-size:13px;">3 iguales pagan más · 2 iguales de 🍒 devuelven la mitad</p>
      <div style="text-align:center;font-size:64px;margin:20px 0;background:var(--bg-input);border-radius:var(--radius);padding:20px;" id="slots-reels">🎰 🎰 🎰</div>
      <div class="form-group"><label>Apuesta</label><input class="form-control" id="sl-apuesta" type="number" value="1000"></div>
      <button class="btn btn-primary btn-block" onclick="CasinoUI.jugarSlots()"><i class="fas fa-sync"></i> Girar</button>
      <div id="sl-result" style="margin-top:14px;"></div>
    `;
  },

  async jugarSlots() {
    const apuesta = parseInt(document.getElementById('sl-apuesta').value);
    const result = document.getElementById('sl-result');
    try {
      const res = await API.casinoSlots(apuesta);
      this.actualizarSaldoUI(res.dinero);
      document.getElementById('slots-reels').textContent = res.simbolos.join(' ');
      result.innerHTML = `<div class="alert alert-${res.gano ? 'success' : 'danger'}">${res.gano ? `¡Ganaste $${res.pago.toLocaleString()}!` : 'Perdiste esta ronda.'}</div>`;
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== CRASH =====
  renderCrash() {
    return `
      <h4><i class="fas fa-rocket"></i> Crash</h4>
      <p style="color:var(--text-muted);font-size:13px;">Elegí a qué multiplicador te querés retirar antes de tirar. Si el cohete revienta antes, perdés.</p>
      <div class="form-group"><label>Apuesta</label><input class="form-control" id="cr-apuesta" type="number" value="1000"></div>
      <div class="form-group"><label>Retirarme en (x)</label><input class="form-control" id="cr-cashout" type="number" step="0.1" min="1.1" value="2.0"></div>
      <button class="btn btn-primary btn-block" onclick="CasinoUI.jugarCrash()"><i class="fas fa-rocket"></i> Lanzar</button>
      <div id="cr-result" style="margin-top:14px;"></div>
    `;
  },

  async jugarCrash() {
    const apuesta = parseInt(document.getElementById('cr-apuesta').value);
    const cashout = parseFloat(document.getElementById('cr-cashout').value);
    const result = document.getElementById('cr-result');
    try {
      const res = await API.casinoCrash(apuesta, cashout);
      this.actualizarSaldoUI(res.dinero);
      result.innerHTML = `
        <div class="alert alert-${res.gano ? 'success' : 'danger'}">
          Reventó en <strong>${res.puntoCrash}x</strong> —
          ${res.gano ? `¡Te retiraste a tiempo en ${cashout}x y ganaste $${res.pago.toLocaleString()}!` : `No alcanzaste a retirarte en ${cashout}x.`}
        </div>`;
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== CARA O CRUZ =====
  renderMoneda() {
    return `
      <h4><i class="fas fa-coins"></i> Cara o Cruz</h4>
      <div class="form-group"><label>Apuesta</label><input class="form-control" id="mo-apuesta" type="number" value="1000"></div>
      <div style="display:flex;gap:10px;margin-bottom:14px;">
        <button class="btn btn-outline" style="flex:1;" onclick="CasinoUI.jugarMoneda('cara')"><i class="fas fa-sun"></i> Cara</button>
        <button class="btn btn-outline" style="flex:1;" onclick="CasinoUI.jugarMoneda('cruz')"><i class="fas fa-moon"></i> Cruz</button>
      </div>
      <div id="mo-result"></div>
    `;
  },

  async jugarMoneda(eleccion) {
    const apuesta = parseInt(document.getElementById('mo-apuesta').value);
    const result = document.getElementById('mo-result');
    try {
      const res = await API.casinoMoneda(apuesta, eleccion);
      this.actualizarSaldoUI(res.dinero);
      result.innerHTML = `<div class="alert alert-${res.gano ? 'success' : 'danger'}">Salió <strong>${res.resultado}</strong> — ${res.gano ? `¡Ganaste $${res.pago.toLocaleString()}!` : 'Perdiste.'}</div>`;
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== DADOS =====
  renderDados() {
    return `
      <h4><i class="fas fa-dice-six"></i> Dados</h4>
      <p style="color:var(--text-muted);font-size:13px;">Elegí un número objetivo (2-95): ganás si el dado (0-99) sale por debajo. Cuanto más bajo el objetivo, más paga.</p>
      <div class="form-group"><label>Apuesta</label><input class="form-control" id="da-apuesta" type="number" value="1000"></div>
      <div class="form-group"><label>Ganar si sale menor a: <span id="da-objetivo-label">50</span></label>
        <input class="form-control" id="da-objetivo" type="range" min="2" max="95" value="50" oninput="document.getElementById('da-objetivo-label').textContent=this.value">
      </div>
      <button class="btn btn-primary btn-block" onclick="CasinoUI.jugarDados()"><i class="fas fa-dice"></i> Tirar</button>
      <div id="da-result" style="margin-top:14px;"></div>
    `;
  },

  async jugarDados() {
    const apuesta = parseInt(document.getElementById('da-apuesta').value);
    const objetivo = parseInt(document.getElementById('da-objetivo').value);
    const result = document.getElementById('da-result');
    try {
      const res = await API.casinoDados(apuesta, objetivo);
      this.actualizarSaldoUI(res.dinero);
      result.innerHTML = `<div class="alert alert-${res.gano ? 'success' : 'danger'}">Salió <strong>${res.tirada}</strong> — ${res.gano ? `¡Ganaste $${res.pago.toLocaleString()}!` : 'Perdiste.'}</div>`;
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  // ===== BLACKJACK =====
  renderBlackjack() {
    if (!this.bjEstado) {
      return `
        <h4><i class="fas fa-heart"></i> Blackjack</h4>
        <div class="form-group"><label>Apuesta</label><input class="form-control" id="bj-apuesta" type="number" value="1000"></div>
        <button class="btn btn-primary btn-block" onclick="CasinoUI.iniciarBlackjack()"><i class="fas fa-play"></i> Repartir</button>
        <div id="bj-result" style="margin-top:14px;"></div>
      `;
    }
    const e = this.bjEstado;
    return `
      <h4><i class="fas fa-heart"></i> Blackjack</h4>
      <div class="grid-2">
        <div class="card" style="background:var(--bg-input);">
          <strong>Dealer</strong>
          <div style="font-size:28px;margin:8px 0;">${e.dealerVisible ? e.dealerVisible.valor + e.dealerVisible.palo + ' 🂠' : (e.dealer || []).map(c => c.valor + c.palo).join(' ')}</div>
          ${e.valorDealer ? `<div>Valor: ${e.valorDealer}</div>` : ''}
        </div>
        <div class="card" style="background:var(--bg-input);">
          <strong>Vos</strong>
          <div style="font-size:28px;margin:8px 0;">${e.jugador.map(c => c.valor + c.palo).join(' ')}</div>
          <div>Valor: ${e.valorJugador}</div>
        </div>
      </div>
      ${!e.terminado ? `
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button class="btn btn-success" style="flex:1;" onclick="CasinoUI.blackjackPedir()"><i class="fas fa-plus"></i> Pedir</button>
        <button class="btn btn-danger" style="flex:1;" onclick="CasinoUI.blackjackPlantarse()"><i class="fas fa-hand-paper"></i> Plantarse</button>
      </div>` : `
      <div class="alert alert-${e.resultado === 'perdiste' ? 'danger' : 'success'}" style="margin-top:14px;">
        ${e.resultado === 'ganaste' ? `¡Ganaste $${e.pago.toLocaleString()}!` : e.resultado === 'empate' ? 'Empate, recuperás tu apuesta.' : e.resultado === 'blackjack' ? `¡Blackjack! Ganaste $${e.pago.toLocaleString()}!` : 'Perdiste esta mano.'}
      </div>
      <button class="btn btn-primary btn-block" onclick="CasinoUI.reiniciarBlackjack()"><i class="fas fa-redo"></i> Jugar de nuevo</button>
      `}
      <div id="bj-result"></div>
    `;
  },

  reiniciarBlackjack() {
    this.bjEstado = null;
    this.bjSesion = null;
    this.render();
  },

  async iniciarBlackjack() {
    const apuesta = parseInt(document.getElementById('bj-apuesta').value);
    const result = document.getElementById('bj-result');
    try {
      const res = await API.casinoBlackjackIniciar(apuesta);
      this.actualizarSaldoUI(res.dinero);
      if (res.terminado) {
        this.bjEstado = { terminado: true, resultado: res.resultado, jugador: res.jugador, dealer: res.dealer, valorJugador: 21, valorDealer: 21, pago: res.pago };
      } else {
        this.bjSesion = res.sesionId;
        this.bjEstado = { terminado: false, jugador: res.jugador, valorJugador: res.valorJugador, dealerVisible: res.dealerVisible };
      }
      this.render();
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  async blackjackPedir() {
    try {
      const res = await API.casinoBlackjackPedir(this.bjSesion);
      if (res.terminado) {
        this.actualizarSaldoUI(res.dinero);
        this.bjEstado = { terminado: true, resultado: res.resultado, jugador: res.jugador, valorJugador: res.valorJugador, dealer: this.bjEstado.dealerVisible ? [this.bjEstado.dealerVisible] : [] };
      } else {
        this.bjEstado.jugador = res.jugador;
        this.bjEstado.valorJugador = res.valorJugador;
      }
      this.render();
    } catch (e) { alert(e.message); }
  },

  async blackjackPlantarse() {
    try {
      const res = await API.casinoBlackjackPlantarse(this.bjSesion);
      this.actualizarSaldoUI(res.dinero);
      this.bjEstado = { ...this.bjEstado, terminado: true, resultado: res.resultado, dealer: res.dealer, valorDealer: res.valorDealer, pago: res.pago };
      this.render();
    } catch (e) { alert(e.message); }
  },

  // ===== MINAS =====
  renderMinas() {
    if (!this.minasSesion) {
      return `
        <h4><i class="fas fa-bomb"></i> Minas</h4>
        <p style="color:var(--text-muted);font-size:13px;">Grilla de 25 casillas. Elegí cuántas minas quiere que haya (más minas = más riesgo, pero paga más por casilla).</p>
        <div class="form-group"><label>Apuesta</label><input class="form-control" id="mi-apuesta" type="number" value="1000"></div>
        <div class="form-group"><label>Minas: <span id="mi-cantidad-label">${this.minasCantidad}</span></label>
          <input class="form-control" type="range" min="1" max="24" value="${this.minasCantidad}" oninput="document.getElementById('mi-cantidad-label').textContent=this.value;CasinoUI.minasCantidad=parseInt(this.value)">
        </div>
        <button class="btn btn-primary btn-block" onclick="CasinoUI.iniciarMinas()"><i class="fas fa-play"></i> Empezar</button>
        <div id="mi-result" style="margin-top:14px;"></div>
      `;
    }
    const casillas = Array.from({ length: 25 }, (_, i) => i);
    return `
      <h4><i class="fas fa-bomb"></i> Minas — Multiplicador actual: <span style="color:var(--success);">${this.minasMultiplicador.toFixed(2)}x</span></h4>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:400px;margin:16px 0;">
        ${casillas.map(i => `
          <button class="btn ${this.minasReveladas.includes(i) ? 'btn-success' : 'btn-outline'}" style="aspect-ratio:1;font-size:20px;" ${this.minasReveladas.includes(i) ? 'disabled' : ''} onclick="CasinoUI.revelarMina(${i})">
            ${this.minasReveladas.includes(i) ? '💎' : '❓'}
          </button>
        `).join('')}
      </div>
      ${this.minasReveladas.length ? `<button class="btn btn-success btn-block" onclick="CasinoUI.retirarMinas()"><i class="fas fa-hand-holding-usd"></i> Retirarme (ganar $${Math.floor((this.minasApuesta || 0) * this.minasMultiplicador).toLocaleString()})</button>` : ''}
      <div id="mi-result" style="margin-top:14px;"></div>
    `;
  },

  async iniciarMinas() {
    const apuesta = parseInt(document.getElementById('mi-apuesta').value);
    const result = document.getElementById('mi-result');
    try {
      const res = await API.casinoMinasIniciar(apuesta, this.minasCantidad);
      this.actualizarSaldoUI(res.dinero);
      this.minasSesion = res.sesionId;
      this.minasApuesta = apuesta;
      this.minasMultiplicador = 1;
      this.minasReveladas = [];
      this.render();
    } catch (e) { result.innerHTML = App.showAlert(e.message, 'danger'); }
  },

  async revelarMina(casilla) {
    if (this.minasReveladas.includes(casilla)) return;
    try {
      const res = await API.casinoMinasRevelar(this.minasSesion, casilla);
      if (res.perdiste) {
        alert('💥 ¡Pisaste una mina! Perdiste la apuesta.');
        this.minasSesion = null;
        this.minasReveladas = [];
        this.render();
        return;
      }
      this.minasReveladas.push(casilla);
      this.minasMultiplicador = res.multiplicador;
      this.render();
    } catch (e) { alert(e.message); }
  },

  async retirarMinas() {
    try {
      const res = await API.casinoMinasRetirar(this.minasSesion);
      this.actualizarSaldoUI(res.dinero);
      alert(`¡Te retiraste con $${res.pago.toLocaleString()}!`);
      this.minasSesion = null;
      this.minasReveladas = [];
      this.render();
    } catch (e) { alert(e.message); }
  },

  render() {
    const cont = document.getElementById('casino-tab-content');
    if (cont) cont.innerHTML = this.renderers()[this.tab]();
  }
};

async function renderCasino() {
  setTimeout(() => CasinoUI.cargarTab(CasinoUI.tab), 0);
  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-dice"></i> Casino</h3>
        <span style="color:var(--success);font-weight:700;font-size:16px;" id="casino-saldo">$${(Auth.currentUser ? Auth.currentUser.dinero : 0).toLocaleString()}</span>
      </div>
      <div class="chip-filtros">
        <button class="chip casino-tab active" data-casino-tab="ruleta" onclick="CasinoUI.cargarTab('ruleta')"><i class="fas fa-circle-notch"></i> Ruleta</button>
        <button class="chip casino-tab" data-casino-tab="slots" onclick="CasinoUI.cargarTab('slots')"><i class="fas fa-dice"></i> Tragamonedas</button>
        <button class="chip casino-tab" data-casino-tab="crash" onclick="CasinoUI.cargarTab('crash')"><i class="fas fa-rocket"></i> Crash</button>
        <button class="chip casino-tab" data-casino-tab="moneda" onclick="CasinoUI.cargarTab('moneda')"><i class="fas fa-coins"></i> Cara o Cruz</button>
        <button class="chip casino-tab" data-casino-tab="dados" onclick="CasinoUI.cargarTab('dados')"><i class="fas fa-dice-six"></i> Dados</button>
        <button class="chip casino-tab" data-casino-tab="blackjack" onclick="CasinoUI.cargarTab('blackjack')"><i class="fas fa-heart"></i> Blackjack</button>
        <button class="chip casino-tab" data-casino-tab="minas" onclick="CasinoUI.cargarTab('minas')"><i class="fas fa-bomb"></i> Minas</button>
      </div>
    </div>
    <div class="card">
      <div id="casino-tab-content">Cargando...</div>
    </div>
  `;
}
