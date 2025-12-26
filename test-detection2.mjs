import { execSync } from 'child_process';

console.log('=== TESTE SEM ENCODING ===');
try {
  execSync('npx tsc --noEmit --pretty false', {
    cwd: '/Users/pedrolemes/aura_core/mcp-server',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('No errors');
} catch (error) {
  console.log('Error caught!');
  console.log('stderr exists?', !!error.stderr);
  console.log('stderr type:', typeof error.stderr);
  console.log('stderr is Buffer?', Buffer.isBuffer(error.stderr));
  console.log('stdout exists?', !!error.stdout);
  console.log('stdout type:', typeof error.stdout);
  console.log('stdout is Buffer?', Buffer.isBuffer(error.stdout));
  
  if (error.stdout && Buffer.isBuffer(error.stdout)) {
    console.log('stdout content (first 300):', error.stdout.toString('utf-8').substring(0, 300));
  }
  if (error.stderr && Buffer.isBuffer(error.stderr)) {
    console.log('stderr content (first 300):', error.stderr.toString('utf-8').substring(0, 300));
  }
}



