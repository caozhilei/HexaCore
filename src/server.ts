
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local first if it exists (for local overrides)
if (fs.existsSync(path.resolve(__dirname, '../.env.local'))) {
    console.log('Loading .env.local');
    dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
}

// Load .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { WebAdapter } from './core/entry-points/web-adapter';
import { Orchestrator } from './core/orchestrator';

async function main() {
  console.log('Starting HexaCore Gateway...');

  // Initialize Core Components
  const orchestrator = new Orchestrator();
  
  // Initialize Adapters
  const webAdapter = new WebAdapter();

  // Wire up adapter to orchestrator
  webAdapter.onMessage(async (message) => {
    try {
      console.log(`[Server] Received message from ${message.peer.id}`);
      const response = await orchestrator.processMessage(message);
      
      console.log(`[Server] Sending response to ${message.peer.id}`);
      await webAdapter.send(response);
    } catch (error: any) {
      console.error('[Server] Error processing message:', error);
      // Optional: Send error message back to user if possible
      try {
          // If we have a valid session/peerId, try to send error back
          if (message.peer?.id) {
              await webAdapter.send({
                  channel: 'web',
                  accountId: message.accountId,
                  peerId: message.peer.id,
                  content: {
                      type: 'text',
                      text: `Error: ${error.message || 'Internal Server Error'}`
                  },
                  metadata: {
                      common: {
                          agentId: message.metadata?.common?.agentId,
                          sessionId: message.metadata?.common?.sessionId
                      }
                  } as any
              });
          }
      } catch (sendError) {
          console.error('[Server] Failed to send error response:', sendError);
      }
    }
  });

  // Start Adapter
  await webAdapter.start({
    enabled: true,
    adapter: 'widget',
    dmPolicy: 'open', // Set to open for testing
    config: {
        wsPort: 18790,
        widgetVersion: '2.0.0',
        maxConnections: 1000,
        pingInterval: 30000,
        sessionTimeout: 3600000,
        maxSessionsPerUser: 10,
        cleanupInterval: 60000,
        apiEndpoint: 'http://localhost:3000/api',
        theme: 'light',
        localization: 'en-US'
    }
  });

  console.log('HexaCore Gateway is running on port 18790');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await webAdapter.stop();
    process.exit(0);
  });
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
