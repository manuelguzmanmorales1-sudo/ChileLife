const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { crearNotificacion } = require('../utils/notificar');

const soloAdmin = [authMiddleware, requireRole('admin')];

const SUELDOS_PRESET = [
  { key: 'dark_elite', nombre: 'Sueldo Membresía Dark Elite', badge: 'DARK', monto: 3000000 },
  { key: 'elite', nombre: 'Sueldo Membresía Elite', badge: 'ELITE', monto: 2350000 },
  { key: 'prime', nombre: 'Sueldo Membresía Prime', badge: 'PRIME', monto: 1800000 },
  { key: 'liquido_extremo', nombre: 'Sueldo Líquido Extremo', badge: '', monto: 4000000 },
  { key: 'liquido_alto', nombre: 'Sueldo Líquido Alto', badge: '', monto: 2000000 },
  { key: 'liquido_medio', nombre: 'Sueldo Líquido Medio', badge: '', monto: 1200000 },
  { key: 'liquido_bajo', nombre: 'Sueldo Líquido Bajo', badge: '', monto: 700000 }
];

async function registrarLog({ tipo, descripcion, monto, staffNombre, objetivoNombre }) {
  await supabase.from('staff_logs').insert({
    tipo, descripcion, monto,
    staff_nombre: staffNombre || '',
    objetivo_nombre: objetivoNombre || ''
  });
}

function toClientCedula(row) {
  return {
    _id: row.id,
    nombre: row.nombre,
    rut: row.rut,
    nacionalidad: row.nacionalidad,
    rol: row.rol,
    congelado: row.congelado || false,
    dinero: row.dinero
  };
}

