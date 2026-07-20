const { supabase } = require('../config/db');

async function procesarEconomia() {
  try {
    const { data: economias, error } = await supabase.from('economia_config').select('*').eq('activo', true);
    if (error) throw error;
    if (!economias || economias.length === 0) return;

    const ahora = Date.now();

    for (const eco of economias) {
      const limiteMs = eco.frecuencia_pago_dias * 24 * 60 * 60 * 1000;
      const { data: usuarios, error: usersErr } = await supabase.from('users').select('*').eq('economia_role_id', eco.discord_role_id);
      if (usersErr) throw usersErr;

      for (const user of usuarios) {
        const ultimaVez = user.ultimo_sueldo ? new Date(user.ultimo_sueldo).getTime() : 0;
        if (ahora - ultimaVez < limiteMs) continue;

        const montoTotal = (eco.sueldo || 0) + (eco.bonificaciones || 0) + (eco.horas_extras || 0) - (eco.descuentos || 0);

        let nuevoDinero = user.dinero + montoTotal;
        if (eco.limite_dinero > 0 && nuevoDinero > eco.limite_dinero) {
          nuevoDinero = eco.limite_dinero;
        }
        const historial = user.historial_financiero || [];
        historial.push({
          tipo: 'salario',
          monto: montoTotal,
          concepto: `Sueldo: ${eco.nombre}`,
          saldoResultante: nuevoDinero,
          fecha: new Date(ahora)
        });

        await supabase.from('users').update({
          dinero: nuevoDinero,
          ultimo_sueldo: new Date(ahora).toISOString(),
          historial_financiero: historial
        }).eq('id', user.id);

        console.log(`[Economía] $${montoTotal.toLocaleString()} pagado a ${user.nombre} (${eco.nombre})`);
      }
    }
  } catch (err) {
    console.error('[Economía] Error procesando pagos:', err.message);
  }
}

module.exports = { procesarEconomia };
