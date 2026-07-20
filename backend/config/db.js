const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

async function connectDB() {
  const { error } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (error) {
    console.error('[Supabase] Error de conexión:', error.message);
    throw error;
  }

  console.log('[Supabase] Conectado correctamente');
}

async function disconnectDB() {
  console.log('[Supabase] Nada que desconectar (Supabase usa HTTP)');
}

module.exports = {
  supabase,
  connectDB,
  disconnectDB
};