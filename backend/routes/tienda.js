const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('tienda_items').select('*').order('categoria', { ascending: true }).order('nombre', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, precio, desc, icon, categoria, stock } = req.body;
    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ error: 'Nombre, precio y categoria requeridos' });
    }
    if (precio <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    if (stock < 0) return res.status(400).json({ error: 'El stock no puede ser negativo' });

    const { data: item, error } = await supabase.from('tienda_items').insert({
      nombre,
      precio,
      desc: desc || '',
      icon: icon || 'fa-box',
      categoria: categoria.toLowerCase(),
      stock: stock || 0
    }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, precio, desc, icon, categoria, stock } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (precio !== undefined) {
      if (precio <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
      updates.precio = precio;
    }
    if (desc !== undefined) updates.desc = desc;
    if (icon !== undefined) updates.icon = icon;
    if (categoria !== undefined) updates.categoria = categoria.toLowerCase();
    if (stock !== undefined) {
      if (stock < 0) return res.status(400).json({ error: 'El stock no puede ser negativo' });
      updates.stock = stock;
    }

    const { data: item, error } = await supabase.from('tienda_items').update(updates).eq('id', req.params.id).select().single();
    if (error || !item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: item, error: fetchErr } = await supabase.from('tienda_items').select('*').eq('id', req.params.id).single();
    if (fetchErr || !item) return res.status(404).json({ error: 'Item no encontrado' });
    const { error } = await supabase.from('tienda_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: `Item "${item.nombre}" eliminado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
