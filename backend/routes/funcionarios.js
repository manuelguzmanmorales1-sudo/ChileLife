const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, rut: row.rut, nombre: row.nombre, cargo: row.cargo, unidad: row.unidad,
    exp: row.exp, fechaIngreso: row.fecha_ingreso, nacimiento: row.nacimiento,
    telefono: row.telefono, direccion: row.direccion, sumarios: row.sumarios || []
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol === 'ciudadano') return res.json([]);
    const { unidad } = req.query;
    let query = supabase.from('funcionarios').select('*');
    if (unidad) query = query.eq('unidad', unidad);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: func, error } = await supabase.from('funcionarios').select('*').eq('id', req.params.id).single();
    if (error || !func) return res.status(404).json({ error: 'Funcionario no encontrado' });
    const { data: sumarios } = await supabase.from('sumarios').select('*').eq('rut', func.rut);
    res.json({ ...toClient(func), sumarios: sumarios || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { rut, nombre, cargo, unidad, fechaIngreso, nacimiento, telefono, direccion } = req.body;
    if (!rut || !nombre || !cargo || !unidad)
      return res.status(400).json({ error: 'RUT, nombre, cargo y unidad requeridos' });
    const { data: exists } = await supabase.from('funcionarios').select('id').eq('rut', rut).single();
    if (exists) return res.status(400).json({ error: 'Funcionario ya existe' });
    const { data: func, error } = await supabase.from('funcionarios').insert({
      rut, nombre, cargo, unidad,
      fecha_ingreso: fechaIngreso, nacimiento, telefono, direccion
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(func));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { rut, nombre, cargo, unidad, exp, fechaIngreso, nacimiento, telefono, direccion } = req.body;
    const updates = {};
    if (rut !== undefined) updates.rut = rut;
    if (nombre !== undefined) updates.nombre = nombre;
    if (cargo !== undefined) updates.cargo = cargo;
    if (unidad !== undefined) updates.unidad = unidad;
    if (exp !== undefined) updates.exp = exp;
    if (fechaIngreso !== undefined) updates.fecha_ingreso = fechaIngreso;
    if (nacimiento !== undefined) updates.nacimiento = nacimiento;
    if (telefono !== undefined) updates.telefono = telefono;
    if (direccion !== undefined) updates.direccion = direccion;
    const { data: func, error } = await supabase.from('funcionarios').update(updates).eq('id', req.params.id).select().single();
    if (error || !func) return res.status(404).json({ error: 'Funcionario no encontrado' });
    res.json(toClient(func));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/sumario', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: func, error: fetchErr } = await supabase.from('funcionarios').select('*').eq('id', req.params.id).single();
    if (fetchErr || !func) return res.status(404).json({ error: 'Funcionario no encontrado' });
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ error: 'Motivo requerido' });
    const sumarioData = { motivo, fecha: new Date().toISOString().split('T')[0], estado: 'Pendiente' };
    const sumariosArr = [...(func.sumarios || []), sumarioData];

    const { data: updated, error } = await supabase.from('funcionarios').update({ sumarios: sumariosArr }).eq('id', req.params.id).select().single();
    if (error) throw error;
    await supabase.from('sumarios').insert({
      funcionario: func.nombre, rut: func.rut, motivo,
      fecha: sumarioData.fecha, estado: 'Pendiente', user_id: req.user.id
    });
    res.json(toClient(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('funcionarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
