const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local');
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: agents, error: listError } = await supabase
    .from('agents')
    .select('id,name,config,owner_id,updated_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (listError) {
    console.error('List error detail:', listError);
    throw listError;
  }

  if (!agents || agents.length === 0) {
    throw new Error('No agents found in table public.agents');
  }

  const agent = agents[0];
  console.log('Target agent:', { id: agent.id, name: agent.name, owner_id: agent.owner_id });

  const { data: updated, error: updateError } = await supabase
    .from('agents')
    .update({
      description: `anon update verify ${new Date().toISOString()}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .select('id,description,updated_at')
    .single();

  if (updateError) {
    console.error('Update error detail:', updateError);
    throw updateError;
  }

  console.log('Updated agent:', updated);
  console.log('✅ Agent save verification succeeded (anon key, no login).');
}

main().catch((err) => {
  console.error('❌ Agent save verification failed (anon):', err);
  process.exitCode = 1;
});

