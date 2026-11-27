/**
 * Multi-step progress stepper component (used in the 4-step listing editor).
 */
import { html, raw } from './dom.js';

/**
 * Render an accessible horizontal step list.
 * @param {readonly string[]} steps
 * @param {number} currentStep - 1-based current step
 * @returns {ReturnType<typeof html>}
 */
export function stepper(steps, currentStep) {
  return html`
    <ol class="stepper" aria-label="Form progress">
      ${steps.map((label, idx) => {
        const num = idx + 1;
        const cls = num < currentStep ? 'is-done' : num === currentStep ? 'is-current' : '';
        const curr = num === currentStep ? raw(' aria-current="step"') : '';
        return html`<li class="${cls}"${curr}><span class="stepper__num">${num}</span><span>${label}</span></li>`;
      })}
    </ol>
  `;
}
