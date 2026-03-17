import { AgentRepository } from '../src/core/database/agent-repo';
import { SessionRepository } from '../src/core/database/session-repo';
import { MemoryRepository } from '../src/core/database/memory-repo';
import { RoutingEngine } from '../src/core/routing/engine';
import { RoutingRuleRepository } from '../src/core/database/routing-repo';
import { exampleRules } from '../src/core/routing/examples';

async function runTest() {
  console.log('🚀 Starting Supabase Flow Test (Basic + Routing)...');

  const agentRepo = new AgentRepository();
  const sessionRepo = new SessionRepository();
  const memoryRepo = new MemoryRepository();
  const routingRepo = new RoutingRuleRepository();

  let agentId: string | null = null;
  const sessionKey = `test-session-${Date.now()}`;

  try {
    // 1. Create Agent
    console.log('\n📝 Creating Test Agent...');
    const agent = await agentRepo.createAgent({
      name: 'Test Agent',
      description: 'Created by integration test',
      config: { model: 'gpt-4o', prompt: 'You are a helpful assistant.' },
    });
    agentId = agent.id;
    console.log('✅ Agent Created:', agent.id, agent.name);

    // 2. Create Session
    console.log('\n📝 Creating Session...');
    const session = await sessionRepo.createSession(sessionKey, agentId, 'user-123', { step: 1 });
    console.log('✅ Session Created:', session.session_key);

    // 3. Update Session State
    console.log('\n🔄 Updating Session State...');
    const updatedSession = await sessionRepo.updateSessionState(sessionKey, { step: 2, last_message: 'hello' });
    console.log('✅ Session State Updated:', updatedSession.state);

    // 4. Add Memory
    console.log('\n🧠 Adding Memory...');
    const memory = await memoryRepo.addMemory(sessionKey, 'User said: Hello world', 'short', { source: 'user' });
    console.log('✅ Memory Added:', memory.id, memory.content);

    // 5. Retrieve Memories
    console.log('\n🔍 Retrieving Memories...');
    const memories = await memoryRepo.getMemories(sessionKey);
    console.log('✅ Memories Retrieved:', memories.length);
    if (memories.length > 0) {
        console.log('   Latest Memory:', memories[0].content);
    }

    // 6. Search Memories (Text)
    console.log('\n🔎 Searching Memories (Text)...');
    const searchResults = await memoryRepo.searchMemories(sessionKey, 'Hello');
    console.log('✅ Search Results:', searchResults.length);

    // 7. Test Routing Engine (DB integration)
    console.log('\n🛣️ Testing Routing Engine (DB Mode)...');
    
    // Create a temporary rule for our test agent
    const tempRule = await routingRepo.createRule({
      priority: 999,
      match_condition: {
        content: { keywords: ['test_routing_db'] }
      } as any,
      target_agent_id: agentId,
      description: 'Temporary test rule',
      is_active: true
    });
    console.log('   Created temp routing rule:', tempRule.id);

    // Initialize engine with DB rules enabled
    const engine = new RoutingEngine({ rules: [] }, { useDatabaseRules: true });
    
    // Wait for DB rules to load. The loadRulesFromDatabase is async but called in constructor without await.
    // We need to wait enough time, or better, expose a method to wait for it.
    // Since we don't have that method yet, we'll wait a bit longer.
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    // Debug: Check loaded rules count (if we could access config, but it's private)
    // Let's assume it loaded if we waited. 

    // Test routing
    const testMsg = {
      id: 'msg-test-1',
      channel: 'web',
      peer: { id: 'user-1', kind: 'dm' },
      content: { text: 'This is a test_routing_db message' },
      timestamp: new Date()
    };
    
    // @ts-ignore
    const routeResult = await engine.route(testMsg);
    console.log('   Routing Result Agent ID:', routeResult.agentId);
    
    // In our test, we expect it to match the temp rule (Priority 999) which points to agentId.
    // However, if there are other rules with higher priority, it might fail.
    // Let's check what agent it routed to.
    
    if (routeResult.agentId === agentId) {
      console.log('✅ Routing Engine successfully routed to DB-defined agent!');
    } else {
      console.error('❌ Routing Engine failed to route correctly. Expected:', agentId, 'Got:', routeResult.agentId);
      // Let's inspect why. Maybe the keyword matcher failed?
      // Keywords in rule: ['test_routing_db']
      // Text in message: 'This is a test_routing_db message'
      // Should match.
    }

    // Clean up rule
    await routingRepo.deleteRule(tempRule.id, true);
    console.log('   Temp rule deleted.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (agentId) {
        try {
            // Delete memories
            const memories = await memoryRepo.getMemories(sessionKey);
            for (const m of memories) {
                await memoryRepo.deleteMemory(m.id);
            }
            console.log('   Memories deleted.');

            // Delete session
            await sessionRepo.deleteSession(sessionKey);
            console.log('   Session deleted.');

            // Delete agent
            if (agentId) {
                // Check if any other rules reference this agent before deleting?
                // The DB constraints might prevent deletion if rules exist.
                // We already deleted our temp rule.
                await agentRepo.deleteAgent(agentId);
                console.log('   Agent deleted.');
            }
        } catch (cleanupError) {
            console.error('⚠️ Cleanup failed:', cleanupError);
        }
    }
    console.log('🏁 Test Completed.');
  }
}

runTest();

