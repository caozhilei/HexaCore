const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  await run('npx', ['ts-node', 'scripts/test-qwen.ts']);
}

main().catch((err) => {
  console.error('❌ Qwen integration verification failed:', err);
  process.exitCode = 1;
});

