const KEY = 'red.poker.settings.v1';
const motionModes = ['system', 'reduced', 'full'];

export function loadSettings(storage) {
  let saved, sound = true;
  try {
    sound = storage.getItem('red.poker.sound') !== 'off';
    saved = JSON.parse(storage.getItem(KEY));
  } catch {}
  const level = value => Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 100;
  return {
    sound: typeof saved?.sound === 'boolean' ? saved.sound : sound,
    music: level(saved?.music),
    effects: level(saved?.effects),
    motion: motionModes.includes(saved?.motion) ? saved.motion : 'system',
    tutorials: saved?.tutorials !== false
  };
}

export function saveSettings(storage, settings) {
  try { storage.setItem(KEY, JSON.stringify(settings)); return true; } catch { return false; }
}

export function bindSettings(settings, storage, apply) {
  const get = id => document.getElementById(id);
  const sound = get('sound'), motion = get('motion'), status = get('settings-status');
  function changed() {
    apply();
    status.textContent = saveSettings(storage, settings) ? '' : 'Changes apply for this visit. Browser storage is unavailable.';
  }
  sound.checked = settings.sound;
  sound.onchange = () => { settings.sound = sound.checked; changed(); };
  const tutorials = get('tutorials');
  tutorials.checked = settings.tutorials;
  tutorials.onchange = () => { settings.tutorials = tutorials.checked; changed(); };
  motion.value = settings.motion;
  motion.onchange = () => { settings.motion = motion.value; changed(); };
  for (const channel of ['music', 'effects']) {
    const slider = get(channel + '-level'), output = slider.nextElementSibling;
    slider.value = settings[channel];
    output.value = settings[channel] + '%';
    slider.oninput = () => {
      settings[channel] = slider.valueAsNumber;
      output.value = settings[channel] + '%';
      changed();
    };
  }
  const full = get('fullscreen');
  get('fullscreen-row').hidden = !document.fullscreenEnabled;
  function reflectFullscreen() { full.textContent = document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'; }
  reflectFullscreen();
  document.addEventListener('fullscreenchange', reflectFullscreen);
  full.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        if (matchMedia('(pointer: coarse)').matches) await window.screen.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch { status.textContent = 'Full screen is unavailable in this window.'; }
  };
  apply();
}

// Keyboard section: a layout picker and one button per action that listens for the next key.
export function bindKeyboard(controls, actions, keyName) {
  const get = id => document.getElementById(id);
  const layout = get('key-layout'), list = get('key-list'), status = get('key-status');
  let listening = null;
  const rows = actions.map(({id, name}) => {
    const row = document.createElement('div'), label = document.createElement('span'), button = document.createElement('button');
    row.className = 'menu-row key-row';
    label.id = 'key-name-' + id; label.textContent = name;
    button.dataset.action = id; button.setAttribute('aria-describedby', label.id);
    button.onclick = () => listen(id, button);
    button.onblur = () => { if (listening?.button === button) stop(''); };
    row.append(label, button); list.append(row);
    return button;
  });
  function render() {
    layout.value = controls.layout;
    layout.querySelector('[value="custom"]').hidden = controls.layout !== 'custom';
    for (const button of rows) if (listening?.button !== button) {
      const keys = controls.keys(button.dataset.action);
      button.textContent = keys.length ? keys.map(keyName).join(' · ') : 'No key';
      button.classList.toggle('unbound', !keys.length);
    }
  }
  function stop(message) {
    listening = null; status.textContent = message; render();
  }
  function listen(id, button) {
    listening = {id, button};
    button.textContent = 'Press a key…';
    status.textContent = `Press a key for ${actions.find(a => a.id === id).name}. Esc cancels.`;
  }
  // Capture phase, so the key never reaches the menus or the game.
  window.addEventListener('keydown', event => {
    if (!listening) return;
    if (!listening.button.getClientRects().length) { stop(''); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.code === 'Escape') { stop(''); return; }
    const result = controls.rebind(listening.id, event.code);
    if (!result.ok) { status.textContent = `${keyName(event.code)} is kept for menus and card slots. Press another key.`; return; }
    const orphan = result.orphan && actions.find(a => a.id === result.orphan).name;
    stop(orphan ? `${orphan} has no key now. Choose one for it.` : '');
  }, true);
  layout.onchange = () => { if (layout.value !== 'custom') { controls.setLayout(layout.value); status.textContent = ''; } };
  controls.onChange(render);
  render();
}
