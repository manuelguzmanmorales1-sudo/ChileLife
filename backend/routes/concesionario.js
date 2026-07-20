const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClientVehiculo(row) {
  return {
    _id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    categoria: row.categoria,
    precio: row.precio,
    unidades: row.unidades,
    imagen: row.imagen,
    descripcion: row.descripcion,
    destacado: row.destacado
  };
}

// Genera una patente estilo chileno: 4 letras + 2 números (ej: BFGH-45)
function generarPatenteBase() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  let patente = '';
  for (let i = 0; i < 4; i++) patente += letras[Math.floor(Math.random() * letras.length)];
  patente += '-';
  for (let i = 0; i < 2; i++) patente += numeros[Math.floor(Math.random() * numeros.length)];
  return patente;
}

async function generarPatenteUnica() {
  let patente;
  let existe = true;
  while (existe) {
    patente = generarPatenteBase();
    const { data } = await supabase
      .from('users')
      .select('id')
      .contains('vehiculos', [{ patente }])
      .limit(1);
    existe = data && data.length > 0;
  }
  return patente;
}

// Público: listar catálogo
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehiculos_concesionario')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClientVehiculo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: agregar vehículo
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { marca, modelo, anio, categoria, precio, unidades, imagen, descripcion, destacado } = req.body;
    if (!marca || !modelo || !precio) {
      return res.status(400).json({ error: 'Marca, modelo y precio son obligatorios' });
    }
    const { data, error } = await supabase
      .from('vehiculos_concesionario')
      .insert({ marca, modelo, anio, categoria, precio, unidades, imagen, descripcion, destacado })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toClientVehiculo(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: editar vehículo
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { marca, modelo, anio, categoria, precio, unidades, imagen, descripcion, destacado } = req.body;
    const updates = {};
    if (marca !== undefined) updates.marca = marca;
    if (modelo !== undefined) updates.modelo = modelo;
    if (anio !== undefined) updates.anio = anio;
    if (categoria !== undefined) updates.categoria = categoria;
    if (precio !== undefined) updates.precio = precio;
    if (unidades !== undefined) updates.unidades = unidades;
    if (imagen !== undefined) updates.imagen = imagen;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (destacado !== undefined) updates.destacado = destacado;

    const { data, error } = await supabase
      .from('vehiculos_concesionario')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(toClientVehiculo(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: eliminar vehículo
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('vehiculos_concesionario').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comprar un vehículo: descuenta stock, descuenta plata, genera patente y lo guarda en el usuario
router.post('/:id/comprar', authMiddleware, async (req, res) => {
  try {
    const { data: vehiculo, error: vError } = await supabase
      .from('vehiculos_concesionario')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (vError || !vehiculo) return res.status(404).json({ error: 'Vehículo no encontrado' });
    if (vehiculo.unidades <= 0) return res.status(400).json({ error: 'No quedan unidades disponibles' });
    if (req.user.dinero < vehiculo.precio) return res.status(400).json({ error: 'Saldo insuficiente' });

    const patente = await generarPatenteUnica();
    const nuevoDinero = req.user.dinero - vehiculo.precio;

    const vehiculosUsuario = req.user.vehiculos || [];
    vehiculosUsuario.push({
      vehiculoId: vehiculo.id,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      imagen: vehiculo.imagen,
      precio: vehiculo.precio,
      patente,
      fechaCompra: new Date()
    });

    const historial = req.user.historial_financiero || [];
    historial.push({
      tipo: 'compra',
      monto: -vehiculo.precio,
      concepto: `Compra vehículo: ${vehiculo.marca} ${vehiculo.modelo}`,
      saldoResultante: nuevoDinero,
      fecha: new Date()
    });

    const { error: userError } = await supabase
      .from('users')
      .update({ dinero: nuevoDinero, vehiculos: vehiculosUsuario, historial_financiero: historial })
      .eq('id', req.user.id);
    if (userError) throw userError;

    // Además de quedar en el inventario del usuario, se registra en la base
    // policial (vehiculos_policia) para que AUPOL/GEPOL/SNSM lo puedan encontrar.
    await supabase.from('vehiculos_policia').insert({
      patente, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio,
      color: '', duenio: req.user.nombre, rut_duenio: req.user.rut || '',
      estado: 'Sin encargo', user_id: req.user.id
    });

    const { data: vehiculoActualizado, error: updateVError } = await supabase
      .from('vehiculos_concesionario')
      .update({ unidades: vehiculo.unidades - 1 })
      .eq('id', vehiculo.id)
      .select()
      .single();
    if (updateVError) throw updateVError;

    res.json({
      success: true,
      dinero: nuevoDinero,
      vehiculos: vehiculosUsuario,
      vehiculo: toClientVehiculo(vehiculoActualizado),
      patente
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;