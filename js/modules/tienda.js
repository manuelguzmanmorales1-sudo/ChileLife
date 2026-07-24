let tiendaCart = [];
let tiendaItems = [];
let tiendaLoading = false;

const tiendaCategorias = [
  { id: 'comunicacion', nombre: 'Comunicacion', icon: 'fa-satellite-dish' },
  { id: 'vestimenta',   nombre: 'Vestimenta',   icon: 'fa-tshirt' },
  { id: 'herramientas', nombre: 'Herramientas', icon: 'fa-tools' },
  { id: 'medicina',     nombre: 'Medicina',     icon: 'fa-medkit' },
  { id: 'policial',     nombre: 'Policial',     icon: 'fa-shield-haltered' },
  { id: 'vehiculos',    nombre: 'Vehiculos',    icon: 'fa-car' },
  { id: 'alimentos',    nombre: 'Alimentos',    icon: 'fa-utensils' },
  { id: 'accesorios',   nombre: 'Accesorios',   icon: 'fa-id-card' }
];

async function cargarTiendaItems() {
  if (tiendaLoading) return;
  tiendaLoading = true;
  try {
    tiendaItems = await API.getTiendaItems();
  } catch (err) {
    console.error('Error cargando items de tienda:', err);
    tiendaItems = [];
  }
  tiendaLoading = false;
}

