const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

function toClient(row) {
  return { _id: row.id, rut: row.rut, nombre: row.nombre, delito: row.delito, fecha: row.fecha, institucion: row.institucion, descripcion: row.descripcion };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rut, institucion } = req.query;
    let query = supabase.from('antecedentes').select('*');
    if (rut) query = query.eq('rut', rut);
    if (institucion) query = query.eq('institucion', institucion);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ciudadano/:rut', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('antecedentes').select('*').eq('rut', req.params.rut).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { rut, nombre, delito, institucion, descripcion } = req.body;
    if (!rut || !delito) return res.status(400).json({ error: 'RUT y delito requeridos' });
    const { data, error } = await supabase.from('antecedentes').insert({
      rut, nombre: nombre || '', delito, fecha: new Date().toISOString().split('T')[0],
      institucion: institucion || 'Carabineros', descripcion: descripcion || '', user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('antecedentes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
