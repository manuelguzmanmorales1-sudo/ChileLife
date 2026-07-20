const { supabase } = require('../config/db');

// Revisa cada rol con sueldo automático activo y le paga a quienes ya
// cumplieron su frecuencia (o nunca cobraron), usando el campo
// users.ultimo_sueldo para saber cuándo tocó la última vez.
async function pagarSueldosAutomaticos() {
  try {
    const { data: configs, error: cfgError } = await supabase
      .from('sueldos_config')
      .select('*')
      .eq('activo', true);
    if (cfgError || !configs || configs.length === 0) return;

    for (const cfg of configs) {
      if (!cfg.sueldo || cfg.sueldo <= 0) continue;

      const limite = new Date(Date.now() - cfg.frecuencia_dias * 24 * 60 * 60 * 1000).toISOString();
      const { data: usuarios, error } = await supabase
        .from('users')
        .select('id, dinero, historial_financiero, ultimo_sueldo')
        .eq('rol', cfg.rol)
        .or(`ultimo_sueldo.is.null,ultimo_sueldo.lt.${limite}`);
      if (error || !usuarios || usuarios.length === 0) continue;

      for (const u of usuarios) {
        const nuevoDinero = (u.dinero || 0) + cfg.sueldo;
        const historial = u.historial_financiero || [];
        historial.push({
          tipo: 'salario', monto: cfg.sueldo,
          concepto: `Sueldo automático (${cfg.rol})`,
          saldoResultante: nuevoDinero, fecha: new Date()
        });
        await supabase.from('users').update({
          dinero: nuevoDinero,
          historial_financiero: historial,
          ultimo_sueldo: new Date().toISOString()
        }).eq('id', u.id);
      }
      console.log(`[Sueldos automáticos] Pagado a ${usuarios.length} usuario(s) con rol ${cfg.rol}`);
    }
  } catch (err) {
    console.error('[Sueldos automáticos] Error:', err.message);
  }
}

module.exports = { pagarSueldosAutomaticos };