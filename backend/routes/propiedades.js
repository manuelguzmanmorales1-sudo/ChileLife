const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClient(row) {
  return {
    _id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    tipo: row.tipo,
    duenoRut: row.dueno_rut,
    habitaciones: row.habitaciones,
    precio: row.precio,
    enAlquiler: row.en_alquiler,
    precioAlquiler: row.precio_alquiler,
    llavesRuts: row.llaves_ruts || []
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('propiedades').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, direccion, tipo, duenoRut, habitaciones, precio, enAlquiler, precioAlquiler } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
    const { data, error } = await supabase.from('propiedades').insert({
      nombre, direccion, tipo, dueno_rut: duenoRut, habitaciones, precio,
      en_alquiler: enAlquiler, precio_alquiler: precioAlquiler
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, direccion, tipo, duenoRut, habitaciones, precio, enAlquiler, precioAlquiler, llavesRuts } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (direccion !== undefined) updates.direccion = direccion;
    if (tipo !== undefined) updates.tipo = tipo;
    if (duenoRut !== undefined) updates.dueno_rut = duenoRut;
    if (habitaciones !== undefined) updates.habitaciones = habitaciones;
    if (precio !== undefined) updates.precio = precio;
    if (enAlquiler !== undefined) updates.en_alquiler = enAlquiler;
    if (precioAlquiler !== undefined) updates.precio_alquiler = precioAlquiler;
    if (llavesRuts !== undefined) updates.llaves_ruts = llavesRuts;

    const { data, error } = await supabase.from('propiedades').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comprar una propiedad (le transfiere la propiedad al comprador, descuenta plata)
router.post('/:id/comprar', authMiddleware, async (req, res) => {
  try {
    const { data: prop, error: pError } = await supabase.from('propiedades').select('*').eq('id', req.params.id).single();
    if (pError || !prop) return res.status(404).json({ error: 'Propiedad no encontrada' });
    if (prop.dueno_rut) return res.status(400).json({ error: 'Esta propiedad ya tiene dueño' });
    if (req.user.dinero < prop.precio) return res.status(400).json({ error: 'Saldo insuficiente' });
    if (!req.user.rut) return res.status(400).json({ error: 'Necesitás tu DNI (RUT) antes de comprar' });

    const nuevoDinero = req.user.dinero - prop.precio;
    await supabase.from('users').update({ dinero: nuevoDinero }).eq('id', req.user.id);
    const { data: propActualizada, error: uError } = await supabase
      .from('propiedades').update({ dueno_rut: req.user.rut, llaves_ruts: [req.user.rut] })
      .eq('id', prop.id).select().single();
    if (uError) throw uError;

    await supabase.from('staff_logs').insert({
      tipo: 'propiedad', descripcion: `Compra de propiedad: ${prop.nombre}`,
      monto: -prop.precio, staff_nombre: req.user.nombre, objetivo_nombre: req.user.nombre
    });

    res.json({ success: true, dinero: nuevoDinero, propiedad: toClient(propActualizada) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dar/quitar acceso de llave a otro ciudadano (solo el dueño o admin)
router.post('/:id/llaves', authMiddleware, async (req, res) => {
  try {
    const { rut, accion } = req.body;
    const { data: prop, error } = await supabase.from('propiedades').select('*').eq('id', req.params.id).single();
    if (error || !prop) return res.status(404).json({ error: 'Propiedad no encontrada' });
    if (prop.dueno_rut !== req.user.rut && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el dueño puede gestionar las llaves' });
    }
    let llaves = prop.llaves_ruts || [];
    if (accion === 'agregar' && !llaves.includes(rut)) llaves.push(rut);
    if (accion === 'quitar') llaves = llaves.filter(r => r !== rut);

    const { data, error: uError } = await supabase.from('propiedades').update({ llaves_ruts: llaves }).eq('id', prop.id).select().single();
    if (uError) throw uError;
    res.json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('propiedades').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
