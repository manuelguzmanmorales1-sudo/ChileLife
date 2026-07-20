const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

function toClientDocumento(row) {
  return {
    _id: row.id, tipo: row.tipo, numero: row.numero,
    fechaEmision: row.fecha_emision, fechaVencimiento: row.fecha_vencimiento,
    estado: row.estado, notas: row.notas
  };
}

async function armarFicha(rut) {
  const { data: user, error } = await supabase.from('users').select('nombre, rut, vehiculos, inventario').eq('rut', rut).single();
  if (error) throw error;
  if (!user) return null;

  const { data: documentosRaw, error: e2 } = await supabase.from('documentos').select('*').eq('rut_duenio', rut).order('created_at', { ascending: false });
  if (e2) throw e2;

  const vehiculos = user.vehiculos || [];
  const mochila = user.inventario || [];
  const documentos = (documentosRaw || []).map(toClientDocumento);

  return {
    nombre: user.nombre, rut: user.rut,
    vehiculos, documentos, mochila,
    valorGarage: vehiculos.reduce((acc, v) => acc + (v.precio || 0), 0)
  };
}

// ===== Mis propias pertenencias (cualquier ciudadano logueado) =====
router.get('/mias', authMiddleware, async (req, res) => {
  try {
    const ficha = await armarFicha(req.user.rut);
    res.json(ficha);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Ficha de pertenencias de otra persona (solo AUPOL/GEPOL/admin) =====
router.get('/:rut', authMiddleware, requireRole('carabinero', 'pdi', 'admin'), async (req, res) => {
  try {
    const ficha = await armarFicha(req.params.rut);
    if (!ficha) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(ficha);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== DOCUMENTOS: crear / eliminar (uso policial/municipal, ej. emitir licencia) =====
router.post('/documentos', authMiddleware, requireRole('carabinero', 'pdi', 'municipal', 'admin'), async (req, res) => {
  try {
    const { rutDuenio, tipo, numero, fechaEmision, fechaVencimiento, notas } = req.body;
    if (!rutDuenio || !tipo) return res.status(400).json({ error: 'RUT y tipo de documento requeridos' });
    const { data, error } = await supabase.from('documentos').insert({
      rut_duenio: rutDuenio, tipo, numero: numero || '',
      fecha_emision: fechaEmision || '', fecha_vencimiento: fechaVencimiento || '',
      notas: notas || '', user_id: req.user.id
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClientDocumento(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/documentos/:id', authMiddleware, requireRole('carabinero', 'pdi', 'municipal', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('documentos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
