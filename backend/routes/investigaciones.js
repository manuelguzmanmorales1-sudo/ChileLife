const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const rolesPoliciales = ['carabinero', 'pdi', 'admin'];

function toClient(row) {
  return {
    _id: row.id, titulo: row.titulo, tipo: row.tipo, encargado: row.encargado,
    rut: row.rut, fecha: row.fecha, estado: row.estado, evidencias: row.evidencias || [],
    descripcion: row.descripcion, userId: row.user_id
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!rolesPoliciales.includes(req.user.rol)) return res.json([]);
    const { estado, rut } = req.query;
    let query = supabase.from('investigaciones').select('*');
    if (estado) query = query.eq('estado', estado);
    if (rut) query = query.eq('rut', rut);
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

// Abrir una investigación nueva (Carabineros, PDI o admin)
router.post('/', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { titulo, tipo, rut, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });
    if (!rut) return res.status(400).json({ error: 'El RUT de la persona investigada es obligatorio' });

    const { data, error } = await supabase.from('investigaciones').insert({
      titulo, tipo: tipo || 'Otro', rut, encargado: req.user.nombre,
      fecha: new Date().toISOString().split('T')[0], estado: 'Activa',
      evidencias: [],
      descripcion: descripcion || '',
      user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Editar los datos generales de la investigación (cualquier policial puede colaborar)
router.put('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { titulo, tipo, rut, descripcion } = req.body;
    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo;
    if (tipo !== undefined) updates.tipo = tipo;
    if (rut !== undefined) updates.rut = rut;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    const { data, error } = await supabase.from('investigaciones').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Investigación no encontrada' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Agregar una nueva prueba/evidencia al archivo (cualquier policial puede colaborar)
router.post('/:id/evidencia', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Describe la prueba antes de agregarla' });

    const { data: inv, error: fetchErr } = await supabase.from('investigaciones').select('*').eq('id', req.params.id).single();
    if (fetchErr || !inv) return res.status(404).json({ error: 'Investigación no encontrada' });
    if (inv.estado !== 'Activa') return res.status(400).json({ error: 'La investigación está cerrada, no se pueden agregar más pruebas' });

    const evidencias = inv.evidencias || [];
    evidencias.push({ texto: texto.trim(), autor: req.user.nombre, fecha: new Date().toISOString() });

    const { data, error } = await supabase.from('investigaciones').update({ evidencias }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cerrar/reabrir la investigación: SOLO quien la abrió (o un admin)
router.put('/:id/toggle', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { data: inv, error: fetchErr } = await supabase.from('investigaciones').select('*').eq('id', req.params.id).single();
    if (fetchErr || !inv) return res.status(404).json({ error: 'Investigación no encontrada' });

    if (req.user.rol !== 'admin' && inv.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien abrió esta investigación puede cerrarla o reabrirla' });
    }

    const nuevoEstado = inv.estado === 'Activa' ? 'Cerrada' : 'Activa';
    const { data, error } = await supabase.from('investigaciones').update({ estado: nuevoEstado }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Eliminar: solo quien la abrió o un admin
router.delete('/:id', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const { data: inv, error: fetchErr } = await supabase.from('investigaciones').select('user_id').eq('id', req.params.id).single();
    if (fetchErr || !inv) return res.status(404).json({ error: 'Investigación no encontrada' });
    if (req.user.rol !== 'admin' && inv.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien abrió esta investigación puede eliminarla' });
    }
    const { error } = await supabase.from('investigaciones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
