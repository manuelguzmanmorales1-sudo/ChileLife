// Config estática que aún usa el frontend (no viene de la base de datos).
// Todo lo demás (usuarios, funcionarios, denuncias, etc.) ya se consulta
// directo a la API/Supabase — por eso se borraron de acá.
var DB = {
  niveles: [
    { nivel: 1, exp: 0, rango: "Principiante" },
    { nivel: 2, exp: 200, rango: "Aprendiz" },
    { nivel: 3, exp: 500, rango: "Ciudadano" },
    { nivel: 4, exp: 900, rango: "Vecino" },
    { nivel: 5, exp: 1400, rango: "Residente" },
    { nivel: 6, exp: 2000, rango: "Colaborador" },
    { nivel: 7, exp: 2800, rango: "Destacado" },
    { nivel: 8, exp: 3800, rango: "Honorable" },
    { nivel: 9, exp: 5000, rango: "Veterano" },
    { nivel: 10, exp: 6500, rango: "Leyenda" }
  ],
  // TODO: el módulo OD (js/modules/od/sistema.js) todavía lee esto en vez de
  // llamar a la API real. Mientras no se conecte, quedan vacíos para que no
  // rompa nada — grupos y mercado negro van a verse vacíos ahí hasta conectarlo.
  gruposDiscord: [],
  usuarios: [],
  blackMarket: [],
  // Usados solo en el dashboard como fallback si la API tarda; quedan vacíos.
  denuncias: [],
  personasBuscadas: [],
  investigaciones: [],
  incautaciones: [],
  funcionarios: [],
  multas: [],
  vehiculos: [],
  sumarios: [],
  antecedentes: []
};
