import { convert, DEFAULT_OPTIONS } from './converter.js';
import type { ConversionOptions } from './converter.js';

const SAMPLE_JSON = JSON.stringify(
  {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    address: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
    },
    tags: ['engineer', 'designer'],
    scores: [95, 87, 92],
    projects: [
      {
        name: 'Project Alpha',
        status: 'active',
        budget: 50000,
      },
      {
        name: 'Project Beta',
        status: 'completed',
        budget: null,
        deadline: '2024-06-30T00:00:00Z',
      },
    ],
  },
  null,
  2,
);

interface AppState {
  options: ConversionOptions;
}

const state: AppState = {
  options: { ...DEFAULT_OPTIONS },
};

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function init(): void {
  loadOptionsFromStorage();
  bindEvents();
  loadFromUrl();
  const input = el<HTMLTextAreaElement>('json-input');
  if (!input.value) {
    input.value = SAMPLE_JSON;
  }
  convertAndDisplay();
  updateLineNumbers();
}

function bindEvents(): void {
  const input = el<HTMLTextAreaElement>('json-input');

  let timer: ReturnType<typeof setTimeout> | null = null;
  input.addEventListener('input', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      convertAndDisplay();
      updateLineNumbers();
    }, 120);
  });

  input.addEventListener('scroll', () => {
    const lineNums = el<HTMLElement>('line-numbers');
    lineNums.scrollTop = input.scrollTop;
  });

  el<HTMLElement>('options-toggle').addEventListener('click', toggleOptions);
  el<HTMLElement>('copy-btn').addEventListener('click', copyOutput);
  el<HTMLElement>('share-btn').addEventListener('click', shareUrl);
  el<HTMLElement>('sample-btn').addEventListener('click', loadSample);

  el<HTMLInputElement>('opt-root-name').addEventListener('input', (e) => {
    state.options.rootName = (e.target as HTMLInputElement).value || 'RootObject';
    saveOptionsToStorage();
    convertAndDisplay();
  });

  el<HTMLInputElement>('opt-use-type').addEventListener('change', (e) => {
    state.options.useType = (e.target as HTMLInputElement).checked;
    saveOptionsToStorage();
    convertAndDisplay();
  });

  el<HTMLInputElement>('opt-export').addEventListener('change', (e) => {
    state.options.exportKeyword = (e.target as HTMLInputElement).checked;
    saveOptionsToStorage();
    convertAndDisplay();
  });

  el<HTMLInputElement>('opt-semicolons').addEventListener('change', (e) => {
    state.options.semiColons = (e.target as HTMLInputElement).checked;
    saveOptionsToStorage();
    convertAndDisplay();
  });

  el<HTMLInputElement>('opt-sort').addEventListener('change', (e) => {
    state.options.sortAlphabetically = (e.target as HTMLInputElement).checked;
    saveOptionsToStorage();
    convertAndDisplay();
  });

  el<HTMLInputElement>('opt-indent-2').addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) {
      state.options.indentSize = 2;
      saveOptionsToStorage();
      convertAndDisplay();
    }
  });

  el<HTMLInputElement>('opt-indent-4').addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) {
      state.options.indentSize = 4;
      saveOptionsToStorage();
      convertAndDisplay();
    }
  });

  initDivider();
}

function toggleOptions(): void {
  const panel = el<HTMLElement>('options-panel');
  const btn = el<HTMLElement>('options-toggle');
  panel.classList.toggle('open');
  btn.classList.toggle('active');
}

function convertAndDisplay(): void {
  const input = el<HTMLTextAreaElement>('json-input').value.trim();
  const output = el<HTMLElement>('ts-output');
  const errorBar = el<HTMLElement>('error-bar');

  if (!input) {
    output.innerHTML = '<span class="placeholder">Paste JSON to generate TypeScript</span>';
    errorBar.classList.remove('visible');
    return;
  }

  const result = convert(input, state.options);

  if (result.error) {
    errorBar.textContent = result.error;
    errorBar.classList.add('visible');
    output.innerHTML = '<span class="placeholder">Fix JSON errors to see output</span>';
    return;
  }

  errorBar.classList.remove('visible');
  output.innerHTML = result.highlighted;
}

