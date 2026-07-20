const { supabase } = require('../config/db');

// Paga a todos los usuarios que tengan un rol fijo (ciudadano/carabinero/pdi/municipal/admin)
// con sueldo automático activado en sueldos_config, respetando la frecuencia en días.
async function procesarSueldosPorRol() {
  const { data: configs, error } = await supabase.from('sueldos_config').select('*').eq('activo', true);
  if (error) { console.error('[Sueldos] Error leyendo sueldos_config:', error.message); return; }
  if (!configs || configs.length === 0) return;

  const ahora = Date.now();

  for (const cfg of configs) {
    if (!cfg.sueldo || cfg.sueldo <= 0) continue;
    const frecuenciaMs = (cfg.frecuencia_dias || 3) * 24 * 60 * 60 * 1000;

    const { data: usuarios, error: usersErr } = await supabase.from('users').select('*').eq('rol', cfg.rol);
    if (usersErr) { console.error('[Sueldos] Error leyendo usuarios:', usersErr.message); continue; }

    for (const user of usuarios) {
      const ultimaVez = user.ultimo_sueldo_rol ? new Date(user.ultimo_sueldo_rol).getTime() : 0;
      if (ahora - ultimaVez < frecuenciaMs) continue;

      const nuevoDinero = user.dinero + cfg.sueldo;
      const historial = user.historial_financiero || [];
      historial.push({
        tipo: 'salario', monto: cfg.sueldo, concepto: `Sueldo ${cfg.rol}`,
        saldoResultante: nuevoDinero, fecha: new Date(ahora)
      });

      await supabase.from('users').update({
        dinero: nuevoDinero,
        ultimo_sueldo_rol: new Date(ahora).toISOString(),
        historial_financiero: historial
      }).eq('id', user.id);

      console.log(`[Sueldos] $${cfg.sueldo.toLocaleString()} pagado a ${user.nombre} (rol: ${cfg.rol})`);
    }
  }
}

// Paga a los usuarios con una asignación recurrente de "tipo de sueldo" (presets del panel de Staff),
// cada 3 días mientras la asignación esté activa.
async function procesarSueldosAsignados() {
  const { data: asignaciones, error } = await supabase.from('sueldos_asignados').select('*, users:user_id (*)').eq('activo', true);
  if (error) { console.error('[Sueldos] Error leyendo sueldos_asignados:', error.message); return; }
  if (!asignaciones || asignaciones.length === 0) return;

  const ahora = Date.now();
  const FRECUENCIA_MS = 3 * 24 * 60 * 60 * 1000; // cada 3 días

  for (const asignacion of asignaciones) {
    const user = asignacion.users;
    if (!user) continue;

    const ultimaVez = asignacion.ultimo_pago ? new Date(asignacion.ultimo_pago).getTime() : 0;
    if (ahora - ultimaVez < FRECUENCIA_MS) continue;

    const nuevoDinero = user.dinero + asignacion.monto;
    const historial = user.historial_financiero || [];
    historial.push({
      tipo: 'salario', monto: asignacion.monto, concepto: asignacion.nombre,
      saldoResultante: nuevoDinero, fecha: new Date(ahora)
    });

    await supabase.from('users').update({ dinero: nuevoDinero, historial_financiero: historial }).eq('id', user.id);
    await supabase.from('sueldos_asignados').update({ ultimo_pago: new Date(ahora).toISOString() }).eq('id', asignacion.id);

    console.log(`[Sueldos] $${asignacion.monto.toLocaleString()} pagado a ${user.nombre} (${asignacion.nombre})`);
  }
}

async function procesarSueldos() {
  try {
    await procesarSueldosPorRol();
    await procesarSueldosAsignados();
  } catch (err) {
    console.error('[Sueldos] Error procesando pagos:', err.message);
  }
}

module.exports = { procesarSueldos };