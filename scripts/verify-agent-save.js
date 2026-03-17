const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, serviceKey);

  const { data: agents, error: listError } = await supabase
    .from('agents')
    .select('id,name,description,config,owner_id,updated_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (listError) {
    throw listError;
  }

  if (!agents || agents.length === 0) {
    throw new Error('No agents found in table public.agents');
  }

  const agent = agents[0];
  console.log('Target agent:', { id: agent.id, name: agent.name, owner_id: agent.owner_id });

  const newName = `${agent.name || 'Agent'} (verify ${new Date().toISOString()})`;
  const nextConfig = {
    ...(agent.config || {}),
    model: (agent.config && agent.config.model) || 'qwen-turbo',
    system_prompt:
      (agent.config && agent.config.system_prompt) ||
      'You are a helpful assistant. This is a verification update.',
    skills: ['web-search'],
    temperature: typeof agent.config?.temperature === 'number' ? agent.config.temperature : 0.7,
  };

  const { data: updated, error: updateError } = await supabase
    .from('agents')
    .update({
      name: newName,
      config: nextConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .select('id,name,config,owner_id,updated_at')
    .single();

  if (updateError) {
    console.error('Update error detail:', updateError);
    throw updateError;
  }

  console.log('Updated agent:', {
    id: updated.id,
    name: updated.name,
    model: updated.config?.model,
    skills: updated.config?.skills,
    updated_at: updated.updated_at,
  });

  console.log('✅ Agent save verification succeeded (service role).');
}

main().catch((err) => {
  console.error('❌ Agent save verification failed:', err);
  process.exitCode = 1;
});

