/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1alpha' });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi(initialPrompts);
  document.body.appendChild(pdjMidi);

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Pick 3 random prompts to start at weight = 1
  const startOn = [...DEFAULT_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, nativeText, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      nativeText,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  { color: '#ff9933', text: 'Desi Dhol', nativeText: 'देसी ढोल' },
  { color: '#f9c200', text: 'Bollywood Retro', nativeText: 'बॉलीवुड रेट्रो' },
  { color: '#e52b50', text: 'Sufi Soul', nativeText: 'सूफी सोल' },
  { color: '#50c878', text: 'Carnatic Chill', nativeText: 'कर्नाटक चिल' },
  { color: '#ffdf00', text: 'Indo-Fusion', nativeText: 'इंडो-फ्यूजन' },
  { color: '#138808', text: 'Raga Flow', nativeText: 'राग प्रवाह' },
  { color: '#007fff', text: 'Tabla Trance', nativeText: 'तबला ट्रांस' },
  { color: '#ff7f50', text: 'Lotus Lounge', nativeText: 'लोटस लाउंज' },
  { color: '#c71585', text: 'Peacock Pop', nativeText: 'पीकॉक पॉप' },
  { color: '#e34234', text: 'Bhangra Bass', nativeText: 'भांगड़ा बास' },
  { color: '#000080', text: 'Bansuri Breeze', nativeText: 'बांसुरी ब्रीज़' },
  { color: '#8a2be2', text: 'Thumri Trap', nativeText: 'ठुमरी ट्रैप' },
  { color: '#ff6700', text: 'Ghazal Groove', nativeText: 'ग़ज़ल ग्रूव' },
  { color: '#40e0d0', text: 'Qawwali Quest', nativeText: 'क़व्वाली क्वेस्ट' },
  { color: '#daa520', text: 'Ghungroo Glitch', nativeText: 'घुंघरू ग्लिच' },
  { color: '#ffc0cb', text: 'Sitar Synths', nativeText: 'सितार सिंथ' },
];

main();