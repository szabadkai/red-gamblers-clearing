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
    motion: motionModes.includes(saved?.motion) ? saved.motion : 'system'
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
