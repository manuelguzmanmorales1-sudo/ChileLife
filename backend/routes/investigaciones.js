const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const rolesPoliciales = ['carabinero', 'pdi', 'admin'];

function toClient(row) {
  return {
    _id: row.id, titulo: row.titulo, tipo: row.tipo, encargado: row.encargado,
    fecha: row.fecha, estado: row.estado, evidencias: row.evidencias || [],
    descripcion: row.descripcion, userId: row.user_id
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!rolesPoliciales.includes(req.user.rol)) return res.json([]);
    const { estado } = req.query;
    let query = supabase.from('investigaciones').select('*');
    if (estado) query = query.eq('estado', estado);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('investigaciones').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Investigación no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { titulo, tipo, encargado, fotos, videos, audio, texto, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });
    const evidencias = [];
    if (fotos) evidencias.push(`Fotos: ${fotos}`);
    if (videos) evidencias.push(`Videos: ${videos}`);
    if (audio) evidencias.push(`Audio: ${audio}`);
    if (texto) evidencias.push(`Texto: ${texto}`);
    const { data, error } = await supabase.from('investigaciones').insert({
      titulo, tipo: tipo || 'Otro', encargado: encargado || '',
      fecha: new Date().toISOString().split('T')[0], estado: 'Activa',
      evidencias: evidencias.length > 0 ? evidencias : ['Sin evidencias'],
      descripcion: descripcion || '',
      user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { titulo, tipo, encargado, fecha, estado, evidencias, descripcion } = req.body;
    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo;
    if (tipo !== undefined) updates.tipo = tipo;
    if (encargado !== undefined) updates.encargado = encargado;
    if (fecha !== undefined) updates.fecha = fecha;
    if (estado !== undefined) updates.estado = estado;
    if (evidencias !== undefined) updates.evidencias = evidencias;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    const { data, error } = await supabase.from('investigaciones').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Investigación no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/toggle', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: inv, error: fetchErr } = await supabase.from('investigaciones').select('*').eq('id', req.params.id).single();
    if (fetchErr || !inv) return res.status(404).json({ error: 'Investigación no encontrada' });
    const nuevoEstado = inv.estado === 'Activa' ? 'Cerrada' : 'Activa';
    const { data, error } = await supabase.from('investigaciones').update({ estado: nuevoEstado }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('investigaciones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
