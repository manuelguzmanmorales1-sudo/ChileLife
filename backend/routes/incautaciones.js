const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id, tipo: row.tipo, descripcion: row.descripcion, serie: row.serie,
    procedencia: row.procedencia, fecha: row.fecha, estado: row.estado, institucion: row.institucion
  };
}

// Saca un ítem del inventario del ciudadano y lo deja registrado como incautado.
// Si tiene más de 1 unidad, solo descuenta 1; si no, borra la entrada completa.
router.post('/desde-inventario', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { rut, itemId, procedencia } = req.body;
    if (!rut || !itemId) return res.status(400).json({ error: 'RUT del ciudadano e ítem requeridos' });

    const { data: ciudadano, error: cError } = await supabase.from('users').select('id, inventario').eq('rut', rut).single();
    if (cError || !ciudadano) return res.status(404).json({ error: 'Ciudadano no encontrado' });

    const inventario = ciudadano.inventario || [];
    const idx = inventario.findIndex(i => i.itemId === itemId);
    if (idx === -1) return res.status(404).json({ error: 'El ciudadano ya no tiene ese ítem' });

    const item = inventario[idx];
    if ((item.cantidad || 1) > 1) {
      inventario[idx] = { ...item, cantidad: item.cantidad - 1 };
    } else {
      inventario.splice(idx, 1);
    }

    const { error: updErr } = await supabase.from('users').update({ inventario }).eq('id', ciudadano.id);
    if (updErr) throw updErr;

    const institucion = req.user.rol === 'pdi' ? 'PDI' : req.user.rol === 'municipal' ? 'Municipalidad Providencia' : 'Carabineros';
    const { data: incautacion, error: incErr } = await supabase.from('incautaciones').insert({
      tipo: item.categoria || 'Objeto', descripcion: item.nombre, serie: '', procedencia: procedencia || `Inventario de ${rut}`,
      fecha: new Date().toISOString().split('T')[0], estado: 'En custodia', institucion, user_id: req.user.id
    }).select().single();
    if (incErr) throw incErr;

    res.status(201).json({ incautacion: toClient(incautacion), inventarioRestante: inventario });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rolesPoliciales = ['carabinero', 'pdi', 'admin'];
    if (!rolesPoliciales.includes(req.user.rol)) return res.json([]);
    const { institucion, estado } = req.query;
    let query = supabase.from('incautaciones').select('*');
    if (institucion) query = query.eq('institucion', institucion);
    if (estado) query = query.eq('estado', estado);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { tipo, descripcion, serie, procedencia, institucion } = req.body;
    if (!descripcion) return res.status(400).json({ error: 'Descripción requerida' });
    const { data, error } = await supabase.from('incautaciones').insert({
      tipo: tipo || 'Objeto', descripcion, serie: serie || '', procedencia: procedencia || '',
      fecha: new Date().toISOString().split('T')[0], estado: 'En custodia',
      institucion: institucion || (req.user.rol === 'pdi' ? 'PDI' : 'Carabineros'),
      user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/estado', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['En custodia', 'Devuelto', 'Destruido'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    const { data, error } = await supabase.from('incautaciones').update({ estado }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'No encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('incautaciones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;