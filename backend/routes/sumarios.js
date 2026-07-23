const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, funcionario: row.funcionario, rut: row.rut, motivo: row.motivo,
    fecha: row.fecha, estado: row.estado, userId: row.user_id
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol === 'ciudadano') return res.json([]);
    const { estado } = req.query;
    let query = supabase.from('sumarios').select('*');
    if (estado) query = query.eq('estado', estado);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('sumarios').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Sumario no encontrado' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { funcionario, rut, motivo } = req.body;
    if (!funcionario || !motivo) return res.status(400).json({ error: 'Funcionario y motivo requeridos' });
    const fecha = new Date().toISOString().split('T')[0];
    const { data: sumario, error } = await supabase.from('sumarios').insert({
      funcionario, rut: rut || '', motivo,
      fecha, estado: 'Pendiente', user_id: req.user.id
    }).select().single();
    if (error) throw error;

    if (rut) {
      const { data: func } = await supabase.from('funcionarios').select('*').eq('rut', rut).single();
      if (func) {
        const sumariosArr = func.sumarios || [];
        sumariosArr.push({ motivo, fecha, estado: 'Pendiente' });
        await supabase.from('funcionarios').update({ sumarios: sumariosArr }).eq('rut', rut);
      }
    }
    res.status(201).json(toClient(sumario));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { funcionario, rut, motivo, fecha, estado } = req.body;
    const updates = {};
    if (funcionario !== undefined) updates.funcionario = funcionario;
    if (rut !== undefined) updates.rut = rut;
    if (motivo !== undefined) updates.motivo = motivo;
    if (fecha !== undefined) updates.fecha = fecha;
    if (estado !== undefined) updates.estado = estado;

    const { data: sumario, error } = await supabase.from('sumarios').update(updates).eq('id', req.params.id).select().single();
    if (error || !sumario) return res.status(404).json({ error: 'Sumario no encontrado' });

    if (sumario.rut) {
      const { data: func } = await supabase.from('funcionarios').select('*').eq('rut', sumario.rut).single();
      if (func && Array.isArray(func.sumarios)) {
        const sumariosArr = func.sumarios.map(s => s.motivo === sumario.motivo ? { ...s, estado: sumario.estado } : s);
        await supabase.from('funcionarios').update({ sumarios: sumariosArr }).eq('rut', sumario.rut);
      }
    }
    res.json(toClient(sumario));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('sumarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;