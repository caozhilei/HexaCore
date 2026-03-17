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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const orchestrator_1 = require("./core/orchestrator");
// Load env
const envPath = path_1.default.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });
async function startCLI() {
    console.log('🤖 HexaCore CLI Interface');
    console.log('-------------------------');
    console.log(`Connecting to Supabase at: ${process.env.SUPABASE_URL}`);
    console.log(`Using LLM Provider: ${process.env.LLM_PROVIDER || 'openai'}`);
    console.log('-------------------------');
    try {
        const orchestrator = new orchestrator_1.Orchestrator();
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'User> '
        });
        rl.prompt();
        rl.on('line', async (line) => {
            const text = line.trim();
            if (!text) {
                rl.prompt();
                return;
            }
            if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
                console.log('Bye!');
                process.exit(0);
            }
            // Construct Inbound Message
            const message = {
                id: `cli-${Date.now()}`,
                channel: 'cli',
                accountId: 'default',
                peer: {
                    id: 'cli-user',
                    kind: 'dm',
                    metadata: {
                        // Mock some metadata to trigger potential routing rules
                        tier: 'premium'
                    }
                },
                content: {
                    type: 'text',
                    text: text
                },
                timestamp: Date.now(),
                metadata: {}
            };
            try {
                const response = await orchestrator.processMessage(message);
                console.log(`Agent> ${response.content.text}`);
            }
            catch (error) {
                console.error(`Error: ${error.message}`);
            }
            rl.prompt();
        }).on('close', () => {
            console.log('Bye!');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start CLI:', error);
    }
}
startCLI();
//# sourceMappingURL=cli.js.map