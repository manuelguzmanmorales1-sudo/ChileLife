const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const rolesPoliciales = ['carabinero', 'pdi', 'admin'];

function toClient(row) {
  return {
    _id: row.id, rutDetenido: row.rut_detenido, nombreDetenido: row.nombre_detenido,
    motivo: row.motivo, oficialNombre: row.oficial_nombre, institucion: row.institucion, fecha: row.fecha
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!rolesPoliciales.includes(req.user.rol)) return res.json([]);
    const { rut } = req.query;
    let query = supabase.from('detenciones').select('*');
    if (rut) query = query.eq('rut_detenido', rut);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { rutDetenido, nombreDetenido, motivo, institucion } = req.body;
    if (!rutDetenido || !motivo) return res.status(400).json({ error: 'RUT y motivo son obligatorios' });
    const { data, error } = await supabase.from('detenciones').insert({
      rut_detenido: rutDetenido, nombre_detenido: nombreDetenido || '', motivo,
      oficial_id: req.user.id, oficial_nombre: req.user.nombre,
      institucion: institucion || (req.user.rol === 'pdi' ? 'PDI' : 'Carabineros'),
      fecha: new Date().toISOString().split('T')[0]
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
