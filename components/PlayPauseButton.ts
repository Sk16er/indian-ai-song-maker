/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { svg, css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlaybackState } from '../types';

@customElement('play-pause-button')
export class PlayPauseButton extends LitElement {

  @property({ type: String }) playbackState: PlaybackState = 'stopped';

  static override styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    :host(:hover) svg {
      transform: scale(1.1);
    }
    svg {
      width: 100%;
      height: 100%;
      transition: transform 0.3s ease-in-out;
    }
    .hitbox {
      pointer-events: all;
      position: absolute;
      width: 80%;
      aspect-ratio: 1;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      cursor: pointer;
    }
    .loader {
      stroke: #ffd700;
      stroke-width: 3;
      stroke-linecap: round;
      animation: spin linear 1.5s infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(359deg); }
    }
  `;

  private renderSvg() {
    return html` <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tabla-wood" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#8c5a2b" />
            <stop offset="80%" stop-color="#593a1a" />
            <stop offset="100%" stop-color="#3b2610" />
        </radialGradient>
        <radialGradient id="tabla-skin" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fdf5e6" />
            <stop offset="100%" stop-color="#e8d9c0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
          <feOffset in="blur" dx="3" dy="5" result="offsetBlur"/>
          <feFlood flood-color="#000" flood-opacity="0.5" result="offsetColor"/>
          <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#drop-shadow)">
        <!-- Outer wood ring -->
        <circle cx="70" cy="70" r="65" fill="url(#tabla-wood)" />
        <!-- Straps -->
        ${[...Array(16)].map((_, i) => svg`<line 
            x1="70" y1="70" 
            x2="${70 + 65 * Math.cos(i * Math.PI / 8)}" 
            y2="${70 + 65 * Math.sin(i * Math.PI / 8)}" 
            stroke="#4a2a0b" stroke-width="6" />`)}
        <!-- Inner skin -->
        <circle cx="70" cy="70" r="50" fill="url(#tabla-skin)" stroke="#804a1f" stroke-width="3"/>
        <!-- Syahi (black spot) -->
        <circle cx="70" cy="70" r="25" fill="#333" />
        <circle cx="70" cy="70" r="23" fill="#1a1a1a" />
      </g>
      <g style="transform-origin: center; transform-box: fill-box;" filter="url(#glow)">
        ${this.renderIcon()}
      </g>
    </svg>`;
  }

  private renderPause() {
    return svg`<g fill="#FFD700" stroke="#eda900" stroke-width="1.5">
      <rect x="58" y="58" width="9" height="24" rx="2"></rect>
      <rect x="73" y="58" width="9" height="24" rx="2"></rect>
    </g>`;
  }

  private renderPlay() {
    return svg`<path d="M63 82V58L85 70L63 82Z" fill="#FFD700" stroke="#eda900" stroke-width="1.5" />`;
  }

  private renderLoading() {
    return svg`<path class="loader" fill="none" stroke="#FFD700" stroke-width="4" stroke-linecap="round"
        d="M 95,70 A 25,25 0 0 1 70,95"
      />`;
  }

  private renderIcon() {
    if (this.playbackState === 'playing') {
      return this.renderPause();
    } else if (this.playbackState === 'loading') {
      return this.renderLoading();
    } else {
      return this.renderPlay();
    }
  }

  override render() {
    return html`${this.renderSvg()}<div class="hitbox"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'play-pause-button': PlayPauseButton
  }
}