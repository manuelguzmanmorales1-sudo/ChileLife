const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return { _id: row.id, item: row.item, precio: row.precio, stock: row.stock, vendedor: row.vendedor, categoria: row.categoria };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('black_market_items').select('*').gt('stock', 0).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/all', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('black_market_items').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('black_market_items').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { item, precio, stock, vendedor, categoria } = req.body;
    if (!item || !precio) return res.status(400).json({ error: 'Item y precio requeridos' });
    const { data, error } = await supabase.from('black_market_items').insert({
      item, precio, stock: stock || 0, vendedor: vendedor || 'Desconocido', categoria
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { item, precio, stock, vendedor, categoria } = req.body;
    const updates = {};
    if (item !== undefined) updates.item = item;
    if (precio !== undefined) updates.precio = precio;
    if (stock !== undefined) updates.stock = stock;
    if (vendedor !== undefined) updates.vendedor = vendedor;
    if (categoria !== undefined) updates.categoria = categoria;
    const { data, error } = await supabase.from('black_market_items').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('black_market_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
