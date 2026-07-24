const { supabase } = require('../config/db');

async function crearNotificacion(userId, tipo, titulo, mensaje) {
  try {
    await supabase.from('notificaciones').insert({ user_id: userId, tipo, titulo, mensaje: mensaje || '' });
  } catch (err) {
    console.error('[Notificar] Error creando notificación:', err.message);
  }
}

module.exports = { crearNotificacion };
