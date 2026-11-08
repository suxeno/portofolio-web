<script setup lang="ts">
import { computed, ref } from 'vue';
import { directories, runCommand, type Result } from '../shell';

const cwd = ref('/home/arvin');
const command = ref('');
const output = ref<Result>({ cwd: cwd.value, output: 'Simulated terminal. Type help or choose a directory.' });
const transcript = ref<string[]>([]);
const history: string[] = [];
let historyIndex = 0;
const prompt = computed(() => `arvin@portfolio:${cwd.value.replace('/home/arvin', '~')}$`);
function listingText(result: Result): string {
  const listing = result.listing;
  if (!listing) return result.output;
  return `${listing.all ? './  ../  ' : ''}${listing.names.map(name => `${listing.long ? 'dr-x ' : ''}${name}/  `).join('')}${listing.long ? '-r-- ' : ''}README.md`;
}
function submit() {
  const value = command.value;
  const priorPrompt = prompt.value;
  if (value.trim()) history.push(value);
  historyIndex = history.length;
  const result = runCommand(cwd.value, value);
  cwd.value = result.cwd;
  output.value = result;
  if (result.clear) transcript.value = [];
  else if (value.trim()) transcript.value.push(`${priorPrompt} ${value}\n${listingText(result)}`);
  if (result.navigate) {
    window.location.hash = result.navigate;
    document.getElementById(`${result.navigate}-title`)?.focus({ preventScroll: true });
  }
  command.value = '';
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Tab' && !event.shiftKey && cwd.value === '/home/arvin') {
    const match = /^(cd\s+)([a-z]+)$/.exec(command.value);
    if (match) {
      const candidates = directories.filter(name => name.startsWith(match[2]));
      if (candidates.length === 1) { event.preventDefault(); command.value = `${match[1]}${candidates[0]}/`; }
    }
    return;
  }
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
  command.value = history[historyIndex] ?? '';
}
</script>
<template>
  <div id="transcript" aria-label="Command transcript"><p v-for="(line, index) in transcript" :key="index">{{ line }}</p></div>
  <form id="command-form" @submit.prevent="submit"><label for="command">Command</label><div class="command-line"><span class="command-prompt" aria-hidden="true">{{ prompt }}</span><input id="command" v-model="command" name="command" maxlength="80" autocomplete="off" spellcheck="false" placeholder="type help" @keydown="onKey" /><button type="submit">Run</button></div></form>
  <p id="terminal-output" class="terminal-output" role="status" aria-live="polite"><template v-if="output.listing"><template v-if="output.listing.all">./  ../  </template><template v-for="name in output.listing.names" :key="name">{{ output.listing.long ? 'dr-x ' : '' }}<a :href="`#${name}`">{{ name }}/</a>  </template>{{ output.listing.long ? '-r-- ' : '' }}<a href="#readme">README.md</a></template><template v-else>{{ output.output }}</template></p>
</template>
