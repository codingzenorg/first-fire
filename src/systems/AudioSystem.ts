type SoundKind = "command" | "gather" | "build" | "hit" | "death" | "trained" | "victory" | "defeat";
export type AudioStatus = "inactive" | "ready" | "blocked" | "muted";

interface ToneDefinition {
  frequencies: number[];
  duration: number;
  volume: number;
  type: OscillatorType;
}

const SOUNDS: Record<SoundKind, ToneDefinition> = {
  command: { frequencies: [330, 494], duration: 0.14, volume: 0.16, type: "square" },
  gather: { frequencies: [620], duration: 0.1, volume: 0.12, type: "triangle" },
  build: { frequencies: [165, 247, 330], duration: 0.26, volume: 0.18, type: "triangle" },
  hit: { frequencies: [120, 75], duration: 0.12, volume: 0.2, type: "sawtooth" },
  death: { frequencies: [155, 110, 70], duration: 0.38, volume: 0.2, type: "sawtooth" },
  trained: { frequencies: [392, 523, 659], duration: 0.48, volume: 0.32, type: "square" },
  victory: { frequencies: [262, 330, 392, 523], duration: 0.42, volume: 0.22, type: "triangle" },
  defeat: { frequencies: [220, 185, 147], duration: 0.45, volume: 0.2, type: "sawtooth" },
};

export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private enabled = true;
  private activated = false;
  private fallbackMode = false;
  private lastPlayed = new Map<SoundKind, number>();
  private readonly fallback = new Map<SoundKind, string>();
  private readonly activeFallbacks = new Set<HTMLAudioElement>();
  private statusChanged?: (status: AudioStatus) => void;

  constructor() {
    for (const [kind, definition] of Object.entries(SOUNDS) as [SoundKind, ToneDefinition][]) {
      this.fallback.set(kind, this.createWavUrl(definition));
    }
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyM") void this.toggleMute();
    });
  }

  onStatusChanged(listener: (status: AudioStatus) => void): void {
    this.statusChanged = listener;
    listener(this.getStatus());
  }

  async activateAndTest(): Promise<AudioStatus> {
    this.enabled = true;
    const fallbackPlayed = await this.playFallback("trained");
    if (fallbackPlayed) {
      this.fallbackMode = true;
      this.activated = true;
      this.report("ready");
      return "ready";
    }

    const ready = await this.unlock();
    if (ready) {
      this.fallbackMode = false;
      this.activated = true;
      this.emitWebAudio("trained", true);
    }
    this.report(ready ? "ready" : "blocked");
    return ready ? "ready" : "blocked";
  }

  async toggleMute(): Promise<AudioStatus> {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.7 : 0;
    if (!this.enabled) {
      this.report("muted");
      return "muted";
    }
    return this.activateAndTest();
  }

  play(kind: SoundKind): void {
    if (!this.enabled || !this.activated) return;
    const now = performance.now();
    const cooldown = kind === "hit" ? 60 : kind === "gather" ? 180 : 80;
    if (now - (this.lastPlayed.get(kind) ?? -10000) < cooldown) return;
    this.lastPlayed.set(kind, now);

    if (this.fallbackMode) void this.playFallback(kind);
    else if (this.context?.state === "running") this.emitWebAudio(kind);
    else void this.playFallback(kind);
  }

  getStatus(): AudioStatus {
    if (!this.enabled) return "muted";
    return this.activated ? "ready" : "inactive";
  }

  private async unlock(): Promise<boolean> {
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }
    return context.state === "running";
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.context) {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return undefined;
      this.context = new AudioContextClass({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  private emitWebAudio(kind: SoundKind, ignoreCooldown = false): void {
    if (!this.context || !this.master || this.context.state !== "running") return;
    const definition = SOUNDS[kind];
    const start = this.context.currentTime + 0.015;
    definition.frequencies.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const noteStart = start + index * 0.1;
      oscillator.type = definition.type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(definition.volume, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + definition.duration);
      oscillator.connect(gain).connect(this.master!);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + definition.duration + 0.03);
    });
    if (ignoreCooldown) this.lastPlayed.delete(kind);
  }

  private async playFallback(kind: SoundKind): Promise<boolean> {
    const url = this.fallback.get(kind);
    if (!url) return false;
    const audio = new Audio(url);
    audio.volume = 1;
    this.activeFallbacks.add(audio);
    audio.addEventListener("ended", () => this.activeFallbacks.delete(audio), { once: true });
    audio.addEventListener("error", () => this.activeFallbacks.delete(audio), { once: true });
    try {
      await audio.play();
      return true;
    } catch {
      this.activeFallbacks.delete(audio);
      return false;
    }
  }

  private createWavUrl(definition: ToneDefinition): string {
    const sampleRate = 22050;
    const noteGap = 0.1;
    const totalDuration = definition.duration + Math.max(0, definition.frequencies.length - 1) * noteGap;
    const sampleCount = Math.ceil(sampleRate * totalDuration);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const write = (offset: number, value: string): void => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };
    write(0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    write(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, "data");
    view.setUint32(40, sampleCount * 2, true);

    for (let sample = 0; sample < sampleCount; sample += 1) {
      const time = sample / sampleRate;
      let value = 0;
      definition.frequencies.forEach((frequency, index) => {
        const localTime = time - index * noteGap;
        if (localTime < 0 || localTime > definition.duration) return;
        const envelope = Math.sin((localTime / definition.duration) * Math.PI);
        value += Math.sin(localTime * frequency * Math.PI * 2) * envelope;
      });
      value = Math.max(-1, Math.min(1, value * definition.volume * 2.8));
      view.setInt16(44 + sample * 2, value * 0x7fff, true);
    }
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  }

  private report(status: AudioStatus): void {
    this.statusChanged?.(status);
  }
}
