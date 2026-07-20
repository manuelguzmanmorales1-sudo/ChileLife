const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id,
    nombre: row.nombre,
    duenoRut: row.dueno_rut,
    direccion: row.direccion,
    caja: row.caja,
    empleadosRuts: row.empleados_ruts || []
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('empresas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, duenoRut, direccion, caja } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
    const { data, error } = await supabase.from('empresas').insert({
      nombre, dueno_rut: duenoRut, direccion, caja: caja || 0
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, duenoRut, direccion, caja, empleadosRuts } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (duenoRut !== undefined) updates.dueno_rut = duenoRut;
    if (direccion !== undefined) updates.direccion = direccion;
    if (caja !== undefined) updates.caja = caja;
    if (empleadosRuts !== undefined) updates.empleados_ruts = empleadosRuts;

    const { data, error } = await supabase.from('empresas').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('empresas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
