const MensajesUI = {
  conversaciones: [],
  contactoActual: null,
  mensajes: [],

  async cargar() {
    try { this.conversaciones = await API.getConversaciones(); } catch (e) { this.conversaciones = []; }
  },

  render() {
    const cont = document.getElementById('msj-lista');
    if (!cont) return;
    cont.innerHTML = this.conversaciones.length ? this.conversaciones.map(c => `
      <div style="padding:10px 12px;border-radius:var(--radius);cursor:pointer;background:${this.contactoActual === c.contactoId ? 'var(--bg-input)' : 'transparent'};margin-bottom:4px;" onclick="MensajesUI.abrirConversacion('${c.contactoId}','${c.nombre.replace(/'/g,"")}','${c.rut}')">
        <div style="display:flex;justify-content:space-between;">
          <strong style="font-size:13px;">${c.nombre}</strong>
          ${c.noLeidos > 0 ? `<span class="badge badge-danger">${c.noLeidos}</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.ultimoTexto}</div>
      </div>
    `).join('') : '<p style="color:var(--text-muted);font-size:13px;padding:10px;">Sin conversaciones todavía.</p>';
  },

  async abrirConversacion(contactoId, nombre, rut) {
    this.contactoActual = contactoId;
    this.contactoNombre = nombre;
    this.render();
    const chat = document.getElementById('msj-chat');
    chat.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Cargando...</p>';
    try {
      this.mensajes = await API.getConversacion(contactoId);
      this.renderChat(rut);
      await this.cargar();
    } catch (e) {
      chat.innerHTML = App.showAlert(e.message, 'danger');
    }
  },

  renderChat(rut) {
    const chat = document.getElementById('msj-chat');
    const uid = Auth.currentUser.id;
    chat.innerHTML = `
      <div style="padding:12px;border-bottom:1px solid var(--glass-border);font-weight:700;">${this.contactoNombre}</div>
      <div id="msj-mensajes" style="height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;">
        ${this.mensajes.map(m => `
          <div style="max-width:70%;align-self:${m.deUserId === uid ? 'flex-end' : 'flex-start'};background:${m.deUserId === uid ? 'var(--accent)' : 'var(--bg-input)'};color:${m.deUserId === uid ? '#fff' : 'var(--text)'};padding:8px 12px;border-radius:12px;font-size:13px;">
            ${m.texto}
            <div style="font-size:10px;opacity:0.7;margin-top:2px;">${new Date(m.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);font-size:13px;">Todavía no hay mensajes.</p>'}
      </div>
      <div style="display:flex;gap:8px;padding:12px;border-top:1px solid var(--glass-border);">
        <input class="form-control" id="msj-input" placeholder="Escribe un mensaje..." onkeydown="if(event.key==='Enter')MensajesUI.enviar('${rut}')">
        <button class="btn btn-primary" onclick="MensajesUI.enviar('${rut}')"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;
    const box = document.getElementById('msj-mensajes');
    if (box) box.scrollTop = box.scrollHeight;
  },

  async enviar(rut) {
    const input = document.getElementById('msj-input');
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    try {
      await API.enviarMensaje(rut, texto);
      await this.abrirConversacion(this.contactoActual, this.contactoNombre, rut);
    } catch (e) { alert(e.message); }
  },

  async iniciarNuevaConversacion() {
    const rut = prompt('Ingresa el RUT de la persona con la que querés hablar:');
    if (!rut) return;
    const texto = prompt('Escribe tu primer mensaje:');
    if (!texto) return;
    try {
      await API.enviarMensaje(rut.trim(), texto.trim());
      await this.cargar();
      this.render();
    } catch (e) { alert(e.message); }
  }
};

async function renderMensajes() {
  await MensajesUI.cargar();
  setTimeout(() => MensajesUI.render(), 0);
  return `
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-comment-dots"></i> Mensajería</h3>
        <button class="btn btn-sm btn-primary" onclick="MensajesUI.iniciarNuevaConversacion()"><i class="fas fa-plus"></i> Nueva conversación</button>
      </div>
      <div style="display:grid;grid-template-columns:280px 1fr;gap:0;border-top:1px solid var(--glass-border);">
        <div id="msj-lista" style="border-right:1px solid var(--glass-border);padding:10px;max-height:400px;overflow-y:auto;"></div>
        <div id="msj-chat" style="display:flex;flex-direction:column;">
          <p style="color:var(--text-muted);padding:20px;">Selecciona una conversación o inicia una nueva.</p>
        </div>
      </div>
    </div>
  `;
}
