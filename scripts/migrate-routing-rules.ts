import { supabase } from '../src/core/database/supabase';
import { RoutingRuleRepository } from '../src/core/database/routing-repo';
import { exampleRules } from '../src/core/routing/examples';
import { AgentRepository } from '../src/core/database/agent-repo';

async function migrateRules() {
  console.log('🚀 Starting Routing Rules Migration...');
  
  const ruleRepo = new RoutingRuleRepository();
  const agentRepo = new AgentRepository();
  
  // 1. Ensure Agents Exist (Create placeholders if missing)
  const agentIds = new Set(exampleRules.map(r => r.agentId).concat(exampleRules.map(r => r.fallbackAgent!).filter(Boolean)));
  
  console.log(`📦 Ensuring ${agentIds.size} agents exist...`);
  
  const agentMap: Record<string, string> = {}; // Name -> UUID
  
  for (const agentName of agentIds) {
    // Check if agent exists by name (mocking name check by creating a new one if not found is tricky with UUIDs)
    // For this migration, we'll create new agents for each unique agentId in the rules
    // In a real scenario, we might map these to existing UUIDs
    
    // We'll search by name first (assuming name is stored in 'name' column)
    const { data: existingAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('name', agentName)
      .limit(1);
      
    if (existingAgents && existingAgents.length > 0) {
      // @ts-ignore
      agentMap[agentName] = existingAgents[0].id;
      // @ts-ignore
      console.log(`   - Agent '${agentName}' already exists: ${existingAgents[0].id}`);
    } else {
      console.log(`   - Creating placeholder agent '${agentName}'...`);
      const newAgent = await agentRepo.createAgent({
        name: agentName,
        description: 'Created by migration script',
        config: { model: 'gpt-3.5-turbo' } // Default config
      });
      agentMap[agentName] = newAgent.id;
    }
  }
  
  // 2. Migrate Rules
  console.log(`\n🔄 Migrating ${exampleRules.length} rules...`);
  
  for (const rule of exampleRules) {
    try {
      // Convert rule to DB format
      const dbRule = {
        priority: rule.priority,
        match_condition: rule.match as any, // Cast to JSON
        target_agent_id: agentMap[rule.agentId],
        description: rule.metadata?.description || `Rule for ${rule.agentId}`,
        is_active: rule.enabled !== false,
        // We could store fallbackAgent in description or a separate column if we add one.
        // For now, let's append it to description if present.
        // Note: Our schema doesn't have 'fallback_agent_id' yet, we might want to add it later.
      };
      
      const createdRule = await ruleRepo.createRule(dbRule);
      console.log(`   ✅ Migrated rule for '${rule.agentId}' (Priority: ${rule.priority}) -> ID: ${createdRule.id}`);
      
    } catch (err) {
      console.error(`   ❌ Failed to migrate rule for '${rule.agentId}':`, err);
    }
  }
  
  console.log('\n✨ Migration Completed!');
}

migrateRules().catch(console.error);
