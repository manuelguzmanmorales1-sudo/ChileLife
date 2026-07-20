const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Transferir dinero legal a otro ciudadano por RUT
router.post('/transferir', authMiddleware, async (req, res) => {
  try {
    const { rutDestino, monto, concepto } = req.body;
    const montoNum = parseInt(monto, 10);
    if (!rutDestino || !montoNum || montoNum <= 0) return res.status(400).json({ error: 'RUT destino y monto son obligatorios' });
    if (montoNum > req.user.dinero) return res.status(400).json({ error: 'Saldo insuficiente' });

    const { data: destino, error: dError } = await supabase.from('users').select('id, nombre, dinero, historial_financiero').eq('rut', rutDestino).single();
    if (dError || !destino) return res.status(404).json({ error: 'Destinatario no encontrado' });
    if (destino.id === req.user.id) return res.status(400).json({ error: 'No puedes transferirte a ti mismo' });

    const nuevoDineroOrigen = req.user.dinero - montoNum;
    const nuevoDineroDestino = destino.dinero + montoNum;

    const historialOrigen = req.user.historial_financiero || [];
    historialOrigen.push({
      tipo: 'transferencia_enviada', monto: -montoNum,
      concepto: concepto || `Transferencia a ${destino.nombre}`,
      saldoResultante: nuevoDineroOrigen, fecha: new Date()
    });

    const historialDestino = destino.historial_financiero || [];
    historialDestino.push({
      tipo: 'transferencia_recibida', monto: montoNum,
      concepto: concepto || `Transferencia de ${req.user.nombre}`,
      saldoResultante: nuevoDineroDestino, fecha: new Date()
    });

    await supabase.from('users').update({ dinero: nuevoDineroOrigen, historial_financiero: historialOrigen }).eq('id', req.user.id);
    await supabase.from('users').update({ dinero: nuevoDineroDestino, historial_financiero: historialDestino }).eq('id', destino.id);

    res.json({ success: true, dinero: nuevoDineroOrigen });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;