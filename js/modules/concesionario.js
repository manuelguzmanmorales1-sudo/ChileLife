const ConcesionarioUI = {
  data: [],
  categoria: 'Todo',
  marca: 'Todas',
  busqueda: '',
  orden: 'menor',
  categorias: ['Todo', 'Deportivos', 'Super Deportivos', 'Sedan', 'SUV', 'Off-Road', 'Motos', 'Convertible', 'Clasicos', 'Minivan'],

  async cargar() {
    try {
      this.data = await API.getConcesionario();
    } catch (err) {
      console.error('[Concesionario] Error cargando:', err.message);
      this.data = [];
    }
  },

  marcasDisponibles() {
    const marcas = [...new Set(this.data.map(v => v.marca))].sort();
    return ['Todas', ...marcas];
  },

  filtrados() {
    let lista = [...this.data];
    if (this.categoria !== 'Todo') lista = lista.filter(v => v.categoria === this.categoria);
    if (this.marca !== 'Todas') lista = lista.filter(v => v.marca === this.marca);
    if (this.busqueda) {
      const q = this.busqueda.toLowerCase();
      lista = lista.filter(v => `${v.marca} ${v.modelo}`.toLowerCase().includes(q));
    }
    if (this.orden === 'menor') lista.sort((a, b) => a.precio - b.precio);
    else if (this.orden === 'mayor') lista.sort((a, b) => b.precio - a.precio);
    else lista.sort((a, b) => `${a.marca}${a.modelo}`.localeCompare(`${b.marca}${b.modelo}`));
    return lista;
  },

  setCategoria(cat) { this.categoria = cat; this.render(); },
  setMarca(m) { this.marca = m; this.render(); },

  aplicarFiltros() {
    this.busqueda = document.getElementById('conc-buscar').value;
    this.orden = document.getElementById('conc-orden').value;
    this.render();
  },

  render() {
    document.getElementById('conc-categorias').innerHTML = this.categorias.map(c => `
      <button class="chip ${this.categoria === c ? 'chip-active' : ''}" onclick="ConcesionarioUI.setCategoria('${c}')">${c}</button>
    `).join('');

    document.getElementById('conc-marcas').innerHTML = this.marcasDisponibles().map(m => `
      <button class="chip ${this.marca === m ? 'chip-active' : ''}" onclick="ConcesionarioUI.setMarca('${m}')"><i class="fas fa-car"></i> ${m}</button>
    `).join('');

    const contador = document.getElementById('conc-contador');
    if (contador) contador.textContent = this.data.length;

    const lista = this.filtrados();
    const grid = document.getElementById('conc-grid');

    if (!lista.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px;">No hay vehículos que coincidan con tu búsqueda.</p>`;
      return;
    }

    grid.innerHTML = lista.map(v => `
      <div class="vehiculo-card">
        <div class="vehiculo-img">
          ${v.imagen ? `<img src="${v.imagen}" alt="${v.modelo}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
          <div class="vehiculo-img-placeholder" style="${v.imagen ? 'display:none;' : ''}"><i class="fas fa-car"></i></div>
          ${v.destacado ? `<span class="vehiculo-star"><i class="fas fa-star"></i></span>` : ''}
          <span class="vehiculo-categoria-badge">${v.categoria}</span>
        </div>
        <div class="vehiculo-info">
          <div class="vehiculo-title">${v.marca} ${v.modelo}${v.anio ? ' ' + v.anio : ''}</div>
          <p class="vehiculo-desc">${v.descripcion || ''}</p>
          <div class="vehiculo-precio">$${v.precio.toLocaleString()}</div>
          <div class="vehiculo-footer">
            <span class="badge ${v.unidades > 0 ? 'badge-success' : 'badge-danger'}">${v.unidades > 0 ? v.unidades + ' unidades' : 'Agotado'}</span>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:10px;" ${v.unidades <= 0 ? 'disabled' : ''} onclick="ConcesionarioUI.comprar('${v._id}')">
            <i class="fas fa-shopping-cart"></i> Comprar
          </button>
        </div>
      </div>
    `).join('');
  },

  async comprar(id) {
    if (!confirm('¿Confirmás la compra de este vehículo?')) return;
    try {
      const res = await API.comprarVehiculoConcesionario(id);
      Auth.currentUser.dinero = res.dinero;
      Auth.currentUser.vehiculos = res.vehiculos;
      Auth.updateUI();
      await this.cargar();
      this.render();
      alert(`¡Vehículo comprado con éxito! Patente asignada: ${res.patente}`);
    } catch (err) {
      alert(err.message);
    }
  },

  abrirFormulario(vehiculo) {
    const v = vehiculo || {};
    App.showModal(v._id ? 'Editar Vehículo' : 'Agregar Vehículo', `
      <form onsubmit="event.preventDefault(); ConcesionarioUI.guardar('${v._id || ''}')">
        <div class="form-row">
          <div class="form-group"><label>Marca *</label><input class="form-control" id="conc-marca-input" value="${v.marca || ''}" placeholder="Ej: Toyota" required></div>
          <div class="form-group"><label>Modelo *</label><input class="form-control" id="conc-modelo-input" value="${v.modelo || ''}" placeholder="Ej: Tacoma" required></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Categoría</label>
            <select class="form-control" id="conc-categoria-input">
              ${this.categorias.filter(c => c !== 'Todo').map(c => `<option value="${c}" ${v.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Año</label><input class="form-control" id="conc-anio-input" type="number" value="${v.anio || new Date().getFullYear()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Precio *</label><input class="form-control" id="conc-precio-input" type="number" value="${v.precio || ''}" placeholder="Precio en pesos" required></div>
          <div class="form-group"><label>Unidades</label><input class="form-control" id="conc-unidades-input" type="number" value="${v.unidades ?? 1}"></div>
        </div>
        <div class="form-group"><label>Imagen (URL)</label><input class="form-control" id="conc-imagen-input" value="${v.imagen || ''}" placeholder="https://..."></div>
        <div class="form-group"><label>Descripción</label><input class="form-control" id="conc-descripcion-input" value="${v.descripcion || ''}" placeholder="Descripción del vehículo"></div>
        <div class="form-group" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="conc-destacado-input" ${v.destacado ? 'checked' : ''}> <label style="margin:0;">Destacado (⭐)</label>
        </div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Guardar</button>
      </form>
    `);
  },

  editar(id) {
    const v = this.data.find(x => x._id === id);
    if (v) this.abrirFormulario(v);
  },

  async guardar(id) {
    const data = {
      marca: document.getElementById('conc-marca-input').value.trim(),
      modelo: document.getElementById('conc-modelo-input').value.trim(),
      categoria: document.getElementById('conc-categoria-input').value,
      anio: parseInt(document.getElementById('conc-anio-input').value) || null,
      precio: parseInt(document.getElementById('conc-precio-input').value) || 0,
      unidades: parseInt(document.getElementById('conc-unidades-input').value) || 0,
      imagen: document.getElementById('conc-imagen-input').value.trim(),
      descripcion: document.getElementById('conc-descripcion-input').value.trim(),
      destacado: document.getElementById('conc-destacado-input').checked
    };
    if (!data.marca || !data.modelo || !data.precio) {
      alert('Marca, modelo y precio son obligatorios');
      return;
    }
    try {
      if (id) await API.updateVehiculoConcesionario(id, data);
      else await API.createVehiculoConcesionario(data);
      document.getElementById('modal-overlay').classList.add('hidden');
      await this.cargar();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este vehículo del catálogo?')) return;
    try {
      await API.deleteVehiculoConcesionario(id);
      await this.cargar();
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }
};

async function renderConcesionario() {
  await ConcesionarioUI.cargar();

  setTimeout(() => ConcesionarioUI.render(), 0);

  return `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
        <div>
          <span class="badge badge-info" style="margin-bottom:8px;display:inline-block;">CONCESIONARIO OFICIAL</span>
          <h2 style="margin:6px 0;"><i class="fas fa-car"></i> Catálogo de Vehículos del Servidor</h2>
          <p style="color:var(--text-muted);">Selecciona un modelo y realiza la compra con cargo directo a tu cuenta.</p>
        </div>
        <div style="text-align:right;">
          <div class="stat-card" style="min-width:160px;">
            <i class="fas fa-car" style="color:var(--info);"></i>
            <span class="stat-value" id="conc-contador">0</span>
            <span class="stat-label">Vehículos publicados</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="filtros-concesionario">
        <input type="text" class="form-control" id="conc-buscar" placeholder="Buscar por marca, modelo o nombre..." oninput="ConcesionarioUI.aplicarFiltros()">
        <select class="form-control" id="conc-orden" onchange="ConcesionarioUI.aplicarFiltros()" style="max-width:180px;">
          <option value="menor">Menor precio</option>
          <option value="mayor">Mayor precio</option>
          <option value="az">A-Z</option>
        </select>
      </div>
      <div class="chip-filtros" id="conc-categorias"></div>
      <div class="chip-filtros" id="conc-marcas"></div>
      <div class="vehiculo-grid" id="conc-grid"></div>
    </div>
  `;
}