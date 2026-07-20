const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireInstitucion } = require('../middleware/auth');

const requireHospital = requireInstitucion(['Hospital Central']);

function toClient(row) {
  return {
    _id: row.id, nombre: row.nombre, rut: row.rut, motivo: row.motivo,
    gravedad: row.gravedad, estado: row.estado, notas: row.notas, medicacion: row.medicacion,
    grupoSanguineo: row.grupo_sanguineo, alergias: row.alergias, peso: row.peso, altura: row.altura,
    medicoAsignado: row.medico_asignado, visitas: row.visitas, historialVisitas: row.historial_visitas || []
  };
}

router.get('/pacientes', authMiddleware, requireHospital, async (req, res) => {
  try {
    const { search, gravedad, estado } = req.query;
    let query = supabase.from('pacientes').select('*');
    if (gravedad) query = query.eq('gravedad', gravedad);
    if (estado) query = query.eq('estado', estado);
    if (search) query = query.or(`nombre.ilike.%${search}%,rut.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pacientes/:id', authMiddleware, requireHospital, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pacientes').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pacientes', authMiddleware, requireHospital, async (req, res) => {
  try {
    const { nombre, rut, motivo, gravedad, notas, medicacion, grupoSanguineo, alergias, peso, altura, medicoAsignado } = req.body;
    if (!nombre || !motivo) return res.status(400).json({ error: 'Nombre y motivo requeridos' });

    const { data, error } = await supabase.from('pacientes').insert({
      nombre, rut, motivo, gravedad, notas, medicacion,
      grupo_sanguineo: grupoSanguineo, alergias, peso, altura, medico_asignado: medicoAsignado,
      estado: 'En observación',
      historial_visitas: [{
        fecha: new Date().toISOString().split('T')[0],
        motivo,
        diagnostico: '',
        tratamiento: '',
        medico: medicoAsignado || ''
      }]
    }).select().single();
    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pacientes/:id', authMiddleware, requireHospital, async (req, res) => {
  try {
    const { nombre, rut, motivo, gravedad, estado, notas, medicacion, grupoSanguineo, alergias, peso, altura, medicoAsignado, nuevaVisita } = req.body;
    const { data: paciente, error: fetchErr } = await supabase.from('pacientes').select('*').eq('id', req.params.id).single();
    if (fetchErr || !paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (rut !== undefined) updates.rut = rut;
    if (motivo !== undefined) updates.motivo = motivo;
    if (gravedad !== undefined) updates.gravedad = gravedad;
    if (estado !== undefined) updates.estado = estado;
    if (notas !== undefined) updates.notas = notas;
    if (medicacion !== undefined) updates.medicacion = medicacion;
    if (grupoSanguineo !== undefined) updates.grupo_sanguineo = grupoSanguineo;
    if (alergias !== undefined) updates.alergias = alergias;
    if (peso !== undefined) updates.peso = peso;
    if (altura !== undefined) updates.altura = altura;
    if (medicoAsignado !== undefined) updates.medico_asignado = medicoAsignado;

    if (nuevaVisita) {
      updates.visitas = (paciente.visitas || 0) + 1;
      const historial = paciente.historial_visitas || [];
      historial.push({
        fecha: new Date().toISOString().split('T')[0],
        motivo: nuevaVisita.motivo || paciente.motivo,
        diagnostico: nuevaVisita.diagnostico || '',
        tratamiento: nuevaVisita.tratamiento || '',
        medico: nuevaVisita.medico || paciente.medico_asignado || ''
      });
      updates.historial_visitas = historial;
    }

    const { data, error } = await supabase.from('pacientes').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(toClient(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pacientes/:id', authMiddleware, requireHospital, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pacientes').update({ estado: 'Dado de alta' }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ success: true, message: 'Paciente dado de alta', paciente: toClient(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
