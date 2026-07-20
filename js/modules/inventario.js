async function renderInventario() {
  var u = Auth.currentUser;
  if (!u) return App.showAlert('Debes iniciar sesion', 'danger');

  var ficha;
  try {
    ficha = await API.getMisPertenencias();
  } catch (err) {
    return '<div class="alert alert-danger">No se pudieron cargar tus pertenencias: ' + err.message + '</div>';
  }

  var vehiculos = ficha.vehiculos || [];
  var documentos = ficha.documentos || [];
  var mochila = ficha.mochila || [];
  var valorGarage = ficha.valorGarage || 0;

  function tarjetaVehiculo(v) {
    return (
      '<div class="stat-card" style="text-align:left;padding:0;overflow:hidden;">' +
        '<div style="height:120px;background:linear-gradient(135deg,rgba(255,122,26,0.12),transparent);display:flex;align-items:center;justify-content:center;">' +
          (v.imagen
            ? '<img src="' + v.imagen + '" alt="' + v.modelo + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';">'
            : '<i class="fas fa-car" style="font-size:40px;color:var(--text-muted);opacity:0.4;"></i>') +
        '</div>' +
        '<div style="padding:14px;">' +
          '<h4 style="font-size:14px;margin:0 0 6px;">' + v.marca + ' ' + v.modelo + (v.anio ? ' ' + v.anio : '') + '</h4>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:10px;border-top:1px solid var(--glass-border);">' +
            '<span class="badge badge-warning" style="font-size:13px;letter-spacing:1px;">' + (v.patente || '—') + '</span>' +
            '<span style="font-weight:700;color:var(--success);font-size:13px;">$' + (v.precio || 0).toLocaleString() + '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function tarjetaDocumento(d) {
    var colorEstado = d.estado === 'Vigente' ? 'badge-success' : d.estado === 'Vencido' ? 'badge-danger' : 'badge-warning';
    return (
      '<div class="stat-card" style="text-align:left;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<i class="fas fa-file-alt" style="font-size:26px;color:var(--accent);"></i>' +
          '<div style="flex:1;">' +
            '<h4 style="font-size:14px;margin:0;">' + d.tipo + '</h4>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + (d.numero || 'Sin numero') + '</span>' +
          '</div>' +
          '<span class="badge ' + colorEstado + '">' + d.estado + '</span>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--glass-border);padding-top:8px;">' +
          'Emisión: ' + (d.fechaEmision || '—') + ' &nbsp;·&nbsp; Vence: ' + (d.fechaVencimiento || '—') +
        '</div>' +
      '</div>'
    );
  }

  function tarjetaItem(inv) {
    var itemIcon = inv.icon || 'fa-box';
    return (
      '<div class="stat-card" style="text-align:left;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<i class="fas ' + itemIcon + '" style="font-size:28px;color:var(--accent);"></i>' +
          '<div style="flex:1;">' +
            '<h4 style="font-size:14px;margin:0;">' + inv.nombre + '</h4>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + (inv.categoria || 'Sin categoria') + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:10px;border-top:1px solid var(--glass-border);">' +
          '<span style="font-weight:700;color:var(--success);">$' + (inv.precio || 0).toLocaleString() + '</span>' +
          '<span class="badge badge-info">x' + (inv.cantidad || 1) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  var vacio = function(icon, texto) {
    return '<div style="text-align:center;padding:50px 20px;color:var(--text-muted);"><i class="fas ' + icon + '" style="font-size:48px;opacity:0.3;display:block;margin-bottom:12px;"></i>' + texto + '</div>';
  };

  return (
    '<div class="card" style="margin-bottom:20px;">' +
      '<h3 style="margin:0 0 4px;"><i class="fas fa-briefcase" style="color:var(--accent);"></i> Mis Pertenencias</h3>' +
      '<p style="color:var(--text-muted);font-size:13px;margin:0;">Gestiona tus vehículos, documentos e inventario en un solo lugar</p>' +
    '</div>' +

    '<div class="grid-2" style="margin-bottom:20px;">' +
      '<div class="stat-card"><i class="fas fa-wallet" style="font-size:22px;color:var(--text-muted);"></i>' +
        '<p style="font-size:12px;color:var(--text-muted);letter-spacing:1px;margin-top:8px;">VALOR DE MI GARAGE</p>' +
        '<h2 style="color:var(--success);margin-top:4px;">$' + valorGarage.toLocaleString() + '</h2></div>' +
      '<div class="stat-card"><i class="fas fa-car" style="font-size:22px;color:var(--text-muted);"></i>' +
        '<p style="font-size:12px;color:var(--text-muted);letter-spacing:1px;margin-top:8px;">VEHÍCULOS</p>' +
        '<h2 style="margin-top:4px;">' + vehiculos.length + '</h2></div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="tabs">' +
        '<div class="tab active" data-tab="pert-vehiculos"><i class="fas fa-car"></i> Vehículos <span class="badge badge-info">' + vehiculos.length + '</span></div>' +
        '<div class="tab" data-tab="pert-documentos"><i class="fas fa-id-card"></i> Documentos <span class="badge badge-info">' + documentos.length + '</span></div>' +
        '<div class="tab" data-tab="pert-mochila"><i class="fas fa-box"></i> Mochila <span class="badge badge-info">' + mochila.length + '</span></div>' +
      '</div>' +

      '<div id="pert-vehiculos" class="tab-content active">' +
        (vehiculos.length ? '<div class="grid-3">' + vehiculos.map(tarjetaVehiculo).join('') + '</div>' : vacio('fa-car', 'No tienes vehículos registrados. Cómpralos en el Concesionario.')) +
      '</div>' +

      '<div id="pert-documentos" class="tab-content">' +
        (documentos.length ? '<div class="grid-3">' + documentos.map(tarjetaDocumento).join('') + '</div>' : vacio('fa-id-card', 'No tienes documentos registrados. Estos los emite Carabineros, PDI o la Municipalidad.')) +
      '</div>' +

      '<div id="pert-mochila" class="tab-content">' +
        (mochila.length ? '<div class="grid-3">' + mochila.map(tarjetaItem).join('') + '</div>' : vacio('fa-box', 'Tu mochila está vacía. Compra items en la Tienda o el Mercado Negro.')) +
      '</div>' +
    '</div>'
  );
}
