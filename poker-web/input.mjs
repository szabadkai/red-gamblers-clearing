// One binding table drives the game loop, the menus and every key name shown on screen.
const KEY = 'red.poker.controls.v1';

export const ACTIONS = [
  {id: 'left', name: 'Move left'}, {id: 'right', name: 'Move right'}, {id: 'down', name: 'Drop through'},
  {id: 'jump', name: 'Jump'}, {id: 'dash', name: 'Dash'}, {id: 'sword', name: 'Sword'},
  {id: 'play', name: 'Play hand'}, {id: 'cycle', name: 'Cycle play'}, {id: 'interact', name: 'Collect / interact'},
  {id: 'cards', name: 'Inspect cards'}, {id: 'pause', name: 'Pause'}, {id: 'retry', name: 'Retry'}
];

// Card slots stay on 1–5 and Escape always pauses or backs out, so neither can be rebound.
export const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
export const RESERVED = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight', ...SLOT_KEYS]);

export const LAYOUTS = {
  wasd: {name: 'WASD + J K L', keys: {
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyW', 'ArrowUp'], dash: ['ShiftLeft', 'ShiftRight'], sword: ['KeyJ'],
    play: ['KeyK'], cycle: ['KeyL', 'KeyQ'], interact: ['KeyE'], cards: ['KeyC'], pause: ['KeyP'], retry: ['KeyR']}},
  arrows: {name: 'Arrows + Z X C V', keys: {
    left: ['ArrowLeft'], right: ['ArrowRight'], down: ['ArrowDown'],
    jump: ['KeyZ', 'ArrowUp', 'Space'], dash: ['ShiftLeft', 'ShiftRight'], sword: ['KeyX'],
    play: ['KeyC'], cycle: ['KeyV'], interact: ['Enter', 'KeyE'], cards: ['KeyA'], pause: ['KeyP'], retry: ['KeyR']}}
};

// Until the player picks a layout, pressing the other layout's sword, play or cycle key switches to it.
const SWITCH_KEYS = {wasd: ['KeyJ', 'KeyK', 'KeyL'], arrows: ['KeyZ', 'KeyX', 'KeyV']};

export const PAD_BUTTONS = {0: 'jump', 1: 'dash', 2: 'sword', 3: 'play', 4: 'cycle', 5: 'dash', 6: 'cards', 7: 'dash', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right'};
const PAD_LABELS = {left: 'Stick left', right: 'Stick right', down: 'Stick down', jump: 'A', dash: 'B', sword: 'X', play: 'Y', cycle: 'LB', interact: 'D-pad Up', cards: 'LT', pause: 'Start', retry: 'Pause, then Retry'};
const TOUCH_LABELS = {left: 'Stick', right: 'Stick', down: 'Stick down', jump: 'Jump', dash: 'Dash', sword: 'Sword', play: 'Play', cycle: 'Cycle', interact: 'Collect', cards: 'Tap a card', pause: 'Pause'};

const ARROWS = {ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓'};
export function keyName(code) {
  if (!code) return 'Unbound';
  if (ARROWS[code]) return ARROWS[code];
  const m = /^(Key|Digit)(.)$/.exec(code);
  if (m) return m[2];
  if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(-1);
  const names = {ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', AltRight: 'Right Alt',
    Escape: 'Esc', Backspace: 'Backspace', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
    BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`'};
  return names[code] ?? code;
}

const copy = keys => Object.fromEntries(ACTIONS.map(({id}) => [id, [...(keys[id] || [])]]));

// Codes bound to more than one action.
export function conflicts(keys) {
  const seen = new Map(), clash = new Set();
  for (const {id} of ACTIONS) for (const code of keys[id] || []) {
    if (seen.has(code) && seen.get(code) !== id) clash.add(code);
    seen.set(code, id);
  }
  return [...clash];
}

export function loadControls(storage) {
  let saved;
  try { saved = JSON.parse(storage.getItem(KEY)); } catch {}
  const layout = ['wasd', 'arrows', 'custom'].includes(saved?.layout) ? saved.layout : 'wasd';
  let custom = null;
  if (layout === 'custom' && saved.custom && typeof saved.custom === 'object') {
    custom = copy({});
    for (const {id} of ACTIONS) {
      const codes = saved.custom[id];
      if (Array.isArray(codes)) custom[id] = codes.filter(code => typeof code === 'string' && !RESERVED.has(code)).slice(0, 3);
    }
    if (conflicts(custom).length) custom = null;
  }
  return {layout: custom || layout !== 'custom' ? layout : 'wasd', custom, chosen: saved?.chosen === true};
}

export function createControls(storage) {
  const state = loadControls(storage), listeners = new Set();
  let byCode = new Map();
  const bindings = () => state.layout === 'custom' ? state.custom : LAYOUTS[state.layout].keys;
  function changed() {
    byCode = new Map();
    for (const {id} of ACTIONS) for (const code of bindings()[id]) byCode.set(code, id);
    try { storage.setItem(KEY, JSON.stringify(state)); } catch {}
    for (const fn of listeners) fn();
  }
  changed();
  function setLayout(layout, chosen = true) {
    if (!LAYOUTS[layout]) return;
    state.layout = layout; state.custom = null; state.chosen = chosen; changed();
  }
  return {
    get layout() { return state.layout; },
    keys: id => bindings()[id] || [],
    // The action a key triggers in play: a bound action, a card slot, or pause for Escape.
    action(code) {
      if (code === 'Escape') return 'pause';
      const slot = SLOT_KEYS.indexOf(code);
      return slot >= 0 ? 'slot' + (slot + 1) : byCode.get(code) ?? null;
    },
    label(id, device = 'keyboard') {
      if (device === 'gamepad') return PAD_LABELS[id] ?? '';
      if (device === 'touch') return TOUCH_LABELS[id] ?? '';
      if (id === 'slots') return '1–5';
      return keyName(bindings()[id]?.[0]);
    },
    setLayout,
    notice(code) {
      if (state.chosen || state.layout === 'custom' || byCode.has(code)) return false;
      const other = state.layout === 'wasd' ? 'arrows' : 'wasd';
      if (!SWITCH_KEYS[other].includes(code)) return false;
      setLayout(other, false);
      return true;
    },
    // Binds one key to an action, taking it from any other action. Returns the action left with no key, if any.
    rebind(id, code) {
      if (RESERVED.has(code) || !ACTIONS.some(a => a.id === id)) return {ok: false};
      const keys = copy(bindings());
      let orphan = null;
      for (const other of ACTIONS) {
        if (other.id === id || !keys[other.id].includes(code)) continue;
        keys[other.id] = keys[other.id].filter(c => c !== code);
        if (!keys[other.id].length) orphan = other.id;
      }
      keys[id] = [code];
      state.layout = 'custom'; state.custom = keys; state.chosen = true; changed();
      return {ok: true, orphan};
    },
    onChange(fn) { listeners.add(fn); }
  };
}
