async function renderEmergenciaReportar() {
  return `
    <div class="card" style="max-width:600px;margin:0 auto;">
      <div class="card-header"><h3><i class="fas fa-phone" style="color:var(--danger);"></i> Reportar Emergencia (911)</h3></div>
      <p style="color:var(--text-muted);font-size:13px;">Tu reporte llega en vivo a Carabineros. Úsalo solo para emergencias reales dentro del rol.</p>
      <div class="form-group"><label>¿Qué está pasando? *</label><textarea class="form-control" id="emg-descripcion" rows="4" placeholder="Describe la emergencia..."></textarea></div>
      <div class="form-group"><label>Ubicación (opcional)</label><input class="form-control" id="emg-ubicacion" placeholder="Ej: Av. Principal esquina Los Alerces"></div>
      <button class="btn btn-danger btn-block" onclick="emergenciaEnviar()"><i class="fas fa-phone"></i> Reportar Emergencia</button>
      <div id="emg-result" style="margin-top:14px;"></div>
    </div>
  `;
}

async function emergenciaEnviar() {
  const descripcion = document.getElementById('emg-descripcion').value.trim();
  const ubicacion = document.getElementById('emg-ubicacion').value.trim();
  const result = document.getElementById('emg-result');
  if (!descripcion) { result.innerHTML = App.showAlert('Describe la emergencia', 'danger'); return; }
  try {
    await API.reportarEmergencia(descripcion, ubicacion);
    result.innerHTML = App.showAlert('Emergencia reportada. Carabineros ya la puede ver.', 'success');
    document.getElementById('emg-descripcion').value = '';
    document.getElementById('emg-ubicacion').value = '';
  } catch (e) {
    result.innerHTML = App.showAlert(e.message || 'No se pudo reportar', 'danger');
  }
}
