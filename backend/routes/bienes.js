const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, tipo: row.tipo, descripcion: row.descripcion,
    duenio: row.duenio, rutDuenio: row.rut_duenio, institucion: row.institucion
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rutDuenio, institucion } = req.query;
    let query = supabase.from('bienes').select('*');
    if (rutDuenio) query = query.eq('rut_duenio', rutDuenio);
    if (institucion) query = query.eq('institucion', institucion);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { tipo, descripcion, duenio, rutDuenio, institucion } = req.body;
    if (!descripcion || !rutDuenio) return res.status(400).json({ error: 'Descripción y RUT del propietario requeridos' });
    const { data, error } = await supabase.from('bienes').insert({
      tipo: tipo || 'Otro', descripcion, duenio: duenio || '', rut_duenio: rutDuenio,
      institucion: institucion || (req.user.rol === 'pdi' ? 'PDI' : 'Carabineros'),
      user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('bienes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;