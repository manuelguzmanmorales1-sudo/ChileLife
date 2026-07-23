const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return { _id: row.id, patente: row.patente, marca: row.marca, modelo: row.modelo, año: row.anio, color: row.color, duenio: row.duenio, rutDuenio: row.rut_duenio, estado: row.estado };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patente, duenio } = req.query;
    let query = supabase.from('vehiculos_policia').select('*');
    if (patente) query = query.ilike('patente', `%${patente}%`);
    if (duenio) query = query.eq('rut_duenio', duenio);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const { data, error } = await supabase.from('vehiculos_policia').select('*').or(`patente.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%`);
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('vehiculos_policia').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { patente, marca, modelo, año, color, duenio, rutDuenio } = req.body;
    if (!patente) return res.status(400).json({ error: 'Patente requerida' });
    const { data: existe } = await supabase.from('vehiculos_policia').select('id').eq('patente', patente).maybeSingle();
    if (existe) return res.status(400).json({ error: 'Patente ya registrada' });
    const { data, error } = await supabase.from('vehiculos_policia').insert({
      patente, marca: marca || '', modelo: modelo || '', anio: año || new Date().getFullYear(),
      color: color || '', duenio: duenio || '', rut_duenio: rutDuenio || '', estado: 'Sin encargo', user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { marca, modelo, año, color, duenio, rutDuenio, estado } = req.body;
    const updates = {};
    if (marca !== undefined) updates.marca = marca;
    if (modelo !== undefined) updates.modelo = modelo;
    if (año !== undefined) updates.anio = año;
    if (color !== undefined) updates.color = color;
    if (duenio !== undefined) updates.duenio = duenio;
    if (rutDuenio !== undefined) updates.rut_duenio = rutDuenio;
    if (estado !== undefined) updates.estado = estado;
    const { data, error } = await supabase.from('vehiculos_policia').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('vehiculos_policia').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;