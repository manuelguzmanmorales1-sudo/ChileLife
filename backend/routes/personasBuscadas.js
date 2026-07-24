const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return { _id: row.id, nombre: row.nombre, rut: row.rut, delito: row.delito, fechaInclusion: row.fecha_inclusion, estado: row.estado, descripcion: row.descripcion };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.query;
    let query = supabase.from('personas_buscadas').select('*');
    if (estado) query = query.eq('estado', estado);
    if (req.user.rol === 'ciudadano') query = query.eq('estado', 'Prófugo');
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('personas_buscadas').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'No encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { nombre, rut, delito, descripcion } = req.body;
    if (!nombre || !delito) return res.status(400).json({ error: 'Nombre y delito requeridos' });
    const { data, error } = await supabase.from('personas_buscadas').insert({
      nombre, rut: rut || 'Desconocido', delito, fecha_inclusion: new Date().toISOString().split('T')[0],
      estado: 'Prófugo', descripcion: descripcion || '', user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/capturar', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('personas_buscadas').update({ estado: 'Capturado' }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'No encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('personas_buscadas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
