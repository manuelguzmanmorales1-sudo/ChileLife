const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

function toClient(row) {
  return { _id: row.id, tipo: row.tipo, titulo: row.titulo, mensaje: row.mensaje, leida: row.leida, fecha: row.created_at };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('notificaciones').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/no-leidas', authMiddleware, async (req, res) => {
  try {
    const { count, error } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('leida', false);
    if (error) throw error;
    res.json({ cantidad: count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/leer', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/leer-todas', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('user_id', req.user.id).eq('leida', false);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
