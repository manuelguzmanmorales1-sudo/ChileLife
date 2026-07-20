const { supabase, connectDB } = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  await connectDB();

  const tablas = [
    'users', 'funcionarios', 'denuncias', 'personas_buscadas', 'investigaciones',
    'incautaciones', 'multas', 'vehiculos_policia', 'bienes', 'antecedentes',
    'sumarios', 'tienda_items', 'black_market_items', 'grupos_discord'
  ];
  for (const tabla of tablas) {
    await supabase.from(tabla).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const userData = [
    { rut: '12.345.678-9', nombre: 'Carlos Muñoz', password: '123456', edad: 32, direccion: 'Av. Principal 123', telefono: '+56 9 1234 5678', email: 'carlos@email.com', nivel: 5, exp: 1200, dinero: 500000, dinero_negro: 25000, rol: 'ciudadano' },
    { rut: '23.456.789-0', nombre: 'María González', password: '123456', edad: 28, direccion: 'Calle Los Alerces 456', telefono: '+56 9 2345 6789', email: 'maria@email.com', nivel: 3, exp: 600, dinero: 250000, dinero_negro: 0, rol: 'ciudadano' },
    { rut: '34.567.890-1', nombre: 'Pedro López', password: '123456', edad: 45, direccion: 'Pasaje Esperanza 789', telefono: '+56 9 3456 7890', email: 'pedro@email.com', nivel: 8, exp: 3400, dinero: 1200000, dinero_negro: 150000, rol: 'ciudadano' },
    { rut: '45.678.901-2', nombre: 'Ana Soto', password: '123456', edad: 22, direccion: 'Av. Los Pinos 321', telefono: '+56 9 4567 8901', email: 'ana@email.com', nivel: 2, exp: 300, dinero: 80000, dinero_negro: 5000, rol: 'ciudadano' },
    { rut: '56.789.012-3', nombre: 'Jorge Rojas', password: '123456', edad: 38, direccion: 'Calle Los Olivos 654', telefono: '+56 9 5678 9012', email: 'jorge@email.com', nivel: 6, exp: 2100, dinero: 750000, dinero_negro: 0, rol: 'ciudadano' },
    { rut: 'admin', nombre: 'Administrador', password: 'admin123', edad: 30, direccion: 'Servidor Central', telefono: '+56 9 0000 0000', email: 'admin@webchilerp.cl', nivel: 10, exp: 9999, dinero: 9999999, dinero_negro: 0, rol: 'admin' },
  ];

  const users = [];
  for (const u of userData) {
    const hashed = await bcrypt.hash(u.password, 12);
    const { data, error } = await supabase.from('users').insert({ ...u, password: hashed }).select().single();
    if (error) throw error;
    users.push(data);
  }

  const { data: funcs, error: funcsErr } = await supabase.from('funcionarios').insert([
    { rut: '11.111.111-1', nombre: 'Oficial Juan Pérez', cargo: 'Cabo 1ro', unidad: 'Carabineros', exp: 4500, fecha_ingreso: '2023-01-15', nacimiento: '1990-05-20', telefono: '+56 9 1111 1111', direccion: 'Cuartel Central' },
    { rut: '22.222.222-2', nombre: 'Detective María Flores', cargo: 'Subinspector', unidad: 'PDI', exp: 3200, fecha_ingreso: '2022-06-01', nacimiento: '1988-11-10', telefono: '+56 9 2222 2222', direccion: 'Prefectura Santiago' },
    { rut: '33.333.333-3', nombre: 'Inspector Pablo Díaz', cargo: 'Inspector', unidad: 'PDI', exp: 5800, fecha_ingreso: '2020-03-20', nacimiento: '1985-07-15', telefono: '+56 9 3333 3333', direccion: 'Prefectura Oriente' },
    { rut: '44.444.444-4', nombre: 'Sargento Mario Torres', cargo: 'Sargento 2do', unidad: 'Carabineros', exp: 2800, fecha_ingreso: '2021-09-10', nacimiento: '1992-02-28', telefono: '+56 9 4444 4444', direccion: 'Comisaría La Florida' },
    { rut: '55.555.555-5', nombre: 'Suboficial Rosa Muñoz', cargo: 'Suboficial', unidad: 'Carabineros', exp: 6200, fecha_ingreso: '2019-05-05', nacimiento: '1987-12-03', telefono: '+56 9 5555 5555', direccion: 'Comisaría Ñuñoa' },
  ]).select();
  if (funcsErr) throw funcsErr;

  await supabase.from('sumarios').insert([
    { funcionario: 'Oficial Juan Pérez', rut: '11.111.111-1', motivo: 'Incumplimiento de deberes', fecha: '2024-04-10', estado: 'En proceso' },
    { funcionario: 'Detective María Flores', rut: '22.222.222-2', motivo: 'Retraso reiterado', fecha: '2024-01-10', estado: 'Pendiente' },
  ]);

  await supabase.from('denuncias').insert([
    { tipo: 'Robo en lugar habitado', descripcion: 'Sustracción de especies desde domicilio', direccion: 'Av. Siempre Viva 742', fecha: '2024-06-10', estado: 'En Investigación', ciudadano: 'Carlos Muñoz', run: '12.345.678-9', anonimo: false, institucion: 'Carabineros', user_id: users[0].id },
    { tipo: 'Amenazas', descripcion: 'Amenazas de muerte vía telefónica', direccion: 'Calle Larga 456', fecha: '2024-06-08', estado: 'Recibida', ciudadano: 'María González', run: '23.456.789-0', anonimo: false, institucion: 'PDI', user_id: users[1].id },
    { tipo: 'Violencia Intrafamiliar', descripcion: 'Agresión física en domicilio', direccion: 'Pasaje La Paz 789', fecha: '2024-06-05', estado: 'Cerrada', ciudadano: 'Anónimo', run: '', anonimo: true, institucion: 'Carabineros' },
  ]);

  await supabase.from('personas_buscadas').insert([
    { nombre: 'Luis Martínez', rut: '65.432.109-8', delito: 'Robo con intimidación', fecha_inclusion: '2024-05-20', estado: 'Prófugo', descripcion: '1.75m, cabello negro, contextura media' },
    { nombre: 'Diego Castro', rut: '76.543.210-9', delito: 'Homicidio', fecha_inclusion: '2024-04-15', estado: 'Prófugo', descripcion: '1.80m, cabello castaño, cicatriz en mejilla' },
    { nombre: 'Francisco Vega', rut: '87.654.321-0', delito: 'Tráfico de drogas', fecha_inclusion: '2024-06-01', estado: 'Capturado', descripcion: '1.65m, calvo, tatuajes en brazos' },
  ]);

  await supabase.from('investigaciones').insert([
    { titulo: 'Operación Amanecer', tipo: 'Narcotráfico', fecha: '2024-06-01', estado: 'Activa', encargado: 'Detective María Flores', evidencias: ['Fotos (3)', 'Videos (2)', 'Audio (1)'], user_id: users[0].id },
    { titulo: 'Caso Colibrí', tipo: 'Robos', fecha: '2024-05-15', estado: 'Cerrada', encargado: 'Inspector Pablo Díaz', evidencias: ['Fotos (5)', 'Texto (2)'], user_id: users[0].id },
  ]);

  await supabase.from('incautaciones').insert([
    { tipo: 'Vehículo', descripcion: 'Sedán negro Kia', patente: 'ABC-123', fecha: '2024-06-10', estado: 'En custodia', institucion: 'Carabineros' },
    { tipo: 'Arma', descripcion: 'Pistola 9mm', serie: 'XYZ-789', fecha: '2024-06-08', estado: 'En custodia', institucion: 'PDI' },
    { tipo: 'Objeto', descripcion: 'Teléfono celular iPhone', serie: 'SN-456', fecha: '2024-06-05', estado: 'Devuelto', institucion: 'Carabineros' },
  ]);

  await supabase.from('multas').insert([
    { rut: '12.345.678-9', nombre: 'Carlos Muñoz', motivo: 'Exceso de velocidad', monto: 50000, fecha: '2024-06-05', pagada: false, institucion: 'Carabineros' },
    { rut: '34.567.890-1', nombre: 'Pedro López', motivo: 'Estacionamiento prohibido', monto: 25000, fecha: '2024-06-03', pagada: true, institucion: 'Municipalidad' },
  ]);

  await supabase.from('vehiculos_policia').insert([
    { patente: 'ABC-123', marca: 'Kia', modelo: 'Cerato', anio: 2020, color: 'Negro', duenio: 'Carlos Muñoz', rut_duenio: '12.345.678-9', estado: 'Sin encargo' },
    { patente: 'DEF-456', marca: 'Toyota', modelo: 'Corolla', anio: 2022, color: 'Blanco', duenio: 'María González', rut_duenio: '23.456.789-0', estado: 'Encargo por robo' },
    { patente: 'GHI-789', marca: 'Chevrolet', modelo: 'Cruze', anio: 2019, color: 'Rojo', duenio: 'Pedro López', rut_duenio: '34.567.890-1', estado: 'Sin encargo' },
  ]);

  await supabase.from('bienes').insert([
    { tipo: 'Inmueble', descripcion: 'Casa 2 pisos', direccion: 'Av. Principal 123', duenio: 'Carlos Muñoz', rut_duenio: '12.345.678-9' },
    { tipo: 'Vehículo', descripcion: 'Toyota Corolla 2022', patente: 'DEF-456', duenio: 'María González', rut_duenio: '23.456.789-0' },
    { tipo: 'Arma', descripcion: 'Escopeta calibre 12', duenio: 'Pedro López', rut_duenio: '34.567.890-1' },
  ]);

  await supabase.from('black_market_items').insert([
    { item: 'Pistola Glock 17', precio: 150000, stock: 5, vendedor: 'El Loco' },
    { item: 'Chaleco antibalas', precio: 80000, stock: 3, vendedor: 'El Loco' },
    { item: 'Teléfono tracker', precio: 45000, stock: 10, vendedor: 'Shadow' },
    { item: 'Documentos falsos', precio: 60000, stock: 2, vendedor: 'Shadow' },
    { item: 'Diamantes', precio: 200000, stock: 1, vendedor: 'El Joyero' },
  ]);

  await supabase.from('grupos_discord').insert([
    { nombre: 'Ciudadanos', color: '#95a5a6', miembros: 45 },
    { nombre: 'Carabineros', color: '#2ecc71', miembros: 12 },
    { nombre: 'PDI', color: '#3498db', miembros: 8 },
    { nombre: 'Municipalidad', color: '#9b59b6', miembros: 5 },
    { nombre: 'VIP', color: '#f1c40f', miembros: 15, icono: '\u2b50' },
    { nombre: 'Staff', color: '#e74c3c', miembros: 4, icono: '\u26a1' },
  ]);

  await supabase.from('tienda_items').insert([
    { nombre: 'Walkie Talkie', precio: 35000, desc: 'Comunicacion por radio de corto alcance', icon: 'fa-broadcast-tower', categoria: 'comunicacion', stock: 18 },
    { nombre: 'Telefono Basico', precio: 15000, desc: 'Comunicacion basica con cobertura nacional', icon: 'fa-mobile-alt', categoria: 'comunicacion', stock: 25 },
    { nombre: 'Telefono Avanzado', precio: 50000, desc: 'Camara HD, GPS integrado y resistencia al agua', icon: 'fa-mobile-alt', categoria: 'comunicacion', stock: 12 },
    { nombre: 'GPS Navegador', precio: 45000, desc: 'Navegacion satelital con mapas offline', icon: 'fa-satellite-dish', categoria: 'comunicacion', stock: 10 },
    { nombre: 'Camara Corporal', precio: 75000, desc: 'Grabacion continua HD con vision nocturna', icon: 'fa-video', categoria: 'comunicacion', stock: 8 },
    { nombre: 'Radio Policial', precio: 65000, desc: 'Radio encriptada con frecuencias institucionales', icon: 'fa-walkie-talkie', categoria: 'comunicacion', stock: 15 },
    { nombre: 'Ropa Formal', precio: 25000, desc: 'Vestimenta elegante para presentaciones oficiales', icon: 'fa-tshirt', categoria: 'vestimenta', stock: 20 },
    { nombre: 'Ropa Civil Casual', precio: 12000, desc: 'Ropa de calle discreta para operaciones encubiertas', icon: 'fa-tshirt', categoria: 'vestimenta', stock: 30 },
    { nombre: 'Uniforme Tactico', precio: 85000, desc: 'Uniforme operativo reforzado con rodilleras y coderas', icon: 'fa-user-tie', categoria: 'vestimenta', stock: 10 },
    { nombre: 'Chaleco Reflectante', precio: 20000, desc: 'Alta visibilidad para seguridad vial y operativos', icon: 'fa-vest', categoria: 'vestimenta', stock: 18 },
    { nombre: 'Kit de Herramientas', precio: 30000, desc: 'Set completo de herramientas para reparaciones varias', icon: 'fa-tools', categoria: 'herramientas', stock: 15 },
    { nombre: 'Linterna Tactica', precio: 12000, desc: 'Alta potencia LED con modo estroboscopico', icon: 'fa-flashlight', categoria: 'herramientas', stock: 22 },
    { nombre: 'Multiherramienta', precio: 18000, desc: 'Alicate, cuchillo, destornillador y mas en uno', icon: 'fa-wrench', categoria: 'herramientas', stock: 14 },
    { nombre: 'Mochila Tactica', precio: 55000, desc: 'Carga pesada, compartimentos modulares y resistente al agua', icon: 'fa-briefcase', categoria: 'herramientas', stock: 10 },
    { nombre: 'Botiquin Basico', precio: 18000, desc: 'Primeros auxilios: gasas, vendas y antisepticos', icon: 'fa-medkit', categoria: 'medicina', stock: 20 },
    { nombre: 'Botiquin Avanzado', precio: 55000, desc: 'Sutura, suero fisiologico, torniquete y medicamentos', icon: 'fa-medkit', categoria: 'medicina', stock: 10 },
    { nombre: 'Vendajes Hemostaticos', precio: 25000, desc: 'Control rapido de hemorragias en combate', icon: 'fa-band-aid', categoria: 'medicina', stock: 16 },
    { nombre: 'Kit de Reanimacion', precio: 40000, desc: 'RCP y desfibrilador portatil (DEA)', icon: 'fa-heartbeat', categoria: 'medicina', stock: 8 },
    { nombre: 'Esposas', precio: 22000, desc: 'Esposas metalicas estandar con doble cerradura', icon: 'fa-handcuffs', categoria: 'policial', stock: 30 },
    { nombre: 'Gas Pimienta', precio: 16000, desc: 'Spray de defensa personal con alcance de 3 metros', icon: 'fa-flask', categoria: 'policial', stock: 25 },
    { nombre: 'Baston Retractil', precio: 35000, desc: 'Baston extensible policial de acero reforzado', icon: 'fa-gavel', categoria: 'policial', stock: 18 },
    { nombre: 'Grilletes', precio: 28000, desc: 'Grilletes doble cerradura para traslados', icon: 'fa-lock', categoria: 'policial', stock: 20 },
    { nombre: 'Chaleco Antibalas Ligero', precio: 150000, desc: 'Proteccion balistica nivel IIIA, peso reducido', icon: 'fa-shield-haltered', categoria: 'policial', stock: 6 },
    { nombre: 'Taser', precio: 95000, desc: 'Dispositivo de inmovilizacion electrica de alto voltaje', icon: 'fa-bolt', categoria: 'policial', stock: 10 },
    { nombre: 'Candado de Volante', precio: 12000, desc: 'Seguridad antirrobo vehicular de acero templado', icon: 'fa-key', categoria: 'vehiculos', stock: 22 },
    { nombre: 'Kit de Emergencia Vial', precio: 22000, desc: 'Triangulos reflectantes y botiquin vehicular', icon: 'fa-car', categoria: 'vehiculos', stock: 15 },
    { nombre: 'GPS Vehicular', precio: 50000, desc: 'Navegacion y rastreo vehicular en tiempo real', icon: 'fa-map-marker-alt', categoria: 'vehiculos', stock: 8 },
    { nombre: 'Radio CB', precio: 40000, desc: 'Comunicacion vehiculo a vehiculo de largo alcance', icon: 'fa-microphone', categoria: 'vehiculos', stock: 12 },
    { nombre: 'MRE - Racion de Combate', precio: 8000, desc: 'Comida de larga duracion lista para consumir', icon: 'fa-utensils', categoria: 'alimentos', stock: 40 },
    { nombre: 'Cantimplora Tactica', precio: 10000, desc: 'Hidratacion en terreno con filtro purificador', icon: 'fa-flask', categoria: 'alimentos', stock: 25 },
    { nombre: 'Energizante', precio: 3500, desc: 'Bebida energetica para recuperar resistencia', icon: 'fa-coffee', categoria: 'alimentos', stock: 50 },
    { nombre: 'Mochila de Hidratacion', precio: 18000, desc: 'Camelback 2L para operaciones prolongadas', icon: 'fa-water', categoria: 'alimentos', stock: 15 },
    { nombre: 'Cadena de Identificacion', precio: 3500, desc: 'Placa identificativa metalica con cadena reforzada', icon: 'fa-id-card', categoria: 'accesorios', stock: 40 },
    { nombre: 'Silbato Tactico', precio: 5000, desc: 'Senalizacion auditiva de emergencia de alta frecuencia', icon: 'fa-bell', categoria: 'accesorios', stock: 30 },
    { nombre: 'Guantes Tacticos', precio: 14000, desc: 'Proteccion y agarre reforzado con nudilleras', icon: 'fa-hand-paper', categoria: 'accesorios', stock: 20 },
    { nombre: 'Gafas Balisticas', precio: 22000, desc: 'Proteccion ocular tactica antimpacto UV400', icon: 'fa-glasses', categoria: 'accesorios', stock: 12 },
  ]);

  console.log('[Seed] Datos insertados exitosamente');
  console.log(`  - ${users.length} usuarios`);
  console.log(`  - ${(funcs || []).length} funcionarios`);
  console.log(`  - Contraseña usuarios: 123456`);
  console.log(`  - Admin: rut=admin pass=admin123`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