// ===== CÉDULAS =====
router.get('/cedulas', ...soloAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase.from('users').select('*').not('rut', 'is', null);
    if (search) query = query.or(`nombre.ilike.%${search}%,rut.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClientCedula));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cedulas/:id/congelar', ...soloAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('congelado, nombre').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'No encontrado' });
    const { data, error } = await supabase.from('users').update({ congelado: !user.congelado }).eq('id', req.params.id).select().single();
    if (error) throw error;
    await registrarLog({
      tipo: 'Cédula',
      descripcion: `Cédula ${data.congelado ? 'congelada' : 'reactivada'}`,
      staffNombre: req.user.nombre,
      objetivoNombre: user.nombre
    });
    res.json(toClientCedula(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cedulas/:id', ...soloAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('nombre').eq('id', req.params.id).single();
    const { error } = await supabase.from('users').update({ rut: null, dni_numero: '' }).eq('id', req.params.id);
    if (error) throw error;
    await registrarLog({ tipo: 'Cédula', descripcion: 'Cédula eliminada', staffNombre: req.user.nombre, objetivoNombre: user ? user.nombre : '' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== BUSCAR USUARIO (para selects de Sueldos/Economía) =====
router.get('/buscar-usuario', ...soloAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const { data, error } = await supabase
      .from('users')
      .select('id, nombre, rut, dinero')
      .or(`nombre.ilike.%${q}%,rut.ilike.%${q}%`)
      .limit(10);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SUELDOS (asignación recurrente con presets, se paga solo cada 3 días) =====
router.get('/sueldos-preset', ...soloAdmin, (req, res) => res.json(SUELDOS_PRESET));

router.get('/sueldos-asignados', ...soloAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sueldos_asignados')
      .select('*, users:user_id (nombre, rut)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(a => ({
      _id: a.id, userId: a.user_id, nombreUsuario: a.users ? a.users.nombre : '',
      rut: a.users ? a.users.rut : '', presetKey: a.preset_key, nombre: a.nombre,
      monto: a.monto, activo: a.activo, ultimoPago: a.ultimo_pago
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/asignar-sueldo', ...soloAdmin, async (req, res) => {
  try {
    const { userId, presetKey } = req.body;
    const preset = SUELDOS_PRESET.find(s => s.key === presetKey);
    if (!preset) return res.status(400).json({ error: 'Tipo de sueldo inválido' });

    const { data: user, error: uError } = await supabase.from('users').select('id, nombre').eq('id', userId).single();
    if (uError || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Se guarda como asignación recurrente (no se paga de inmediato: el próximo ciclo del
    // programador de sueldos lo tomará y le pagará cada 3 días mientras esté activo).
    const { data: asignacion, error } = await supabase.from('sueldos_asignados').upsert({
      user_id: userId, preset_key: preset.key, nombre: preset.nombre, monto: preset.monto,
      activo: true
    }, { onConflict: 'user_id' }).select().single();
    if (error) throw error;

    await registrarLog({
      tipo: 'Sueldo', descripcion: `Sueldo recurrente asignado: ${preset.nombre} ($${preset.monto.toLocaleString()} cada 3 días)`,
      monto: preset.monto, staffNombre: req.user.nombre, objetivoNombre: user.nombre
    });
    await crearNotificacion(user.id, 'sueldo', 'Sueldo asignado', `Se te asignó "${preset.nombre}" — $${preset.monto.toLocaleString()} cada 3 días.`);

    res.json({ success: true, asignacion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sueldos-asignados/:userId', ...soloAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('sueldos_asignados').update({ activo: false }).eq('user_id', req.params.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ECONOMÍA (modificar saldo / transferir manualmente) =====
router.post('/economia/modificar-saldo', ...soloAdmin, async (req, res) => {
  try {
    const { userId, monto, motivo, accion } = req.body;
    if (!userId || !monto || !motivo) return res.status(400).json({ error: 'Usuario, monto y motivo son obligatorios' });

    const { data: user, error: uError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (uError || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const delta = accion === 'quitar' ? -Math.abs(monto) : Math.abs(monto);
    const nuevoDinero = Math.max(0, user.dinero + delta);
    const historial = user.historial_financiero || [];
    historial.push({ tipo: accion === 'quitar' ? 'descuento' : 'bonificacion', monto: delta, concepto: motivo, saldoResultante: nuevoDinero, fecha: new Date() });

    await supabase.from('users').update({ dinero: nuevoDinero, historial_financiero: historial }).eq('id', userId);
    await registrarLog({
      tipo: 'Dinero', descripcion: `${delta >= 0 ? '+' : ''}$${delta.toLocaleString()}. ${motivo}`,
      monto: delta, staffNombre: req.user.nombre, objetivoNombre: user.nombre
    });

    res.json({ success: true, dinero: nuevoDinero });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/economia/transferir', ...soloAdmin, async (req, res) => {
  try {
    const { origenId, destinoId, monto, motivo } = req.body;
    if (!origenId || !destinoId || !monto) return res.status(400).json({ error: 'Origen, destino y monto son obligatorios' });

    const { data: origen } = await supabase.from('users').select('*').eq('id', origenId).single();
    const { data: destino } = await supabase.from('users').select('*').eq('id', destinoId).single();
    if (!origen || !destino) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (origen.dinero < monto) return res.status(400).json({ error: 'Saldo insuficiente en el origen' });

    await supabase.from('users').update({ dinero: origen.dinero - monto }).eq('id', origenId);
    await supabase.from('users').update({ dinero: destino.dinero + monto }).eq('id', destinoId);

    await registrarLog({
      tipo: 'Transferencia', descripcion: `$${monto.toLocaleString()} de ${origen.nombre} a ${destino.nombre}. ${motivo || ''}`,
      monto, staffNombre: req.user.nombre, objetivoNombre: destino.nombre
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== INVENTARIO (ver y quitar items/vehículos de cualquier usuario) =====
router.get('/inventario/:userId', ...soloAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('nombre, inventario, vehiculos').eq('id', req.params.userId).single();
    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inventario/:userId/item/:itemId', ...soloAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('inventario').eq('id', req.params.userId).single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const inventario = (user.inventario || []).filter(i => i.itemId !== req.params.itemId);
    await supabase.from('users').update({ inventario }).eq('id', req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inventario/:userId/vehiculo/:vehiculoId', ...soloAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('vehiculos').eq('id', req.params.userId).single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const vehiculos = (user.vehiculos || []).filter(v => v.vehiculoId !== req.params.vehiculoId && v.patente !== req.params.vehiculoId);
    await supabase.from('users').update({ vehiculos }).eq('id', req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LOGS =====
router.get('/logs', ...soloAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase.from('staff_logs').select('*');
    if (search) query = query.or(`staff_nombre.ilike.%${search}%,objetivo_nombre.ilike.%${search}%,descripcion.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;