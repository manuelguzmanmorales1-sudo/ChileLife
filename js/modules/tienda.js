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

  var adminHTML = '';
  if (u.rol === 'admin') {
    adminHTML =
      '<div class="card" style="margin:16px;border:1px solid var(--accent);">' +
        '<div class="card-header" style="background:var(--accent)11;">' +
          '<h3><i class="fas fa-crown" style="color:var(--accent);"></i> Administracion de Tienda</h3>' +
          '<button class="btn btn-sm btn-primary" onclick="adminTiendaMostrarForm()"><i class="fas fa-plus"></i> Agregar Item</button>' +
        '</div>' +
        '<div id="admin-tienda-form" style="padding:14px;display:none;background:var(--bg-card);border-bottom:1px solid var(--border-color);">' +
          '<div class="grid-2" style="gap:10px;">' +
            '<div class="form-group"><label>Nombre *</label><input class="form-control" id="at-nombre" placeholder="Nombre del item"></div>' +
            '<div class="form-group"><label>Categoria *</label><select class="form-control" id="at-categoria">' +
              tiendaCategorias.map(function(c) { return '<option value="' + c.id + '">' + c.nombre + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="form-group"><label>Precio *</label><input class="form-control" id="at-precio" type="number" min="1" placeholder="Precio en pesos"></div>' +
            '<div class="form-group"><label>Stock</label><input class="form-control" id="at-stock" type="number" min="0" value="10"></div>' +
            '<div class="form-group"><label>Icono (FontAwesome)</label><input class="form-control" id="at-icon" placeholder="fa-box"></div>' +
            '<div class="form-group"><label>Descripcion</label><input class="form-control" id="at-desc" placeholder="Descripcion del item"></div>' +
          '</div>' +
          '<div style="margin-top:10px;display:flex;gap:8px;">' +
            '<input type="hidden" id="at-edit-id" value="">' +
            '<button class="btn btn-primary" onclick="adminTiendaGuardar()"><i class="fas fa-save"></i> Guardar</button>' +
            '<button class="btn btn-outline" onclick="adminTiendaCancelar()"><i class="fas fa-times"></i> Cancelar</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:8px 14px;overflow-x:auto;">' +
          '<table style="font-size:11px;">' +
            '<thead><tr>' +
              '<th>Item</th><th>Cat</th><th>Precio</th><th>Stock</th><th style="width:80px;">Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' +
              tiendaItems.map(function(item) {
                var itemId = item._id || item.id;
                return '<tr>' +
                  '<td><strong>' + item.nombre + '</strong><br><small style="color:var(--text-muted);">' + item.desc + '</small></td>' +
                  '<td>' + item.categoria + '</td>' +
                  '<td style="color:var(--success);">$' + item.precio.toLocaleString() + '</td>' +
                  '<td style="color:' + (item.stock <= 0 ? 'var(--danger)' : item.stock <= 3 ? 'var(--warning)' : 'var(--text-muted)') + ';">' + item.stock + '</td>' +
                  '<td>' +
                    '<button class="btn btn-sm btn-info" style="margin-right:4px;padding:2px 6px;" onclick="adminTiendaEditar(\'' + itemId + '\')" title="Editar"><i class="fas fa-edit"></i></button>' +
                    '<button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="adminTiendaEliminar(\'' + itemId + '\', \'' + item.nombre.replace(/'/g, "\\'") + '\')" title="Eliminar"><i class="fas fa-trash-alt"></i></button>' +
                  '</td>' +
                '</tr>';
              }).join('') +
              (tiendaItems.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No hay items en la tienda</td></tr>' : '') +
            '</tbody>' +
          '</table>' +
        '</div>' +
        '<div id="admin-tienda-result" style="padding:0 14px 14px;"></div>' +
      '</div>';
  }

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
      adminHTML +
      (tiendaItems.length === 0 && u.rol !== 'admin' ? '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-store-slash" style="font-size:48px;display:block;margin-bottom:12px;opacity:0.5;"></i>La tienda esta vacia</div>' : '') +
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

function adminTiendaMostrarForm() {
  var form = document.getElementById('admin-tienda-form');
  form.style.display = 'block';
  document.getElementById('at-edit-id').value = '';
  document.getElementById('at-nombre').value = '';
  document.getElementById('at-precio').value = '';
  document.getElementById('at-stock').value = '10';
  document.getElementById('at-icon').value = 'fa-box';
  document.getElementById('at-desc').value = '';
  document.getElementById('at-categoria').value = 'comunicacion';
  document.getElementById('at-nombre').focus();
}

function adminTiendaCancelar() {
  document.getElementById('admin-tienda-form').style.display = 'none';
  document.getElementById('at-edit-id').value = '';
}

async function adminTiendaGuardar() {
  var editId = document.getElementById('at-edit-id').value;
  var nombre = document.getElementById('at-nombre').value.trim();
  var precio = parseInt(document.getElementById('at-precio').value) || 0;
  var stock = parseInt(document.getElementById('at-stock').value) || 0;
  var icon = document.getElementById('at-icon').value.trim();
  var desc = document.getElementById('at-desc').value.trim();
  var categoria = document.getElementById('at-categoria').value;
  var result = document.getElementById('admin-tienda-result');

  if (!nombre || precio <= 0 || !categoria) {
    result.innerHTML = App.showAlert('Nombre, precio y categoria son obligatorios', 'danger');
    return;
  }

  try {
    if (editId) {
      await API.updateTiendaItem(editId, { nombre, precio, desc, icon, categoria, stock });
      result.innerHTML = App.showAlert('Item "' + nombre + '" actualizado correctamente', 'success');
    } else {
      await API.createTiendaItem({ nombre, precio, desc, icon, categoria, stock });
      result.innerHTML = App.showAlert('Item "' + nombre + '" creado correctamente', 'success');
    }
    adminTiendaCancelar();
    tiendaItems = [];
    tiendaLoading = false;
    App.navigate('tienda');
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}

function adminTiendaEditar(id) {
  var item = tiendaItems.find(function(x) { return x._id === id || x.id === id; });
  if (!item) return;

  var form = document.getElementById('admin-tienda-form');
  form.style.display = 'block';
  document.getElementById('at-edit-id').value = item._id || item.id;
  document.getElementById('at-nombre').value = item.nombre;
  document.getElementById('at-precio').value = item.precio;
  document.getElementById('at-stock').value = item.stock;
  document.getElementById('at-icon').value = item.icon || 'fa-box';
  document.getElementById('at-desc').value = item.desc || '';
  document.getElementById('at-categoria').value = item.categoria;
  document.getElementById('at-nombre').focus();
}

async function adminTiendaEliminar(id, nombre) {
  if (!confirm('Eliminar "' + nombre + '" de la tienda?\n\nEsta accion no se puede deshacer.')) return;

  var result = document.getElementById('admin-tienda-result');
  try {
    await API.deleteTiendaItem(id);
    result.innerHTML = App.showAlert('Item "' + nombre + '" eliminado de la tienda', 'success');
    tiendaItems = [];
    tiendaLoading = false;
    App.navigate('tienda');
  } catch (err) {
    result.innerHTML = App.showAlert('Error: ' + err.message, 'danger');
  }
}
