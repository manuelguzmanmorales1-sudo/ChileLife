const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, tipo: row.tipo, descripcion: row.descripcion, direccion: row.direccion,
    anonimo: row.anonimo, ciudadano: row.ciudadano, run: row.run, institucion: row.institucion,
    estado: row.estado, impNombre: row.imp_nombre, impRut: row.imp_rut, impDesc: row.imp_desc,
    testigos: row.testigos, evidencias: row.evidencias, fecha: row.fecha, userId: row.user_id
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { institucion, estado } = req.query;
    let query = supabase.from('denuncias').select('*');
    if (institucion) query = query.eq('institucion', institucion);
    if (estado) query = query.eq('estado', estado);
    if (req.user.rol === 'ciudadano') query = query.or(`user_id.eq.${req.user.id},anonimo.eq.true`);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/mis', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('denuncias').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('denuncias').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Denuncia no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, descripcion, direccion, anonimo, institucion, impNombre, impRut, impDesc, testigos, evidencias, fecha } = req.body;
    if (!tipo || !descripcion) return res.status(400).json({ error: 'Tipo y descripción requeridos' });
    const { data, error } = await supabase.from('denuncias').insert({
      tipo, descripcion, direccion: direccion || 'No especificada', anonimo: !!anonimo,
      ciudadano: anonimo ? 'Anónimo' : req.user.nombre, run: anonimo ? '' : req.user.rut,
      institucion: institucion || 'Carabineros', imp_nombre: impNombre, imp_rut: impRut, imp_desc: impDesc,
      testigos, evidencias, fecha: fecha || new Date().toISOString().split('T')[0], user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['Recibida', 'En Investigación', 'Cerrada'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    if (req.user.rol === 'ciudadano') return res.status(403).json({ error: 'No autorizado' });
    const { data, error } = await supabase.from('denuncias').update({ estado }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Denuncia no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('denuncias').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