async function renderTienda() {
  var u = Auth.currentUser;
  if (!u) return App.showAlert('Debes iniciar sesion', 'danger');

  await cargarTiendaItems();

  var categoriasConItems = tiendaCategorias.filter(function(cat) {
    return tiendaItems.some(function(it) { return it.categoria === cat.id; });
  });

  var cartTotal = tiendaCart.reduce(function(s, id) {
    var it = tiendaItems.find(function(x) { return x._id === id || x.id === id; });
    return s + (it ? it.precio : 0);
  }, 0);
  var cartItems = tiendaCart.map(function(id) {
    return tiendaItems.find(function(x) { return x._id === id || x.id === id; });
  }).filter(Boolean);

  var cartHTML = '';
  if (cartItems.length > 0) {
    cartHTML =
      '<div style="background:rgba(46,204,113,0.08);border:1px solid var(--success);border-radius:8px;padding:14px;margin:0 16px 12px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<i class="fas fa-shopping-cart" style="color:var(--success);font-size:18px;"></i>' +
            '<span style="font-weight:600;">Carrito (' + cartItems.length + ' items)</span>' +
            '<span style="font-weight:700;color:var(--success);">$' + cartTotal.toLocaleString() + '</span>' +
            cartItems.map(function(it) {
              return '<span class="badge badge-info" style="cursor:pointer;font-size:12px;" onclick="quitarCarrito(\'' + (it._id || it.id) + '\')" title="Quitar">' + it.nombre + ' <i class="fas fa-times"></i></span>';
            }).join('') +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-sm btn-danger" onclick="vaciarCarrito()"><i class="fas fa-trash-alt"></i> Vaciar</button>' +
            '<button class="btn btn-sm btn-success" onclick="comprarCarrito()"><i class="fas fa-check-circle"></i> Comprar Todo</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  var inventario = u.inventario || [];
  var inventarioHTML = '';
  if (inventario.length > 0) {
    inventarioHTML =
      '<div class="card" style="margin:0 16px 12px;border:1px solid var(--accent);">' +
        '<div class="card-header" style="background:rgba(155,89,182,0.08);">' +
          '<h3><i class="fas fa-backpack"></i> Mi Inventario <span class="badge badge-info">' + inventario.reduce(function(s, i) { return s + i.cantidad; }, 0) + ' items</span></h3>' +
        '</div>' +
        '<div style="padding:8px 14px;overflow-x:auto;">' +
          '<table style="font-size:12px;"><thead><tr><th>Item</th><th>Categoría</th><th>Precio</th><th>Cant.</th><th>Comprado</th></tr></thead><tbody>' +
          inventario.map(function(inv) {
            return '<tr>' +
              '<td><strong>' + inv.nombre + '</strong></td>' +
              '<td>' + (inv.categoria || '—') + '</td>' +
              '<td style="color:var(--success);">$' + (inv.precio || 0).toLocaleString() + '</td>' +
              '<td>' + (inv.cantidad || 1) + '</td>' +
              '<td style="color:var(--text-muted);font-size:11px;">' + (inv.fechaCompra ? new Date(inv.fechaCompra).toLocaleDateString('es-CL') : '—') + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table>' +
        '</div>' +
      '</div>';
  }

  var tabsHTML = categoriasConItems.map(function(cat, i) {
    return '<div class="tab ' + (i === 0 ? 'active' : '') + '" data-tab="cat-' + cat.id + '"><i class="fas ' + cat.icon + '"></i> ' + cat.nombre + '</div>';
  }).join('');

  var tabContents = categoriasConItems.map(function(cat, i) {
    var catItems = tiendaItems.filter(function(it) { return it.categoria === cat.id; });
    return (
      '<div id="cat-' + cat.id + '" class="tab-content ' + (i === 0 ? 'active' : '') + '">' +
        '<div class="grid-3">' +
          catItems.map(function(item) {
            var itemId = item._id || item.id;
            var enCarrito = tiendaCart.indexOf(itemId) !== -1;
            var sinStock = item.stock <= 0;
            var stockBajo = item.stock <= 3 && item.stock > 0;
            return (
              '<div class="stat-card" style="text-align:left;' + (sinStock ? 'opacity:0.55;' : '') + '">' +
                '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">' +
                  '<i class="fas ' + item.icon + '" style="font-size:22px;color:var(--info);margin-top:3px;"></i>' +
                  '<div style="flex:1;">' +
                    '<h4 style="font-size:14px;margin:0;">' + item.nombre + '</h4>' +
                    '<span style="font-size:11px;color:' + (sinStock ? 'var(--danger)' : stockBajo ? 'var(--warning)' : 'var(--text-muted)') + ';">Stock: ' + item.stock + '</span>' +
                  '</div>' +
                '</div>' +
                '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;min-height:32px;">' + item.desc + '</p>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                  '<span style="font-weight:700;color:var(--success);">$' + item.precio.toLocaleString() + '</span>' +
                  (sinStock
                    ? '<span class="badge badge-danger">Agotado</span>'
                    : enCarrito
                      ? '<button class="btn btn-sm btn-success" onclick="quitarCarrito(\'' + itemId + '\')"><i class="fas fa-check"></i> En carrito</button>'
                      : '<button class="btn btn-sm btn-primary" onclick="agregarCarrito(\'' + itemId + '\')"><i class="fas fa-cart-plus"></i> Agregar</button>'
                  ) +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3><i class="fas fa-store"></i> Tienda Santiago Prime RP</h3>' +
        '<span style="color:var(--success);font-weight:700;font-size:16px;"><i class="fas fa-coins"></i> $' + u.dinero.toLocaleString() + '</span>' +
      '</div>' +
      '<div class="tabs" id="tienda-tabs">' + tabsHTML + '</div>' +
      cartHTML +
      inventarioHTML +
      tabContents +
      '<div id="tienda-result"></div>' +
      (tiendaItems.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-store-slash" style="font-size:48px;display:block;margin-bottom:12px;opacity:0.5;"></i>La tienda esta vacia</div>' : '') +
    '</div>'
  );
}

function agregarCarrito(id) {
  if (tiendaCart.indexOf(id) === -1) {
    tiendaCart.push(id);
  }
  App.navigate('tienda');
}

function quitarCarrito(id) {
  var idx = tiendaCart.indexOf(id);
  if (idx > -1) tiendaCart.splice(idx, 1);
  App.navigate('tienda');
}

function vaciarCarrito() {
  tiendaCart = [];
  App.navigate('tienda');
}

async function comprarCarrito() {
  var u = Auth.currentUser;
  var result = document.getElementById('tienda-result');
  if (!result) return;

  if (!tiendaCart.length) {
    result.innerHTML = App.showAlert('El carrito esta vacio', 'warning');
    return;
  }

  if (tiendaItems.length === 0) {
    await cargarTiendaItems();
  }

  var itemIds = tiendaCart.slice();
  var items = itemIds.map(function(id) {
    return tiendaItems.find(function(x) { return x._id === id || x.id === id; });
  }).filter(Boolean);

  if (items.length !== itemIds.length) {
    result.innerHTML = App.showAlert('Algunos items del carrito ya no estan disponibles', 'warning');
    tiendaCart = [];
    return;
  }

  var sinStock = items.filter(function(i) { return i.stock <= 0; });
  if (sinStock.length > 0) {
    result.innerHTML = App.showAlert('Algunos items estan agotados: ' + sinStock.map(function(i) { return i.nombre; }).join(', '), 'danger');
    return;
  }

  var total = items.reduce(function(s, i) { return s + i.precio; }, 0);

  if (total > u.dinero) {
    result.innerHTML = App.showAlert('Saldo insuficiente. Necesitas $' + total.toLocaleString() + ' pero tienes $' + u.dinero.toLocaleString(), 'danger');
    return;
  }

  var numItems = items.length;
  var detalle = items.map(function(i) { return i.nombre + ' — $' + i.precio.toLocaleString() + ' (Stock restante: ' + (i.stock - 1) + ')'; }).join('\n');
  if (!confirm('Confirmar compra de ' + numItems + ' item(s) por $' + total.toLocaleString() + '?\n\n' + detalle + '\n\nSaldo restante: $' + (u.dinero - total).toLocaleString())) return;

  try {
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var res = await API.comprarItemTienda(it._id || it.id);
      if (!res.success) {
        result.innerHTML = App.showAlert('Error al comprar ' + it.nombre + ': ' + (res.error || 'Error desconocido'), 'danger');
        return;
      }
      u.dinero = res.dinero;
      Auth.currentUser.dinero = res.dinero;
      if (res.inventario) { Auth.currentUser.inventario = res.inventario; }
      localStorage.setItem('wcrp_user', JSON.stringify(Auth.currentUser));
    }

    tiendaCart = [];
    tiendaItems = [];
    tiendaLoading = false;
    result.innerHTML = App.showAlert('Compra exitosa! ' + numItems + ' item(s) por $' + total.toLocaleString(), 'success');
    App.navigate('tienda');
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}

