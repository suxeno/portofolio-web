import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the simulated shell resolves project navigation without a DOM', async () => {
  const shell = await import('../src/shell.ts').catch(() => null);
  assert.ok(shell, 'a DOM-independent simulated shell must exist');
  const result = shell.runCommand('/home/arvin', 'cd projects');
  assert.equal(result.cwd, '/home/arvin/projects');
  assert.equal(result.navigate, 'projects');
});

test('absolute and home paths navigate to a directory', async () => {
  const { runCommand } = await import('../src/shell.ts');
  for (const path of ['/projects', '~/projects']) {
    const result = runCommand('/home/arvin', `cd ${path}`);
    assert.equal(result.cwd, '/home/arvin/projects');
    assert.equal(result.navigate, 'projects');
  }
});

test('canonical absolute home path reaches project section', async () => {
  const { runCommand } = await import('../src/shell.ts');
  assert.equal(runCommand('/home/arvin', 'cd /home/arvin/projects').cwd, '/home/arvin/projects');
});

test('invalid intermediate path does not change directory', async () => {
  const { runCommand } = await import('../src/shell.ts');
  const result = runCommand('/home/arvin', 'cd nonexistent/../projects');
  assert.equal(result.cwd, '/home/arvin');
  assert.match(result.output, /no such directory/);
});

test('listing respects flags and current directory', async () => {
  const { runCommand } = await import('../src/shell.ts');
  const root = runCommand('/home/arvin', 'ls -la');
  assert.deepEqual(root.listing, { all: true, long: true, names: ['writing', 'projects', 'experience', 'achievements', 'contact'] });
  assert.deepEqual(runCommand('/home/arvin/projects', 'ls').listing.names, []);
  assert.match(runCommand('/home/arvin', 'ls --unsafe').output, /unsupported/);
});

test('commands return text without executing input', async () => {
  const { runCommand } = await import('../src/shell.ts');
  assert.equal(runCommand('/home/arvin', 'whoami').output, 'arvin');
  assert.equal(runCommand('/home/arvin/projects', 'pwd').output, '/home/arvin/projects');
  assert.match(runCommand('/home/arvin', 'cat README.md').output, /Data Engineering/);
  assert.match(runCommand('/home/arvin', 'help').output, /whoami/);
  assert.equal(runCommand('/home/arvin', 'clear').clear, true);
  const invalid = runCommand('/home/arvin', 'cd projects; <img src=x onerror=alert(1)>');
  assert.equal(invalid.cwd, '/home/arvin');
  assert.match(invalid.output, /no such directory/);
});
