<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { directories, runCommand, type Result } from '../shell';

const commandInput = ref<HTMLInputElement | null>(null);
const measure = ref<HTMLElement | null>(null);
const caretX = ref(0);
const showCaret = ref(false);
const composing = ref(false);
async function updateCaret() {
  await nextTick();
  const input = commandInput.value;
  const ruler = measure.value;
  if (!input || !ruler) return;
  showCaret.value = document.activeElement === input && !composing.value && input.selectionStart === input.selectionEnd;
  ruler.textContent = input.value.slice(0, input.selectionStart ?? 0);
  caretX.value = Math.max(0, Math.min(input.clientWidth - 3, ruler.getBoundingClientRect().width - input.scrollLeft));
}
function compositionStart() { composing.value = true; void updateCaret(); }
function compositionEnd() { composing.value = false; void updateCaret(); }
onMounted(() => { document.addEventListener('selectionchange', updateCaret); window.addEventListener('resize', updateCaret); });
onUnmounted(() => { document.removeEventListener('selectionchange', updateCaret); window.removeEventListener('resize', updateCaret); });

const cwd = ref('/home/arvin');
const command = ref('');
const output = ref<Result>({ cwd: cwd.value, output: '' });

const history: string[] = [];
let historyIndex = 0;
const prompt = computed(() => `arvin@portfolio:${cwd.value.replace('/home/arvin', '~')}$`);
function submit() {
  const value = command.value;
  if (value.trim()) history.push(value);
  historyIndex = history.length;
  const result = runCommand(cwd.value, value);
  cwd.value = result.cwd;
  output.value = result;

  if (result.navigate) {
    window.location.hash = result.navigate;
    document.getElementById(`${result.navigate}-title`)?.focus({ preventScroll: true });
  }
  command.value = '';
}
function onKey(event: KeyboardEvent) {
  if (event.isComposing || composing.value) return;
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

  <p id="terminal-output" class="terminal-output" role="status" aria-live="polite"><template v-if="output.listing"><template v-if="output.listing.all">./  ../  </template><template v-for="name in output.listing.names" :key="name">{{ output.listing.long ? 'dr-x ' : '' }}<a :href="`#${name}`">{{ name }}/</a>  </template>{{ output.listing.long ? '-r-- ' : '' }}<a href="#readme">README.md</a></template><template v-else>{{ output.output }}</template></p>
  <form id="command-form" @submit.prevent="submit"><label for="command" class="sr-only">Command</label><div class="command-line"><span class="command-prompt" aria-hidden="true">{{ prompt }}</span><span class="command-input-wrap"><input ref="commandInput" id="command" v-model="command" name="command" maxlength="80" autocomplete="off" spellcheck="false" placeholder="type help" :class="{ composing }" @keydown="onKey" @keyup="updateCaret" @input="updateCaret" @focus="updateCaret" @blur="updateCaret" @click="updateCaret" @scroll="updateCaret" @compositionstart="compositionStart" @compositionend="compositionEnd" /><span ref="measure" class="command-measure" aria-hidden="true"></span><span v-show="showCaret" class="command-caret" :style="{ left: `${caretX}px` }" aria-hidden="true"></span></span><button type="submit">Run</button></div></form>
  <p class="command-hint">Type help for commands.</p>
</template>
