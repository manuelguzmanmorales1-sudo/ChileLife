const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const COMISION_LAVADO = 0.25; // 25% de comisión al lavar dinero negro → dinero legal

function toClientGrupo(row) {
  return { _id: row.id, nombre: row.nombre, color: row.color, miembros: row.miembros, icono: row.icono };
}

// ===== GRUPOS (Discord) =====
router.get('/grupos', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('grupos_discord').select('*').order('miembros', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClientGrupo));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/grupos', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, color } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const { data: exists } = await supabase.from('grupos_discord').select('id').eq('nombre', nombre).single();
    if (exists) return res.status(400).json({ error: 'El grupo ya existe' });
    const { data: grupo, error } = await supabase.from('grupos_discord').insert({ nombre, color: color || '#3498db', miembros: 0 }).select().single();
    if (error) throw error;
    res.status(201).json(toClientGrupo(grupo));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/grupos/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('grupos_discord').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function normalizarRut(rut) {
  return (rut || '').toString().replace(/[.\-\s]/g, '').toUpperCase();
}

router.post('/asignar-rol', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { rutDestino, rol } = req.body;
    if (!rutDestino || !rol) return res.status(400).json({ error: 'RUT y rol requeridos' });
    const { data: grupo, error: grupoErr } = await supabase.from('grupos_discord').select('*').eq('nombre', rol).single();
    if (grupoErr || !grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    // Búsqueda exacta primero (rápida); si no calza, compara ignorando puntos/guiones/espacios
    let user = null;
    const { data: exacto } = await supabase.from('users').select('*').eq('rut', rutDestino).maybeSingle();
    if (exacto) {
      user = exacto;
    } else {
      const buscado = normalizarRut(rutDestino);
      const { data: candidatos } = await supabase.from('users').select('*').not('rut', 'is', null);
      user = (candidatos || []).find(u => normalizarRut(u.rut) === buscado) || null;
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await supabase.from('users').update({ discord_rol: rol }).eq('id', user.id);
    const { data: grupoActualizado, error } = await supabase.from('grupos_discord').update({ miembros: grupo.miembros + 1 }).eq('id', grupo.id).select().single();
    if (error) throw error;

    res.json({ success: true, message: `Rol "${rol}" asignado a ${user.nombre}`, grupo: toClientGrupo(grupoActualizado) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== DINERO NEGRO =====
router.get('/dinero-negro', authMiddleware, async (req, res) => {
  try {
    res.json({ dineroNegro: req.user.dinero_negro, dinero: req.user.dinero });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Convierte dinero negro en dinero legal, cobrando comisión
router.post('/lavar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.monto, 10);
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });

    const { data: user, error: uError } = await supabase
      .from('users').select('dinero, dinero_negro, historial_financiero').eq('id', req.user.id).single();
    if (uError || !user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (monto > user.dinero_negro) return res.status(400).json({ error: 'Dinero negro insuficiente' });

    const comision = Math.floor(monto * COMISION_LAVADO);
    const neto = monto - comision;
    const nuevoDineroNegro = user.dinero_negro - monto;
    const nuevoDinero = user.dinero + neto;

    const historial = user.historial_financiero || [];
    historial.push({
      tipo: 'lavado', monto: neto, concepto: `Lavado de $${monto.toLocaleString()} (comisión 25%: $${comision.toLocaleString()})`,
      saldoResultante: nuevoDinero, fecha: new Date()
    });

    const { error: updError } = await supabase.from('users').update({
      dinero: nuevoDinero, dinero_negro: nuevoDineroNegro, historial_financiero: historial
    }).eq('id', req.user.id);
    if (updError) throw updError;

    res.json({ success: true, dinero: nuevoDinero, dineroNegro: nuevoDineroNegro, comision, neto });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Transfiere dinero negro a otro ciudadano por RUT (sin comisión, es plata "entre privados")
router.post('/transferir-negro', authMiddleware, async (req, res) => {
  try {
    const { rutDestino, monto } = req.body;
    const montoNum = parseInt(monto, 10);
    if (!rutDestino || !montoNum || montoNum <= 0) return res.status(400).json({ error: 'RUT destino y monto son obligatorios' });

    const { data: origen, error: oError } = await supabase.from('users').select('dinero_negro').eq('id', req.user.id).single();
    if (oError || !origen) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (montoNum > origen.dinero_negro) return res.status(400).json({ error: 'Dinero negro insuficiente' });

    const { data: destino, error: dError } = await supabase.from('users').select('id, dinero_negro').eq('rut', rutDestino).single();
    if (dError || !destino) return res.status(404).json({ error: 'Destinatario no encontrado' });
    if (destino.id === req.user.id) return res.status(400).json({ error: 'No puedes transferirte a ti mismo' });

    await supabase.from('users').update({ dinero_negro: origen.dinero_negro - montoNum }).eq('id', req.user.id);
    await supabase.from('users').update({ dinero_negro: destino.dinero_negro + montoNum }).eq('id', destino.id);

    res.json({ success: true, dineroNegro: origen.dinero_negro - montoNum });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== MERCADO NEGRO =====
router.post('/comprar-black', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const { data: item, error: itemErr } = await supabase.from('black_market_items').select('*').eq('id', itemId).single();
    if (itemErr || !item) return res.status(404).json({ error: 'Item no encontrado' });
    if (item.stock <= 0) return res.status(400).json({ error: 'Item agotado' });
    if (req.user.dinero_negro < item.precio) return res.status(400).json({ error: 'Dinero negro insuficiente' });

    const nuevoDineroNegro = req.user.dinero_negro - item.precio;
    const inventario = req.user.inventario || [];
    const existe = inventario.find(inv => inv.itemId === itemId);
    if (existe) {
      existe.cantidad += 1;
    } else {
      inventario.push({
        itemId: item.id.toString(),
        nombre: item.item,
        precio: item.precio,
        categoria: item.categoria || 'mercadoNegro',
        icon: 'fa-skull',
        fechaCompra: new Date(),
        cantidad: 1
      });
    }

    await supabase.from('users').update({ dinero_negro: nuevoDineroNegro, inventario }).eq('id', req.user.id);
    await supabase.from('black_market_items').update({ stock: item.stock - 1 }).eq('id', itemId);

    res.json({ success: true, item: item.item, precio: item.precio, dineroNegroRestante: nuevoDineroNegro, inventario });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== NIVELES / EXP =====
const nivelesDB = [
  { nivel: 1, exp: 0, rango: 'Principiante' },
  { nivel: 2, exp: 200, rango: 'Aprendiz' },
  { nivel: 3, exp: 500, rango: 'Ciudadano' },
  { nivel: 4, exp: 900, rango: 'Vecino' },
  { nivel: 5, exp: 1400, rango: 'Residente' },
  { nivel: 6, exp: 2000, rango: 'Colaborador' },
  { nivel: 7, exp: 2800, rango: 'Destacado' },
  { nivel: 8, exp: 3800, rango: 'Honorable' },
  { nivel: 9, exp: 5000, rango: 'Veterano' },
  { nivel: 10, exp: 6500, rango: 'Leyenda' },
];

router.get('/niveles', authMiddleware, async (req, res) => {
  res.json(nivelesDB);
});

router.post('/ganar-exp', authMiddleware, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
    const nuevaExp = req.user.exp + cantidad;
    const nuevoNivel = nivelesDB.filter(n => n.exp <= nuevaExp).pop();

    const updates = { exp: nuevaExp };
    if (nuevoNivel && nuevoNivel.nivel > req.user.nivel) {
      updates.nivel = nuevoNivel.nivel;
      updates.rango = nuevoNivel.rango;
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;

    res.json({ success: true, exp: data.exp, nivel: data.nivel, rango: data.rango });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;