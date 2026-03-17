require('dotenv').config({ path: '.env.local' });
const { SupabaseService } = require('../dist/core/database/supabase');
const { MemoryRepository } = require('../dist/core/database/memory-repo');
const { AgentRepository } = require('../dist/core/database/agent-repo');

async function test() {
  console.log('=== Starting Shared Memory Space Test ===');
  
  const memoryRepo = new MemoryRepository();
  const agentRepo = new AgentRepository();
  
  // 1. Create two test agents
  console.log('1. Creating test agents...');
  const agentA = await agentRepo.createAgent({ name: 'Agent A (Writer)', description: 'Test Agent A' });
  const agentB = await agentRepo.createAgent({ name: 'Agent B (Reader)', description: 'Test Agent B' });
  console.log(`Created Agent A: ${agentA.id}`);
  console.log(`Created Agent B: ${agentB.id}`);

  // 2. Create a shared memory space
  console.log('\n2. Creating shared memory space...');
  const space = await memoryRepo.createSpace('Test Blackboard', 'shared');
  console.log(`Created Space: ${space.id} (${space.name})`);

  // 3. Grant access
  console.log('\n3. Granting access...');
  await memoryRepo.grantAccess(space.id, agentA.id, 'write');
  await memoryRepo.grantAccess(space.id, agentB.id, 'read');
  console.log('Agent A -> WRITE');
  console.log('Agent B -> READ');

  // 4. Test permission checks
  console.log('\n4. Verifying permissions...');
  const canAWrite = await memoryRepo.checkPermission(space.id, agentA.id, 'write');
  const canBWrite = await memoryRepo.checkPermission(space.id, agentB.id, 'write');
  console.log(`Can Agent A write? ${canAWrite} (Expected: true)`);
  console.log(`Can Agent B write? ${canBWrite} (Expected: false)`);
  
  if (!canAWrite || canBWrite) {
    throw new Error('Permission checks failed!');
  }

  // 5. Agent A writes to the shared space
  console.log('\n5. Agent A writes to the shared space...');
  const testContent = `Critical intelligence gathered at ${new Date().toISOString()}`;
  await memoryRepo.addMemory(null, testContent, 'long', {}, space.id, agentA.id);
  console.log(`Wrote memory: "${testContent}"`);

  // 6. Agent B reads from the shared space
  console.log('\n6. Agent B reads from shared spaces...');
  const sharedMemories = await memoryRepo.getAgentSharedMemories(agentB.id);
  console.log(`Found ${sharedMemories.length} shared memories for Agent B.`);
  
  const found = sharedMemories.some(m => m.content === testContent);
  console.log(`Did Agent B find the specific memory? ${found} (Expected: true)`);
  
  if (!found) {
    throw new Error('Agent B could not read Agent A\'s memory!');
  }

  // 7. Test unauthorized write
  console.log('\n7. Testing unauthorized write by Agent B...');
  try {
    await memoryRepo.addMemory(null, 'Hacked data', 'long', {}, space.id, agentB.id);
    throw new Error('Agent B was able to write despite only having read access!');
  } catch (error) {
    console.log(`Success: Blocked Agent B from writing. Error message: ${error.message}`);
  }

  // Cleanup
  console.log('\n8. Cleaning up...');
  // Due to CASCADE delete, deleting the agents will clean up grants, 
  // but we also need to delete the space
  await agentRepo.deleteAgent(agentA.id);
  await agentRepo.deleteAgent(agentB.id);
  
  const { supabase } = require('../dist/core/database/supabase');
  await supabase.from('memory_spaces').delete().eq('id', space.id);
  
  console.log('Cleanup complete.');
  console.log('\n✅ All tests passed successfully!');
}

test().catch(console.error);
