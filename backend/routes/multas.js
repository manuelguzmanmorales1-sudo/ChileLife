const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { crearNotificacion } = require('../utils/notificar');

function toClient(row) {
  return { _id: row.id, rut: row.rut, nombre: row.nombre, motivo: row.motivo, monto: row.monto, pagada: row.pagada, fecha: row.fecha, institucion: row.institucion };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rut, institucion } = req.query;
    let query = supabase.from('multas').select('*');
    if (rut) query = query.eq('rut', rut);
    if (institucion) query = query.eq('institucion', institucion);
    if (req.user.rol === 'ciudadano') query = query.eq('rut', req.user.rut);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ciudadano/:rut', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('multas').select('*').eq('rut', req.params.rut).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, requireRole('carabinero', 'municipal', 'admin'), async (req, res) => {
  try {
    const { rut, nombre, motivo, monto, institucion } = req.body;
    if (!rut || !motivo || !monto) return res.status(400).json({ error: 'RUT, motivo y monto requeridos' });
    const { data, error } = await supabase.from('multas').insert({
      rut, nombre: nombre || '', motivo, monto, pagada: false,
      fecha: new Date().toISOString().split('T')[0], institucion: institucion || 'Carabineros', user_id: req.user.id
    }).select().single();
    if (error) throw error;

    const { data: destinatario } = await supabase.from('users').select('id').eq('rut', rut).maybeSingle();
    if (destinatario) {
      await crearNotificacion(destinatario.id, 'multa', 'Multa recibida', `${motivo} — $${parseInt(monto).toLocaleString()}`);
    }

    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/pagar', authMiddleware, async (req, res) => {
  try {
    const { data: multa, error: mError } = await supabase.from('multas').select('*').eq('id', req.params.id).single();
    if (mError || !multa) return res.status(404).json({ error: 'Multa no encontrada' });
    if (multa.pagada) return res.status(400).json({ error: 'Esta multa ya está pagada' });
    if (req.user.rol === 'ciudadano' && multa.rut !== req.user.rut) {
      return res.status(403).json({ error: 'No puedes pagar la multa de otra persona' });
    }
    if (req.user.dinero < multa.monto) return res.status(400).json({ error: 'Saldo insuficiente' });

    const nuevoDinero = req.user.dinero - multa.monto;
    const historial = req.user.historial_financiero || [];
    historial.push({
      tipo: 'multa', monto: -multa.monto, concepto: `Pago multa: ${multa.motivo}`,
      saldoResultante: nuevoDinero, fecha: new Date()
    });

    const { error: userErr } = await supabase.from('users')
      .update({ dinero: nuevoDinero, historial_financiero: historial }).eq('id', req.user.id);
    if (userErr) throw userErr;

    const { data, error } = await supabase.from('multas').update({ pagada: true }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ...toClient(data), dinero: nuevoDinero });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, requireRole('carabinero', 'municipal', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('multas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;