const { supabase } = require('../config/db');

// Registro de acciones para el Panel de Staff (tabla staff_logs).
// Se usa desde cualquier ruta del backend para dejar trazabilidad.
async function registrarLogGlobal({ tipo, descripcion, monto, staffNombre, objetivoNombre }) {
  try {
    await supabase.from('staff_logs').insert({
      tipo, descripcion, monto: monto ?? null,
      staff_nombre: staffNombre || '',
      objetivo_nombre: objetivoNombre || ''
    });
  } catch (err) {
    console.error('[LogGlobal] Error registrando log:', err.message);
  }
}

module.exports = { registrarLogGlobal };
