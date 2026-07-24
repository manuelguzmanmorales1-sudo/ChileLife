const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, nombreReportante: row.nombre_reportante, descripcion: row.descripcion,
    ubicacion: row.ubicacion, estado: row.estado, atendidaPor: row.atendida_por, fecha: row.created_at
  };
}

// Reportar una emergencia (cualquier ciudadano logueado)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { descripcion, ubicacion } = req.body;
    if (!descripcion || !descripcion.trim()) return res.status(400).json({ error: 'Describe la emergencia' });
    const { data, error } = await supabase.from('emergencias').insert({
      user_id: req.user.id, nombre_reportante: req.user.nombre,
      descripcion: descripcion.trim(), ubicacion: ubicacion || '', estado: 'Pendiente'
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Ver emergencias (solo personal policial/municipal/admin)
router.get('/', authMiddleware, requireRole('carabinero', 'pdi', 'municipal', 'admin'), async (req, res) => {
  try {
    const { estado } = req.query;
    let query = supabase.from('emergencias').select('*');
    if (estado) query = query.eq('estado', estado);
    query = query.order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/atender', authMiddleware, requireRole('carabinero', 'pdi', 'municipal', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('emergencias').update({ estado: 'Atendida', atendida_por: req.user.nombre }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Emergencia no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/descartar', authMiddleware, requireRole('carabinero', 'pdi', 'municipal', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('emergencias').update({ estado: 'Descartada', atendida_por: req.user.nombre }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Emergencia no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
