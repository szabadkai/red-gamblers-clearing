// Manage the pages inside the title, pause and result menus. Gameplay stays suspended until Resume.
export function createMenu(resume) {
  const get = id => document.getElementById(id), overlay = get('overlay');
  let page = get('menu-home'), opener, confirmAction;
  function items() {
    return [...page.querySelectorAll('button,input,select,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
  }
  function show(next) {
    page.hidden = true;
    page = get('menu-' + next);
    page.hidden = false;
    page.scrollTop = 0;
    overlay.setAttribute('aria-label', next === 'home' ? 'Game menu' : page.querySelector('h2').textContent);
  }
  function home(focus = true) {
    show('home');
    confirmAction = null;
    if (focus) items()[0]?.focus({preventScroll:true});
  }
  function open(next, trigger) {
    opener = trigger;
    show(next);
    const heading = page.querySelector('h2');
    heading.tabIndex = -1;
    (next === 'confirm' ? get('confirm-cancel') : next === 'settings' ? get('sound') : heading).focus({preventScroll:true});
  }
  function back() {
    if (page.id === 'menu-home') { resume(); return; }
    home(false);
    opener?.focus({preventScroll:true});
  }
  for (const id of ['settings','guide','credits']) {
    const button = get('open-' + id);
    button.onclick = () => open(id, button);
  }
  for (const button of overlay.querySelectorAll('.menu-back')) button.onclick = back;
  get('confirm-cancel').onclick = back;
  get('confirm-go').onclick = () => {
    const action = confirmAction;
    home(false);
    action?.();
  };
  function confirm(trigger, title, copy, label, action) {
    get('confirm-title').textContent = title;
    get('confirm-copy').textContent = copy;
    get('confirm-go').textContent = label;
    confirmAction = action;
    open('confirm', trigger);
  }
  function move(direction) {
    const list = items(), index = list.indexOf(document.activeElement);
    const target = index < 0 ? (direction > 0 ? 0 : list.length - 1) : (index + direction + list.length) % list.length;
    list[target]?.focus();
  }
  function navigate(direction) {
    if (page.id === 'menu-guide' && (direction > 0 ? page.scrollTop + page.clientHeight < page.scrollHeight - 1 : page.scrollTop > 0)) {
      page.scrollBy(0, direction * page.clientHeight * .65);
    } else move(direction);
  }
  function key(event, action) {
    if (event.code === 'Tab') {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    } else if (event.code === 'Escape' || action === 'pause') {
      event.preventDefault();
      if (!event.repeat) back();
    } else if (['ArrowUp','ArrowDown'].includes(event.code) && !event.target.matches('select,input[type="range"]')) {
      event.preventDefault();
      navigate(event.code === 'ArrowDown' ? 1 : -1);
    }
  }
  // Gamepad actions from input.mjs: up/down move, A confirms, B or Start backs out, left/right adjust.
  function pad(action) {
    const el = document.activeElement;
    if (action === 'up' || action === 'down') navigate(action === 'down' ? 1 : -1);
    else if (action === 'pause' || action === 'dash') back();
    else if (action === 'jump') {
      if (el?.matches('select') && page.contains(el)) adjust(el, 1);
      else (items().includes(el) ? el : items()[0])?.click();
    } else if (action === 'left' || action === 'right') {
      if (page.contains(el)) adjust(el, action === 'right' ? 1 : -1);
    }
  }
  function adjust(el, direction) {
    if (el.matches('input[type="range"]')) {
      if (direction > 0) el.stepUp(); else el.stepDown();
      el.dispatchEvent(new Event('input', {bubbles:true}));
    } else if (el.matches('select')) {
      el.selectedIndex = (el.selectedIndex + direction + el.length) % el.length;
      el.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }
  return {home, open, confirm, key, pad, focusPrimary: () => items()[0]?.focus({preventScroll:true})};
}
