const BancoUI = {
  multas: [],

  async render() {
    try { this.multas = await API.getMultas(); } catch (e) { this.multas = []; }
    const u = Auth.currentUser;
    const historial = (u.historialFinanciero || []).slice().reverse().slice(0, 20);
    const pendientes = this.multas.filter(m => !m.pagada);

    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-wallet"></i> Mi Saldo</h3></div>
          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Dinero legal</p>
            <h2 style="color:var(--success);font-size:32px;margin:0;">$${(u.dinero || 0).toLocaleString()}</h2>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i class="fas fa-paper-plane"></i> Transferir Dinero</h3></div>
          <div class="form-group"><label>RUT destinatario</label><input class="form-control" id="banco-rut" placeholder="12.345.678-9"></div>
          <div class="form-group"><label>Monto</label><input class="form-control" type="number" id="banco-monto" placeholder="0"></div>
          <div class="form-group"><label>Concepto (opcional)</label><input class="form-control" id="banco-concepto" placeholder="Ej: Pago de arriendo"></div>
          <button class="btn btn-primary btn-block" onclick="BancoUI.transferir()"><i class="fas fa-paper-plane"></i> Transferir</button>
          <div id="banco-transf-result" style="margin-top:12px;"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-ticket-alt"></i> Multas Pendientes (${pendientes.length})</h3></div>
        <div id="banco-multas-result"></div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          ${pendientes.map(m => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-input);border-radius:var(--radius);padding:10px 14px;flex-wrap:wrap;gap:8px;">
              <div>
                <strong>${m.motivo}</strong>
                <div style="font-size:12px;color:var(--text-muted);">${m.institucion} · ${m.fecha}</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="color:var(--danger);font-weight:700;">$${m.monto.toLocaleString()}</span>
                <button class="btn btn-sm btn-danger" onclick="BancoUI.pagarMulta('${m._id}')"><i class="fas fa-credit-card"></i> Pagar</button>
              </div>
            </div>
          `).join('') || '<p style="color:var(--text-muted);">No tienes multas pendientes.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-history"></i> Historial de Movimientos</h3></div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
          ${historial.map(h => `
            <div style="display:flex;justify-content:space-between;background:var(--bg-input);border-radius:var(--radius);padding:8px 14px;">
              <span style="font-size:13px;">${h.concepto || h.tipo}</span>
              <span style="font-weight:600;color:${h.monto >= 0 ? 'var(--success)' : 'var(--danger)'};">${h.monto >= 0 ? '+' : ''}$${h.monto.toLocaleString()}</span>
            </div>
          `).join('') || '<p style="color:var(--text-muted);">Sin movimientos todavía.</p>'}
        </div>
      </div>
    `;
  },

  async transferir() {
    const rutDestino = document.getElementById('banco-rut').value.trim();
    const monto = parseInt(document.getElementById('banco-monto').value, 10);
    const concepto = document.getElementById('banco-concepto').value.trim();
    const result = document.getElementById('banco-transf-result');
    if (!rutDestino || !monto || monto <= 0) { result.innerHTML = App.showAlert('RUT y monto son obligatorios', 'danger'); return; }
    try {
      const res = await API.transferirBanco(rutDestino, monto, concepto);
      Auth.currentUser.dinero = res.dinero;
      Auth.updateUI();
      result.innerHTML = App.showAlert('Transferencia realizada', 'success');
      App.navigate('banco');
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo transferir', 'danger');
    }
  },

  async pagarMulta(id) {
    const result = document.getElementById('banco-multas-result');
    try {
      const res = await API.pagarMulta(id);
      Auth.currentUser.dinero = res.dinero;
      Auth.updateUI();
      App.navigate('banco');
    } catch (e) {
      result.innerHTML = App.showAlert(e.message || 'No se pudo pagar la multa', 'danger');
    }
  }
};

async function renderBanco() {
  return await BancoUI.render();
}