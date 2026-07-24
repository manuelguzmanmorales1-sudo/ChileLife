const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { crearNotificacion } = require('../utils/notificar');

function toClient(row) {
  return { _id: row.id, deUserId: row.de_user_id, paraUserId: row.para_user_id, texto: row.texto, leido: row.leido, fecha: row.created_at };
}

// Lista de conversaciones (una fila por persona con la que hablaste, con el último mensaje)
router.get('/conversaciones', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .or(`de_user_id.eq.${req.user.id},para_user_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const porContacto = new Map();
    for (const m of data) {
      const contactoId = m.de_user_id === req.user.id ? m.para_user_id : m.de_user_id;
      if (!porContacto.has(contactoId)) {
        porContacto.set(contactoId, { contactoId, ultimoTexto: m.texto, fecha: m.created_at, noLeidos: 0 });
      }
      if (m.para_user_id === req.user.id && !m.leido) {
        porContacto.get(contactoId).noLeidos++;
      }
    }
    const contactoIds = [...porContacto.keys()];
    const { data: contactos } = await supabase.from('users').select('id, nombre, rut').in('id', contactoIds.length ? contactoIds : ['00000000-0000-0000-0000-000000000000']);
    const nombres = Object.fromEntries((contactos || []).map(c => [c.id, c]));

    res.json([...porContacto.values()].map(c => ({
      contactoId: c.contactoId,
      nombre: nombres[c.contactoId] ? nombres[c.contactoId].nombre : 'Usuario',
      rut: nombres[c.contactoId] ? nombres[c.contactoId].rut : '',
      ultimoTexto: c.ultimoTexto, fecha: c.fecha, noLeidos: c.noLeidos
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/no-leidos', authMiddleware, async (req, res) => {
  try {
    const { count, error } = await supabase.from('mensajes').select('id', { count: 'exact', head: true }).eq('para_user_id', req.user.id).eq('leido', false);
    if (error) throw error;
    res.json({ cantidad: count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Conversación completa con una persona (por su id de usuario)
router.get('/conversacion/:contactoId', authMiddleware, async (req, res) => {
  try {
    const contactoId = req.params.contactoId;
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .or(`and(de_user_id.eq.${req.user.id},para_user_id.eq.${contactoId}),and(de_user_id.eq.${contactoId},para_user_id.eq.${req.user.id})`)
      .order('created_at', { ascending: true });
    if (error) throw error;

    await supabase.from('mensajes').update({ leido: true }).eq('de_user_id', contactoId).eq('para_user_id', req.user.id).eq('leido', false);

    res.json(data.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Enviar mensaje (por RUT del destinatario)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { rutDestino, texto } = req.body;
    if (!rutDestino || !texto || !texto.trim()) return res.status(400).json({ error: 'Destinatario y texto son obligatorios' });

    const { data: destino, error: dError } = await supabase.from('users').select('id, nombre').eq('rut', rutDestino).maybeSingle();
    if (dError || !destino) return res.status(404).json({ error: 'Destinatario no encontrado' });
    if (destino.id === req.user.id) return res.status(400).json({ error: 'No puedes enviarte un mensaje a vos mismo' });

    const { data, error } = await supabase.from('mensajes').insert({ de_user_id: req.user.id, para_user_id: destino.id, texto: texto.trim() }).select().single();
    if (error) throw error;

    await crearNotificacion(destino.id, 'mensaje', `Nuevo mensaje de ${req.user.nombre}`, texto.trim().slice(0, 80));

    res.status(201).json(toClient(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
