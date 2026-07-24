const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const HOUSE_EDGE = 0.05; // ventaja general de la casa (5%)

// ===== Utilidades =====
async function cobrarApuesta(userId, dinero, apuesta) {
  if (apuesta <= 0) throw new Error('La apuesta debe ser mayor a 0');
  if (apuesta > dinero) throw new Error('Saldo insuficiente');
  return dinero - apuesta;
}

async function pagar(userId, dineroActual, pago, concepto, historialActual) {
  const nuevoDinero = dineroActual + pago;
  const historial = historialActual || [];
  historial.push({ tipo: 'casino', monto: pago, concepto, saldoResultante: nuevoDinero, fecha: new Date() });
  await supabase.from('users').update({ dinero: nuevoDinero, historial_financiero: historial }).eq('id', userId);
  return nuevoDinero;
}

async function getUsuario(userId) {
  const { data, error } = await supabase.from('users').select('dinero, historial_financiero').eq('id', userId).single();
  if (error || !data) throw new Error('Usuario no encontrado');
  return data;
}

// ================================================================
// RULETA EUROPEA (un solo número verde: el 0)
// ================================================================
router.post('/ruleta/jugar', authMiddleware, async (req, res) => {
  try {
    const { apuesta, tipo, valor } = req.body;
    const monto = parseInt(apuesta, 10);
    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const numero = Math.floor(Math.random() * 37); // 0 al 36
    const rojos = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const color = numero === 0 ? 'verde' : (rojos.includes(numero) ? 'rojo' : 'negro');

    let gano = false;
    let multiplicador = 0;

    if (tipo === 'numero') {
      gano = numero === parseInt(valor, 10);
      multiplicador = 35;
    } else if (tipo === 'color') {
      gano = color === valor;
      multiplicador = 1;
    } else if (tipo === 'paridad') {
      gano = numero !== 0 && (valor === 'par' ? numero % 2 === 0 : numero % 2 === 1);
      multiplicador = 1;
    } else if (tipo === 'mitad') {
      gano = numero !== 0 && (valor === 'menor' ? numero <= 18 : numero >= 19);
      multiplicador = 1;
    } else if (tipo === 'docena') {
      const d = parseInt(valor, 10); // 1, 2 o 3
      gano = numero !== 0 && Math.ceil(numero / 12) === d;
      multiplicador = 2;
    } else {
      throw new Error('Tipo de apuesta inválido');
    }

    const pago = gano ? monto + monto * multiplicador : 0;
    const nuevoDinero = await pagar(req.user.id, restante, pago, `Ruleta: ${gano ? 'ganó' : 'perdió'} ($${monto.toLocaleString()})`, user.historial_financiero);

    res.json({ numero, color, gano, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// TRAGAMONEDAS (3 rodillos)
// ================================================================
const SIMBOLOS = [
  { s: '🍒', peso: 40, pago3: 2, pago2: 0.5 },
  { s: '🍋', peso: 30, pago3: 3, pago2: 0 },
  { s: '🔔', peso: 18, pago3: 8, pago2: 0 },
  { s: '⭐', peso: 9,  pago3: 20, pago2: 0 },
  { s: '💎', peso: 3,  pago3: 60, pago2: 0 }
];
const PESO_TOTAL = SIMBOLOS.reduce((a, s) => a + s.peso, 0);

function girarRodillo() {
  let r = Math.random() * PESO_TOTAL;
  for (const s of SIMBOLOS) {
    if (r < s.peso) return s;
    r -= s.peso;
  }
  return SIMBOLOS[0];
}

router.post('/slots/jugar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const rodillos = [girarRodillo(), girarRodillo(), girarRodillo()];
    let pago = 0;
    if (rodillos[0].s === rodillos[1].s && rodillos[1].s === rodillos[2].s) {
      pago = monto * rodillos[0].pago3;
    } else if (rodillos[0].s === rodillos[1].s || rodillos[1].s === rodillos[2].s) {
      const doble = rodillos[0].s === rodillos[1].s ? rodillos[0] : rodillos[1];
      pago = monto * doble.pago2;
    }

    const nuevoDinero = await pagar(req.user.id, restante, pago, `Tragamonedas: ${rodillos.map(r => r.s).join(' ')}`, user.historial_financiero);
    res.json({ simbolos: rodillos.map(r => r.s), gano: pago > 0, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// CRASH (elegís a qué multiplicador te retirás antes de tirar)
// ================================================================
router.post('/crash/jugar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const objetivo = parseFloat(req.body.cashout);
    if (!objetivo || objetivo < 1.01) throw new Error('El multiplicador de retiro debe ser mayor a 1.01x');

    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    // Fórmula estándar de "crash" con ventaja de la casa incorporada
    const r = Math.random();
    const puntoCrash = Math.max(1, (1 - HOUSE_EDGE) / (1 - r));
    const gano = puntoCrash >= objetivo;
    const pago = gano ? Math.floor(monto * objetivo) : 0;

    const nuevoDinero = await pagar(req.user.id, restante, pago, `Crash: reventó en ${puntoCrash.toFixed(2)}x (retiro: ${objetivo}x)`, user.historial_financiero);
    res.json({ puntoCrash: parseFloat(puntoCrash.toFixed(2)), gano, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// CARA O CRUZ
// ================================================================
router.post('/moneda/jugar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const eleccion = req.body.eleccion; // 'cara' | 'cruz'
    if (!['cara', 'cruz'].includes(eleccion)) throw new Error('Elegí cara o cruz');

    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
    const gano = resultado === eleccion;
    const pago = gano ? Math.floor(monto * (2 * (1 - HOUSE_EDGE))) : 0;

    const nuevoDinero = await pagar(req.user.id, restante, pago, `Cara o Cruz: salió ${resultado}`, user.historial_financiero);
    res.json({ resultado, gano, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// DADOS (elegís "tirar por debajo de X" — cuanto más difícil, más paga)
// ================================================================
router.post('/dados/jugar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const objetivo = parseInt(req.body.objetivo, 10); // 2 al 95
    if (!objetivo || objetivo < 2 || objetivo > 95) throw new Error('El objetivo debe estar entre 2 y 95');

    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const tirada = Math.floor(Math.random() * 100); // 0 al 99
    const gano = tirada < objetivo;
    const multiplicador = (99 / objetivo) * (1 - HOUSE_EDGE);
    const pago = gano ? Math.floor(monto * multiplicador) : 0;

    const nuevoDinero = await pagar(req.user.id, restante, pago, `Dados: salió ${tirada} (objetivo: <${objetivo})`, user.historial_financiero);
    res.json({ tirada, gano, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// BLACKJACK
// ================================================================
const VALORES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const PALOS = ['♠','♥','♦','♣'];
function robarCarta() {
  return { valor: VALORES[Math.floor(Math.random() * VALORES.length)], palo: PALOS[Math.floor(Math.random() * PALOS.length)] };
}
function valorCarta(v) { if (v === 'A') return 11; if (['J','Q','K'].includes(v)) return 10; return parseInt(v, 10); }
function calcularMano(cartas) {
  let total = cartas.reduce((a, c) => a + valorCarta(c.valor), 0);
  let ases = cartas.filter(c => c.valor === 'A').length;
  while (total > 21 && ases > 0) { total -= 10; ases--; }
  return total;
}

router.post('/blackjack/iniciar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const jugador = [robarCarta(), robarCarta()];
    const dealer = [robarCarta(), robarCarta()];
    const valorJugador = calcularMano(jugador);
    const valorDealer = calcularMano(dealer);

    // Blackjack natural: se resuelve al toque
    if (valorJugador === 21 || valorDealer === 21) {
      let pago = 0, resultado;
      if (valorJugador === 21 && valorDealer === 21) { pago = monto; resultado = 'empate'; }
      else if (valorJugador === 21) { pago = Math.floor(monto * 2.5); resultado = 'blackjack'; }
      else { pago = 0; resultado = 'perdiste'; }
      const nuevoDinero = await pagar(req.user.id, restante, pago, `Blackjack: ${resultado}`, user.historial_financiero);
      return res.json({ terminado: true, resultado, jugador, dealer, pago, dinero: nuevoDinero });
    }

    const { data: sesion, error } = await supabase.from('casino_sesiones').insert({
      user_id: req.user.id, juego: 'blackjack', apuesta: monto,
      estado: { jugador, dealer }, activa: true
    }).select().single();
    if (error) throw error;

    res.json({
      terminado: false, sesionId: sesion.id, jugador, valorJugador,
      dealerVisible: dealer[0], dinero: restante
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/blackjack/:id/pedir', authMiddleware, async (req, res) => {
  try {
    const { data: sesion, error } = await supabase.from('casino_sesiones').select('*').eq('id', req.params.id).eq('user_id', req.user.id).eq('activa', true).single();
    if (error || !sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const jugador = [...sesion.estado.jugador, robarCarta()];
    const valorJugador = calcularMano(jugador);

    if (valorJugador > 21) {
      await supabase.from('casino_sesiones').update({ activa: false }).eq('id', sesion.id);
      const user = await getUsuario(req.user.id);
      const nuevoDinero = await pagar(req.user.id, user.dinero, 0, 'Blackjack: te pasaste', user.historial_financiero);
      return res.json({ terminado: true, resultado: 'perdiste', jugador, valorJugador, dinero: nuevoDinero });
    }

    await supabase.from('casino_sesiones').update({ estado: { ...sesion.estado, jugador } }).eq('id', sesion.id);
    res.json({ terminado: false, jugador, valorJugador });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/blackjack/:id/plantarse', authMiddleware, async (req, res) => {
  try {
    const { data: sesion, error } = await supabase.from('casino_sesiones').select('*').eq('id', req.params.id).eq('user_id', req.user.id).eq('activa', true).single();
    if (error || !sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const valorJugador = calcularMano(sesion.estado.jugador);
    let dealer = [...sesion.estado.dealer];
    while (calcularMano(dealer) < 17) dealer.push(robarCarta());
    const valorDealer = calcularMano(dealer);

    let resultado, pago;
    if (valorDealer > 21 || valorJugador > valorDealer) { resultado = 'ganaste'; pago = sesion.apuesta * 2; }
    else if (valorJugador === valorDealer) { resultado = 'empate'; pago = sesion.apuesta; }
    else { resultado = 'perdiste'; pago = 0; }

    await supabase.from('casino_sesiones').update({ activa: false }).eq('id', sesion.id);
    const user = await getUsuario(req.user.id);
    const nuevoDinero = await pagar(req.user.id, user.dinero, pago, `Blackjack: ${resultado}`, user.historial_financiero);

    res.json({ terminado: true, resultado, dealer, valorDealer, pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ================================================================
// MINAS
// ================================================================
const TOTAL_CASILLAS = 25;

router.post('/minas/iniciar', authMiddleware, async (req, res) => {
  try {
    const monto = parseInt(req.body.apuesta, 10);
    const minas = parseInt(req.body.minas, 10);
    if (!minas || minas < 1 || minas > 24) throw new Error('Elegí entre 1 y 24 minas');

    const user = await getUsuario(req.user.id);
    const restante = await cobrarApuesta(req.user.id, user.dinero, monto);

    const posiciones = new Set();
    while (posiciones.size < minas) posiciones.add(Math.floor(Math.random() * TOTAL_CASILLAS));

    const { data: sesion, error } = await supabase.from('casino_sesiones').insert({
      user_id: req.user.id, juego: 'minas', apuesta: monto,
      estado: { minas: [...posiciones], reveladas: [], multiplicador: 1 }, activa: true
    }).select().single();
    if (error) throw error;

    res.json({ sesionId: sesion.id, minas, multiplicador: 1, dinero: restante });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/minas/:id/revelar', authMiddleware, async (req, res) => {
  try {
    const casilla = parseInt(req.body.casilla, 10);
    const { data: sesion, error } = await supabase.from('casino_sesiones').select('*').eq('id', req.params.id).eq('user_id', req.user.id).eq('activa', true).single();
    if (error || !sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (sesion.estado.reveladas.includes(casilla)) return res.status(400).json({ error: 'Esa casilla ya está revelada' });

    if (sesion.estado.minas.includes(casilla)) {
      await supabase.from('casino_sesiones').update({ activa: false }).eq('id', sesion.id);
      return res.json({ perdiste: true, minas: sesion.estado.minas });
    }

    const reveladas = [...sesion.estado.reveladas, casilla];
    const totalMinas = sesion.estado.minas.length;
    const seguras = TOTAL_CASILLAS - totalMinas;
    // Multiplicador justo por cada casilla revelada, con ventaja de la casa aplicada
    const factorPaso = (TOTAL_CASILLAS - (reveladas.length - 1)) / (seguras - (reveladas.length - 1));
    const multiplicador = sesion.estado.multiplicador * factorPaso * (1 - HOUSE_EDGE / reveladas.length);

    await supabase.from('casino_sesiones').update({ estado: { ...sesion.estado, reveladas, multiplicador } }).eq('id', sesion.id);
    res.json({ perdiste: false, multiplicador: parseFloat(multiplicador.toFixed(3)), reveladas: reveladas.length, gananciaSiRetira: Math.floor(sesion.apuesta * multiplicador) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/minas/:id/retirar', authMiddleware, async (req, res) => {
  try {
    const { data: sesion, error } = await supabase.from('casino_sesiones').select('*').eq('id', req.params.id).eq('user_id', req.user.id).eq('activa', true).single();
    if (error || !sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!sesion.estado.reveladas.length) return res.status(400).json({ error: 'Revela al menos una casilla antes de retirarte' });

    const pago = Math.floor(sesion.apuesta * sesion.estado.multiplicador);
    await supabase.from('casino_sesiones').update({ activa: false }).eq('id', sesion.id);
    const user = await getUsuario(req.user.id);
    const nuevoDinero = await pagar(req.user.id, user.dinero, pago, `Minas: retiro con ${sesion.estado.multiplicador.toFixed(2)}x`, user.historial_financiero);

    res.json({ pago, dinero: nuevoDinero });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;