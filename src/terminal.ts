const form = document.querySelector<HTMLFormElement>('#command-form');
const input = document.querySelector<HTMLInputElement>('#command');
const output = document.querySelector<HTMLElement>('#terminal-output');
let cwd = '/home/arvin';
function runCommand(raw: string): void {
  if (!output) return;
  const command = raw.trim().toLowerCase();
  if (command === 'whoami') { output.textContent = 'arvin'; return; }
  if (command === 'cat readme.md') { output.textContent = 'Arvin — Data Engineering and ML/AI Engineering. Data Science · Telkom University.'; return; }
  if (command === 'pwd') { output.textContent = cwd; return; }
  if (command === 'ls' || command.startsWith('ls ')) {
    const flags = command.slice(2).trim();
    if (flags && !/^(?:-[al]+)(?:\s+-[al]+)*$/.test(flags)) { output.textContent = 'ls: unsupported option'; return; }
    output.replaceChildren();
    const all = flags.includes('a'); const long = flags.includes('l');
    if (all) output.append(document.createTextNode('./  ../  '));
    const names = cwd === '/home/arvin' ? ['writing', 'projects', 'experience', 'achievements', 'contact'] : [];
    for (const name of names) {
      if (long) output.append(document.createTextNode('dr-x '));
      const link = document.createElement('a'); link.href = `#${name}`; link.textContent = `${name}/`;
      output.append(link, document.createTextNode('  '));
    }
    if (long) output.append(document.createTextNode('-r-- '));
    const readme = document.createElement('a'); readme.href = '#readme'; readme.textContent = 'README.md'; output.append(readme);
    return;
  }
  if (command === 'cd' || command.startsWith('cd ')) {
    const path = command.slice(2).trim() || '~';
    let next = path.startsWith('/') || path.startsWith('~') ? '/home/arvin' : cwd;
    const components = path.replace(/^~\/?/, '').replace(/^\//, '').split('/');
    const directories = ['writing', 'projects', 'experience', 'achievements', 'contact'];
    for (const component of components) {
      if (!component || component === '.') continue;
      if (component === '..') { next = '/home/arvin'; continue; }
      if (next !== '/home/arvin' || !directories.includes(component)) {
        output.textContent = `cd: ${path}: no such directory`; return;
      }
      next += `/${component}`;
    }
    cwd = next;
    const section = cwd === '/home/arvin' ? 'top' : cwd.split('/').at(-1)!;
    window.location.hash = section;
    document.querySelector<HTMLElement>(`#${section}-title`)?.focus({ preventScroll: true });
    const prompt = document.querySelector('.command-prompt');
    if (prompt) prompt.textContent = `arvin@portfolio:${cwd.replace('/home/arvin', '~')}$`;
    output.textContent = ''; return;
  }
  if (!command) { output.textContent = 'Enter a command or choose a link.'; return; }
  if (command === 'clear') { output.textContent = ''; return; }
  if (command === 'help') { output.textContent = 'Commands: writing, projects, experience, achievements, contact, help, clear. Section commands navigate the page. Also: ls, cd, pwd, cat README.md, whoami.'; return; }
  if (['writing', 'projects', 'experience', 'achievements', 'contact'].includes(command)) {
    output.textContent = `Opening ${command}.`;
    window.location.hash = command;
    document.querySelector<HTMLElement>(`#${command}-title`)?.focus({ preventScroll: true });
    return;
  }
  output.textContent = 'Command not recognized. Type help, or use the page links.';
}
const commandHistory: string[] = [];
let historyIndex = 0;
form?.addEventListener('submit', event => {
  event.preventDefault();
  const value = input?.value ?? '';
  if (value.trim()) commandHistory.push(value);
  historyIndex = commandHistory.length;
  const prompt = document.querySelector('.command-prompt')?.textContent ?? '$';
  runCommand(value);
  const transcript = document.querySelector('#transcript');
  if (transcript && value.trim().toLowerCase() === 'clear') transcript.replaceChildren();
  else if (transcript && value.trim()) {
    const row = document.createElement('p');
    row.textContent = `${prompt} ${value}\n${output?.textContent ?? ''}`;
    transcript.append(row);
  }
  if (input) input.value = '';
});
input?.addEventListener('keydown', event => {
  if (event.key === 'Tab' && !event.shiftKey && cwd === '/home/arvin') {
    const match = /^(cd\s+)([a-z]+)$/.exec(input.value);
    if (match) {
      const candidates = ['writing', 'projects', 'experience', 'achievements', 'contact'].filter(name => name.startsWith(match[2]));
      if (candidates.length === 1) { event.preventDefault(); input.value = `${match[1]}${candidates[0]}/`; }
    }
    return;
  }
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
  input.value = commandHistory[historyIndex] ?? '';
});
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button => button.addEventListener('click', () => runCommand(button.dataset.command ?? '')));

