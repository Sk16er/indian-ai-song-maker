/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { svg, css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/** Maps prompt weight to halo size. */
const MIN_HALO_SCALE = 1;
const MAX_HALO_SCALE = 2;

/** The amount of scale to add to the halo based on audio level. */
const HALO_LEVEL_MODIFIER = 1;

/** A knob for adjusting and visualizing prompt weight. */
@customElement('weight-knob')
export class WeightKnob extends LitElement {
  static override styles = css`
    :host {
      cursor: grab;
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      flex-shrink: 0;
      touch-action: none;
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    #halo {
      position: absolute;
      z-index: -1;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      mix-blend-mode: color-dodge;
      transform: scale(2);
      will-change: transform, background;
      filter: blur(5px);
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: String }) color = '#000';
  @property({ type: Number }) audioLevel = 0;

  private dragStartPos = 0;
  private dragStartValue = 0;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.dragStartPos = e.clientY;
    this.dragStartValue = this.value;
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerMove(e: PointerEvent) {
    const delta = this.dragStartPos - e.clientY;
    this.value = this.dragStartValue + delta * 0.01;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private handlePointerUp() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.body.classList.remove('dragging');
  }

  private handleWheel(e: WheelEvent) {
    const delta = e.deltaY;
    this.value = this.value + delta * -0.0025;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private describeArc(
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string {
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

    return (
      `M ${startX} ${startY}` +
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    );
  }

  override render() {
    const rotationRange = Math.PI * 2 * 0.75;
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    const rot = minRot + (this.value / 2) * (maxRot - minRot);
    const dotStyle = styleMap({
      transform: `translate(40px, 40px) rotate(${rot}rad)`,
    });

    let scale = (this.value / 2) * (MAX_HALO_SCALE - MIN_HALO_SCALE);
    scale += MIN_HALO_SCALE;
    scale += this.audioLevel * HALO_LEVEL_MODIFIER;

    const haloStyle = styleMap({
      display: this.value > 0 ? 'block' : 'none',
      background: `radial-gradient(circle, ${this.color} 0%, ${this.color}80 30%, ${this.color}40 60%, ${this.color}00 80%)`,
      transform: `scale(${scale})`,
    });

    return html`
      <div id="halo" style=${haloStyle}></div>
      <svg
        viewBox="0 0 80 80"
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleWheel}>
        ${this.renderStaticSvg()}
        <!-- Moving parts -->
        <g>
            <path
            d=${this.describeArc(40, 40, minRot, rot, 35)}
            fill="none"
            stroke=${this.color}
            stroke-width="4"
            stroke-linecap="round" />
            <g style=${dotStyle}>
                <circle cx="35" cy="0" r="3" fill="#FFD700" stroke="black" stroke-width="0.5" />
            </g>
        </g>
      </svg>
    `;
  }
  
  private renderStaticSvg() { 
    const rotationRange = Math.PI * 2 * 0.75;
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    
    return svg`
        <defs>
            <radialGradient id="knob-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fff" />
                <stop offset="85%" stop-color="#ddd" />
                <stop offset="100%" stop-color="#aaa" />
            </radialGradient>
            <filter id="knob-inner-shadow">
                <feOffset dx="0" dy="1" />
                <feGaussianBlur stdDeviation="1" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood flood-color="black" flood-opacity="0.4" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>
        </defs>

        <!-- Base knob -->
        <circle cx="40" cy="40" r="32" fill="url(#knob-grad)" filter="url(#knob-inner-shadow)" />
        
        <!-- Mandala/Tabla pattern -->
        <g fill="none" stroke="#593a1a" stroke-width="0.5">
            ${[...Array(16)].map((_, i) => svg`
                <path d="M 40 40 L ${40 + 32 * Math.cos(i * Math.PI / 8)} ${40 + 32 * Math.sin(i * Math.PI / 8)}" />
            `)}
            <circle cx="40" cy="40" r="22" />
            <circle cx="40" cy="40" r="12" />
        </g>
        
        <!-- Black center -->
        <circle cx="40" cy="40" r="10" fill="#222" />
        <path
          d=${this.describeArc(40, 40, minRot, maxRot, 35)}
          fill="none"
          stroke="#0003"
          stroke-width="4"
          stroke-linecap="round" />
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'weight-knob': WeightKnob;
  }
}