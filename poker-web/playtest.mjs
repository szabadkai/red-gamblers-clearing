// Opt-in, in-memory development recorder. Never imported by the release runtime.
import {scoringPlays} from './model.mjs';

const round = value => Math.round(value * 100) / 100;
function sample(world) {
  const section = world.gates.filter(gate => gate.open).length;
  const phase = world.storyPhase || 'trail';
  const encounter = world.boss?.kind || (phase === 'trail' ? `section-${section + 1}` : phase);
  return {
    key: `${world.practice ? 'practice' : 'journey'}/${world.clearing.id}/${encounter}`,
    clearing: world.clearing.name, encounter, practice: world.practice,
    time: world.time, mode: world.mode, health: world.health,
    hurt: world.tally.hurt, gates: section, falls: world.fallCount,
    healing: scoringPlays(world.deck.hand).some(play => play.heal),
    draft: world.activeDraft, x: Math.round(world.x)
  };
}

export class PlaytestRecorder {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.active = false;
    this.rows = new Map();
    this.events = [];
    this.droppedEvents = 0;
  }
  start(world) {
    this.rows.clear(); this.events = []; this.droppedEvents = 0;
    this.active = true; this.elapsed = 0; this.last = sample(world);
    this.draftStarted = null; this.segmentStarted = 0;
    this.add('start', this.last);
  }
  row(state) {
    if (!this.rows.has(state.key)) this.rows.set(state.key, {
      clearing: state.clearing, encounter: state.encounter, practice: !!state.practice,
      activeSeconds: 0, secondsWithHealingAvailable: 0, hitsTaken: 0,
      deaths: 0, deathsWithHealingHand: 0, falls: 0, retries: 0,
      drawChoices: 0, drawDecisionSeconds: 0, casts: 0, healingCasts: 0,
      gatesOpened: 0
    });
    return this.rows.get(state.key);
  }
  add(type, state, extra = {}) {
    if (this.events.length >= 5000) { this.droppedEvents++; return; }
    this.events.push({type, at: round(this.elapsed), encounter: state.key, x: state.x, ...extra});
  }
  capture(world) {
    if (!this.active) return;
    const current = sample(world), previous = this.last;
    const row = this.row(previous);
    // A room reset rewinds world.time; menu/dialogue time never advances it.
    const dt = Math.max(0, current.time - previous.time);
    if (previous.mode === 'playing' && dt < 1) {
      row.activeSeconds += dt; this.elapsed += dt;
      if (previous.health < 5 && previous.health > 0 && previous.healing) row.secondsWithHealingAvailable += dt;
    }
    const hurt = Math.max(0, current.hurt - previous.hurt);
    if (hurt) {
      row.hitsTaken += hurt;
      this.add('hurt', previous, {healingAvailable: previous.healing, heartsLost: hurt});
    }
    row.falls += Math.max(0, current.falls - previous.falls);
    if (current.health <= 0 && previous.health > 0) {
      row.deaths++;
      if (previous.healing) row.deathsWithHealingHand++;
      this.add('death', previous, {healingAvailable: previous.healing});
    }
    if (current.gates > previous.gates && current.clearing === previous.clearing) {
      row.gatesOpened += current.gates - previous.gates;
      this.add('gate', previous, {gate: current.gates, activeSecondsSinceSegmentStart: round(this.elapsed - this.segmentStarted)});
      this.segmentStarted = this.elapsed;
    }
    if (current.mode === 'drafting' && previous.mode !== 'drafting') {
      this.row(current).drawChoices++;
      this.draftStarted = {at: this.now(), state: current};
      this.add('draw-open', current);
    }
    if (previous.mode === 'drafting' && current.mode !== 'drafting') this.closeDraft();
    if (previous.key !== current.key) this.segmentStarted = this.elapsed;
    this.last = current;
  }
  closeDraft() {
    if (!this.draftStarted) return;
    const {at, state} = this.draftStarted;
    const seconds = Math.max(0, (this.now() - at) / 1000);
    this.row(state).drawDecisionSeconds += seconds;
    this.add('draw-close', state, {decisionSeconds: round(seconds)});
    this.draftStarted = null;
  }
  action(type, world, extra = {}) {
    if (!this.active) return;
    const state = sample(world), row = this.row(state);
    if (type === 'retry') { row.retries++; this.segmentStarted = this.elapsed; }
    if (type === 'cast') { row.casts++; if (extra.healed) row.healingCasts++; }
    this.add(type, state, extra);
  }
  stop(world) {
    if (!this.active) return;
    this.capture(world); this.closeDraft();
    this.add('stop', this.last); this.active = false;
  }
  report() {
    return {
      version: 1, active: this.active, activeSeconds: round(this.elapsed || 0),
      notes: 'Local, opt-in session. Active time excludes pauses, dialogue and card decisions. Draw decision time uses wall time. Practice is separate. Deaths are grouped by encounter, not attributed to a specific attacker. No player identifiers collected.',
      encounters: [...this.rows.values()].map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'number' ? round(value) : value]))),
      events: this.events.map(event => ({...event})), droppedEvents: this.droppedEvents
    };
  }
}

// Observe the real simulation without changing inputs, damage, RNG or saves.
// Wrapping also captures choices made directly by DOM buttons between frames.
export function observePlaytest(world, recorder) {
  const originals = new Map();
  for (const name of ['step', 'reset', 'retry', 'advance', 'openDraft', 'chooseDraft', 'dismissDraft', 'play', 'hurt']) {
    const original = world[name];
    if (typeof original !== 'function') continue;
    originals.set(name, original);
    world[name] = function (...args) {
      if (!recorder.active) return original.apply(this, args);
      recorder.capture(this);
      if (name === 'retry') recorder.action('retry', this);
      const health = this.health;
      const result = original.apply(this, args);
      if (name === 'play' && result) recorder.action('cast', this, {healed: this.health > health});
      recorder.capture(this);
      return result;
    };
  }
  return () => { for (const [name, original] of originals) world[name] = original; };
}
