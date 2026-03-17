"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Load .env.local first if it exists (for local overrides)
if (fs.existsSync(path.resolve(__dirname, '../.env.local'))) {
    console.log('Loading .env.local');
    dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
}
// Load .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const web_adapter_1 = require("./core/entry-points/web-adapter");
const orchestrator_1 = require("./core/orchestrator");
async function main() {
    console.log('Starting HexaCore Gateway...');
    // Initialize Core Components
    const orchestrator = new orchestrator_1.Orchestrator();
    // Initialize Adapters
    const webAdapter = new web_adapter_1.WebAdapter();
    // Wire up adapter to orchestrator
    webAdapter.onMessage(async (message) => {
        try {
            console.log(`[Server] Received message from ${message.peer.id}`);
            const response = await orchestrator.processMessage(message);
            console.log(`[Server] Sending response to ${message.peer.id}`);
            await webAdapter.send(response);
        }
        catch (error) {
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
                        }
                    });
                }
            }
            catch (sendError) {
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
//# sourceMappingURL=server.js.map