function updateLineNumbers(): void {
  const input = el<HTMLTextAreaElement>('json-input');
  const lineNums = el<HTMLElement>('line-numbers');
  const count = input.value.split('\n').length;
  const nums: string[] = [];
  for (let i = 1; i <= count; i++) {
    nums.push(String(i));
  }
  lineNums.innerHTML = nums.join('<br>');
}

function copyOutput(): void {
  const input = el<HTMLTextAreaElement>('json-input').value.trim();
  if (!input) return;

  const result = convert(input, state.options);
  if (result.error || !result.code) return;

  navigator.clipboard.writeText(result.code).then(() => {
    flashButton('copy-btn', 'Copied!');
  });
}

function shareUrl(): void {
  const input = el<HTMLTextAreaElement>('json-input').value.trim();
  if (!input) return;

  const encoded = encodeForUrl(input);
  const url = `${location.origin}${location.pathname}#data=${encoded}`;

  navigator.clipboard.writeText(url).then(() => {
    flashButton('share-btn', 'Link copied!');
  });
}

function loadSample(): void {
  el<HTMLTextAreaElement>('json-input').value = SAMPLE_JSON;
  convertAndDisplay();
  updateLineNumbers();
}

function flashButton(id: string, text: string): void {
  const btn = el<HTMLElement>(id);
  const original = btn.textContent;
  btn.textContent = text;
  btn.classList.add('flash');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('flash');
  }, 1500);
}

function encodeForUrl(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

function decodeFromUrl(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function loadFromUrl(): void {
  const hash = location.hash;
  if (!hash.startsWith('#data=')) return;
  const encoded = hash.substring(6);
  try {
    const json = decodeFromUrl(encoded);
    JSON.parse(json);
    el<HTMLTextAreaElement>('json-input').value = json;
  } catch {
    // invalid data in URL, ignore
  }
}

function initDivider(): void {
  const divider = el<HTMLElement>('divider');
  const container = el<HTMLElement>('editor-container');
  const leftPanel = el<HTMLElement>('input-panel');
  let isDragging = false;

  function startDrag(e: MouseEvent | TouchEvent): void {
    isDragging = true;
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onDrag(e: MouseEvent | TouchEvent): void {
    if (!isDragging) return;
    const clientX =
      e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = (x / rect.width) * 100;
    const clamped = Math.max(20, Math.min(80, pct));
    leftPanel.style.flexBasis = `${clamped}%`;
  }

  function endDrag(): void {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  divider.addEventListener('mousedown', startDrag);
  divider.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

function saveOptionsToStorage(): void {
  try {
    localStorage.setItem('json-to-ts-options', JSON.stringify(state.options));
  } catch {
    // storage unavailable
  }
}

function loadOptionsFromStorage(): void {
  try {
    const stored = localStorage.getItem('json-to-ts-options');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ConversionOptions>;
      state.options = { ...DEFAULT_OPTIONS, ...parsed };
    }
  } catch {
    // storage unavailable
  }

  const opt = state.options;
  el<HTMLInputElement>('opt-root-name').value = opt.rootName;
  el<HTMLInputElement>('opt-use-type').checked = opt.useType;
  el<HTMLInputElement>('opt-export').checked = opt.exportKeyword;
  el<HTMLInputElement>('opt-semicolons').checked = opt.semiColons;
  el<HTMLInputElement>('opt-sort').checked = opt.sortAlphabetically;
  if (opt.indentSize === 4) {
    el<HTMLInputElement>('opt-indent-4').checked = true;
  } else {
    el<HTMLInputElement>('opt-indent-2').checked = true;
  }
}

window.addEventListener('DOMContentLoaded', init);
