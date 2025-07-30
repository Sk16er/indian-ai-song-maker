/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

const fabricPattern = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDIxNSwwLDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiPjxwYXRoIGQ9Ik0wIDUwIEMgMjUgMCAyNSAxMDAgNTAgNTAgUyA3NSAwIDEwMCA1MCIvPjxwYXRoIGQ9Ik0tNTAgNTBDLTc1IDAtNzUgMTAwIC0yNSA1MCBTIDAgMCA1MCA1MCIvPjxwYXRoIGQ9Ik01MCA1MEMyNSAxMDAgMjUgMjAwIDUwIDE1MFMgNzUgMTAwIDEwMCAxNTAiLz48cGF0aCBkPSJNMCAxMDBjMjUgMCAyNSAxMDAgNTAgMTAwczI1LTEwMCA1MC0xMDAiLz48L2c+PC9zdmc+';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }
    #background {
      will-change: background-image, filter;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #1a081c;
      background-blend-mode: color-dodge;
      filter: blur(15px) brightness(1.2);
      transform: scale(1.1);
      transition: filter 0.5s ease-out;
      animation: bg-pan 120s linear infinite;
    }
    @keyframes bg-pan {
      0% {
        background-position: 0% 0%;
      }
      100% {
        background-position: 100% 100%;
      }
    }
    #grid {
      width: 85vmin;
      height: 85vmin;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3.5vmin;
      margin-top: 6vmin;
    }
    prompt-controller {
      width: 100%;
    }
    play-pause-button {
      position: relative;
      width: 16vmin;
      min-width: 120px;
    }
    #buttons {
      position: absolute;
      top: 0;
      left: 0;
      padding: 1vmin;
      display: flex;
      gap: 1vmin;
    }
    button {
      font-family: 'Exo 2', sans-serif;
      font-weight: 600;
      cursor: pointer;
      color: #ffd700;
      background: #0003;
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid #ffd700;
      border-radius: 4px;
      user-select: none;
      padding: 0.5vmin 1vmin;
      &.active {
        background-color: #ffd700;
        color: #000;
      }
    }
    select {
      font: inherit;
      padding: 0.5vmin;
      background: #ffd700;
      color: #000;
      border-radius: 4px;
      border: none;
      outline: none;
      cursor: pointer;
    }
  `;

  private prompts: Map<string, Prompt>;
  private midiDispatcher: MidiDispatcher;
  private animationFrameId: number | null = null;

  @property({ type: Boolean }) private showMidi = false;
  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @state() public audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor(
    initialPrompts: Map<string, Prompt>,
  ) {
    super();
    this.prompts = initialPrompts;
    this.midiDispatcher = new MidiDispatcher();
  }
  
  override connectedCallback() {
    super.connectedCallback();
    this.startAnimation();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopAnimation();
  }

  private startAnimation() {
    const animate = () => {
      if ([...this.prompts.values()].some(p => p.weight > 0)) {
        this.requestUpdate();
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const { promptId, text, nativeText, weight, cc } = e.detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) {
      console.error('prompt not found', promptId);
      return;
    }

    prompt.text = text;
    prompt.nativeText = nativeText;
    prompt.weight = weight;
    prompt.cc = cc;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, prompt);

    this.prompts = newPrompts;

    this.dispatchEvent(
      new CustomEvent('prompts-changed', { detail: this.prompts }),
    );
  }

  /** Generates radial gradients for each prompt based on weight and color. */
  private readonly makeBackground = throttle(
    () => {
      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.9;

      const bg: string[] = [];
      const time = performance.now() / 8000;

      [...this.prompts.values()].forEach((p, i) => {
        if (p.weight <= 0) return;

        const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
        const alpha = Math.round(alphaPct * 0xff)
          .toString(16)
          .padStart(2, '0');

        const pulse = Math.sin(time + i * 0.5) * 0.1 + 0.95;
        const stop = (p.weight / 2) * pulse;
        const x = (i % 4) / 3;
        const y = Math.floor(i / 4) / 3;
        const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0%, ${p.color}00 ${stop * 100}%)`;

        bg.push(s);
      });

      return bg.join(', ');
    },
    30, // don't re-render more than once every XXms
  );

  private toggleShowMidi() {
    return this.setShowMidi(!this.showMidi);
  }

  public async setShowMidi(show: boolean) {
    this.showMidi = show;
    if (!this.showMidi) return;
    try {
      const inputIds = await this.midiDispatcher.getMidiAccess();
      this.midiInputIds = inputIds;
      this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
    } catch (e) {
      this.showMidi = false;
      this.dispatchEvent(new CustomEvent('error', {detail: e.message}));
    }
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  override render() {
    const bg = styleMap({
      backgroundImage: `${this.makeBackground()}, url(${fabricPattern})`,
    });
    return html`<div id="background" style=${bg}></div>
      <div id="buttons">
        <button
          @click=${this.toggleShowMidi}
          class=${this.showMidi ? 'active' : ''}
          >MIDI</button
        >
        <select
          @change=${this.handleMidiInputChange}
          .value=${this.activeMidiInputId || ''}
          style=${this.showMidi ? '' : 'visibility: hidden'}>
          ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id)}
                  </option>`,
        )
        : html`<option value="">No devices found</option>`}
        </select>
      </div>
      <div id="grid">${this.renderPrompts()}</div>
      <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>`;
  }

  private renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        nativeText=${prompt.nativeText}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}