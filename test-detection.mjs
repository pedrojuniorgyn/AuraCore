import { execSync } from 'child_process';

try {
  execSync('npx tsc --noEmit --pretty false', {
    cwd: '/Users/pedrolemes/aura_core/mcp-server',
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('No errors');
} catch (error) {
  console.log('Error caught!');
  console.log('stderr exists?', !!error.stderr);
  console.log('stderr type:', typeof error.stderr);
  console.log('stderr content:', error.stderr ? error.stderr.toString().substring(0, 200) : 'EMPTY');
}



