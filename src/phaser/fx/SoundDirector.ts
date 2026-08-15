import { starterCatalog } from "../../core/content";
import type { EnemyTier } from "../../core/types";
import type { GameEvent } from "../../core/types";
import { ThrottleGate } from "../feedback";

const MUTE_STORAGE_KEY = "zcamp.sound.muted";
const MASTER_GAIN = 0.5;

interface ToneOptions {
  type: OscillatorType;
  fromHz: number;
  toHz?: number;
  durationSeconds: number;
  gain: number;
  delaySeconds?: number;
}

interface NoiseOptions {
  durationSeconds: number;
  gain: number;
  lowPassHz?: number;
  delaySeconds?: number;
}

export type UiSound = "click" | "error" | "build" | "upgrade" | "trait" | "transform" | "battle_start" | "victory" | "defeat" | "boss_roar";
export type WallImpactSound = "light" | "heavy" | "critical";

/**
 * Procedural WebAudio sound layer: zero asset files, lazily unlocked by the first user gesture,
 * with per-source throttling so sustained crowds never become a noise wall. Presentation-only.
 */
export class SoundDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = this.readStoredMute();
  private gates = new ThrottleGate();
  private readonly enemyTiers = new Map<string, EnemyTier>();
  private readonly enemyGoldRewards = new Map<string, number>();

  public constructor() {
    for (const enemy of starterCatalog.enemies) {
      this.enemyTiers.set(enemy.id, enemy.tier);
      this.enemyGoldRewards.set(enemy.id, enemy.goldReward);
    }
  }

  public unlock(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.context) {
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_GAIN;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Storage may be unavailable in private modes; muting stays session-only.
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public handleEvent(event: GameEvent): void {
    switch (event.type) {
      case "tower_attack":
        this.playThrottled("shot:" + event.towerDefinitionId, 0.07, () => this.playShot(event.towerDefinitionId));
        break;
      case "enemy_hit":
        this.playThrottled("hit", 0.05, () => this.playNoise({ durationSeconds: 0.03, gain: 0.07, lowPassHz: 3200 }));
        break;
      case "enemy_defeated":
        this.playDefeat(this.enemyDefinitionId(event.enemyId));
        break;
      case "enemy_charge_warning":
        this.playThrottled("charge_warning", 0.5, () => {
          this.playTone({ type: "square", fromHz: 880, durationSeconds: 0.08, gain: 0.14 });
          this.playTone({ type: "square", fromHz: 880, durationSeconds: 0.08, gain: 0.14, delaySeconds: 0.14 });
        });
        break;
      case "enemy_charge_started":
        this.playTone({ type: "sawtooth", fromHz: 320, toHz: 640, durationSeconds: 0.18, gain: 0.14 });
        break;
      case "enemy_charge_impact":
        this.playNoise({ durationSeconds: 0.2, gain: 0.3, lowPassHz: 420 });
        this.playTone({ type: "sine", fromHz: 72, toHz: 36, durationSeconds: 0.26, gain: 0.32 });
        break;
      case "overlord_inspire":
        this.playTone({ type: "sawtooth", fromHz: 110, durationSeconds: 0.5, gain: 0.2 });
        this.playTone({ type: "sawtooth", fromHz: 165, durationSeconds: 0.5, gain: 0.14 });
        break;
      case "wave_started":
        this.playThrottled("wave", 0.8, () => {
          this.playTone({ type: "sawtooth", fromHz: 220, durationSeconds: 0.2, gain: 0.16 });
          this.playTone({ type: "sawtooth", fromHz: 293, durationSeconds: 0.28, gain: 0.16, delaySeconds: 0.16 });
        });
        break;
      case "enemy_burned":
        this.playThrottled("burn", 0.9, () => this.playNoise({ durationSeconds: 0.14, gain: 0.09, lowPassHz: 1400 }));
        break;
      case "tower_special":
        this.playThrottled("special:" + event.effect, 0.5, () => this.playTone({ type: "triangle", fromHz: 520, toHz: 680, durationSeconds: 0.06, gain: 0.08 }));
        break;
      case "building_built":
        this.playUi("build");
        break;
      case "building_upgraded":
        this.playUi("upgrade");
        break;
      case "building_trait_chosen":
        this.playUi("trait");
        break;
      case "tower_transformed":
        this.playUi("transform");
        break;
      default:
        break;
    }
  }

  public playUi(sound: UiSound): void {
    switch (sound) {
      case "click":
        this.playTone({ type: "square", fromHz: 480, toHz: 380, durationSeconds: 0.05, gain: 0.1 });
        break;
      case "error":
        this.playTone({ type: "square", fromHz: 150, toHz: 95, durationSeconds:  0.16, gain: 0.16 });
        break;
      case "build":
        this.playNoise({ durationSeconds: 0.08, gain: 0.22, lowPassHz: 900 });
        this.playTone({ type: "sine", fromHz: 180, toHz: 120, durationSeconds: 0.12, gain: 0.18 });
        break;
      case "upgrade":
        [330, 440, 554].forEach((hz, index) => this.playTone({ type: "sine", fromHz: hz, durationSeconds: 0.1, gain: 0.14, delaySeconds: index * 0.07 }));
        break;
      case "trait":
        this.playTone({ type: "triangle", fromHz: 660, toHz: 990, durationSeconds: 0.16, gain: 0.16 });
        this.playTone({ type: "triangle", fromHz: 880, toHz: 1320, durationSeconds: 0.18, gain: 0.12, delaySeconds: 0.08 });
        break;
      case "transform":
        this.playTone({ type: "sawtooth", fromHz: 200, toHz: 720, durationSeconds: 0.22, gain: 0.14 });
        this.playNoise({ durationSeconds: 0.18, gain: 0.12, lowPassHz: 2400 });
        break;
      case "battle_start":
        this.playTone({ type: "sawtooth", fromHz: 196, durationSeconds: 0.22, gain: 0.18 });
        this.playTone({ type: "sawtooth", fromHz: 294, durationSeconds: 0.32, gain: 0.18, delaySeconds: 0.18 });
        break;
      case "victory":
        [523, 659, 784, 1046].forEach((hz, index) => this.playTone({ type: "sine", fromHz: hz, durationSeconds: 0.16, gain: 0.18, delaySeconds: index * 0.12 }));
        break;
      case "defeat":
        [392, 311, 262, 196].forEach((hz, index) => this.playTone({ type: "sawtooth", fromHz: hz, durationSeconds: 0.22, gain: 0.16, delaySeconds: index * 0.16 }));
        break;
      case "boss_roar":
        this.playTone({ type: "sawtooth", fromHz: 130, toHz: 62, durationSeconds: 0.55, gain: 0.3 });
        this.playTone({ type: "square", fromHz: 98, toHz: 55, durationSeconds: 0.6, gain: 0.16, delaySeconds: 0.05 });
        this.playNoise({ durationSeconds: 0.5, gain: 0.14, lowPassHz: 320 });
        break;
    }
  }

  public playWallImpact(tier: WallImpactSound): void {
    this.playThrottled("wall:" + tier, tier === "light" ? 0.09 : 0.12, () => {
      if (tier === "light") {
        this.playTone({ type: "sine", fromHz: 90, toHz: 62, durationSeconds: 0.08, gain: 0.18 });
        return;
      }
      this.playTone({ type: "sine", fromHz: 78, toHz: 40, durationSeconds: tier === "critical" ? 0.3 : 0.18, gain: tier === "critical" ? 0.4 : 0.3 });
      this.playNoise({ durationSeconds: 0.16, gain: 0.2, lowPassHz: 360 });
    });
  }

  private playShot(towerDefinitionId: string): void {
    switch (towerDefinitionId) {
      case "machine_gun":
        this.playNoise({ durationSeconds: 0.045, gain: 0.1, lowPassHz: 2600 });
        break;
      case "cannon":
        this.playTone({ type: "sine", fromHz: 130, toHz: 58, durationSeconds: 0.16, gain: 0.26 });
        this.playNoise({ durationSeconds: 0.12, gain: 0.16, lowPassHz: 640 });
        break;
      case "frost":
        this.playTone({ type: "triangle", fromHz: 940, toHz: 720, durationSeconds: 0.08, gain: 0.08 });
        break;
      case "electric":
        this.playTone({ type: "sawtooth", fromHz: 760, toHz: 180, durationSeconds: 0.09, gain: 0.1 });
        break;
      default:
        this.playTone({ type: "square", fromHz: 620, toHz: 320, durationSeconds: 0.06, gain: 0.07 });
        break;
    }
  }

  private playDefeat(definitionId: string): void {
    const tier = this.enemyTiers.get(definitionId) ?? "normal";
    const goldReward = this.enemyGoldRewards.get(definitionId) ?? 0;
    if (tier === "boss") {
      this.playTone({ type: "sine", fromHz: 160, toHz: 40, durationSeconds: 0.5, gain: 0.34 });
      this.playNoise({ durationSeconds: 0.4, gain: 0.24, lowPassHz: 500 });
    } else if (tier === "elite") {
      this.playThrottled("defeat:elite", 0.1, () => {
        this.playTone({ type: "square", fromHz: 240, toHz: 80, durationSeconds: 0.16, gain: 0.18 });
        this.playNoise({ durationSeconds: 0.12, gain: 0.14, lowPassHz: 900 });
      });
    } else {
      this.playThrottled("defeat:normal", 0.06, () => this.playTone({ type: "square", fromHz: 300, toHz: 90, durationSeconds: 0.1, gain: 0.12 }));
    }
    if (goldReward >= 3) {
      this.playTone({ type: "triangle", fromHz: 1180, durationSeconds: 0.06, gain: 0.12 });
      this.playTone({ type: "triangle", fromHz: 1560, durationSeconds: 0.1, gain: 0.12, delaySeconds: 0.06 });
    }
  }

  private playThrottled(key: string, minIntervalSeconds: number, play: () => void): void {
    if (!this.ready()) return;
    if (!this.gates.allow(key, this.nowSeconds(), minIntervalSeconds)) return;
    play();
  }

  private playTone(options: ToneOptions): void {
    const context = this.ready();
    if (!context || !this.master) return;
    const startAt = context.currentTime + (options.delaySeconds ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.fromHz, startAt);
    if (options.toHz !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.toHz), startAt + options.durationSeconds);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(options.gain, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + options.durationSeconds);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(startAt);
    oscillator.stop(startAt + options.durationSeconds + 0.02);
  }

  private playNoise(options: NoiseOptions): void {
    const context = this.ready();
    if (!context || !this.master) return;
    if (!this.noiseBuffer) {
      const sampleCount = Math.floor(context.sampleRate);
      this.noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) channel[index] = Math.random() * 2 - 1;
    }
    const startAt = context.currentTime + (options.delaySeconds ?? 0);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(options.gain, startAt + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + options.durationSeconds);
    let output: AudioNode = gain;
    if (options.lowPassHz !== undefined) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = options.lowPassHz;
      gain.connect(filter);
      output = filter;
    }
    source.connect(gain);
    output.connect(this.master);
    source.start(startAt);
    source.stop(startAt + options.durationSeconds + 0.02);
  }

  private ready(): AudioContext | null {
    return this.context && !this.muted ? this.context : null;
  }

  private nowSeconds(): number {
    return performance.now() / 1000;
  }

  private enemyDefinitionId(enemyId: string): string {
    const separator = enemyId.lastIndexOf("-");
    return separator > 0 ? enemyId.slice(0, separator) : enemyId;
  }

  private readStoredMute(): boolean {
    try {
      return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }
}

let sharedDirector: SoundDirector | null = null;

/** One director per page so unlock state, mute preference, and throttle history survive scene changes. */
export function getSoundDirector(): SoundDirector {
  sharedDirector ??= new SoundDirector();
  return sharedDirector;
}
