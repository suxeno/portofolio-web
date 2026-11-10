export const directories = ['writing', 'projects', 'experience', 'achievements', 'contact'] as const;
const home = '/home/arvin';
export interface Result { cwd: string; output: string; navigate?: string; listing?: { all: boolean; long: boolean; names: string[] }; clear?: boolean }

export function runCommand(cwd: string, raw: string): Result {
  const command = raw.trim().toLowerCase();
  const result = (output = ''): Result => ({ cwd, output });
  if (!command) return result('Enter a command or choose a link.');
  if (command === 'whoami') return result('arvin');
  if (command === 'pwd') return result(cwd);
  if (command === 'cat readme.md') return result('Arvin — Data Engineering and ML/AI Engineering.');
  if (command === 'help') return result('Commands: writing, projects, experience, achievements, contact, help, clear. Section commands navigate the page. Also: ls, cd, pwd, cat README.md, whoami.');
  if (command === 'clear') return { ...result(), clear: true };
  if (command === 'ls' || command.startsWith('ls ')) {
    const flags = command.slice(2).trim();
    if (flags && !/^(?:-[al]+)(?:\s+-[al]+)*$/.test(flags)) return result('ls: unsupported option');
    return { ...result(), listing: { all: flags.includes('a'), long: flags.includes('l'), names: cwd === home ? [...directories] : [] } };
  }
  if (command === 'cd' || command.startsWith('cd ')) {
    const path = command.slice(2).trim() || '~';
    let next = path.startsWith('/') || path.startsWith('~') ? home : cwd;
    const components = path.replace(/^\/home\/arvin(?=\/|$)/, '').replace(/^~\/?/, '').replace(/^\//, '').split('/');
    for (const component of components) {
      if (!component || component === '.') continue;
      if (component === '..') { next = home; continue; }
      if (next !== home || !directories.some(name => name === component)) return result(`cd: ${path}: no such directory`);
      next += `/${component}`;
    }
    return { cwd: next, output: '', navigate: next === home ? 'top' : next.slice(home.length + 1) };
  }
  if (directories.some(name => name === command)) return { ...result(`Opening ${command}.`), navigate: command };
  return result('Command not recognized. Type help, or use the page links.');
}
