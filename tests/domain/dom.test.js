import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, html, raw, renderHtml, formatPaise } from '../../src/components/dom.js';

test('escapeHtml escapes XSS payloads', () => {
  const payload = `<script>alert("xss")</script>'&`;
  assert.equal(
    escapeHtml(payload),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&#39;&amp;',
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(false), '');
});

test('html template escapes user input by default', () => {
  const userInput = '<img src=x onerror=alert(1)>';
  const out = html`<p class="name">${userInput}</p>`;
  assert.equal(
    out.toString(),
    '<p class="name">&lt;img src=x onerror=alert(1)&gt;</p>',
  );
});

test('html template supports nested SafeHtml and arrays without double escaping', () => {
  const items = ['<a & b>', 'Camera'];
  const list = html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;
  assert.equal(list.toString(), '<ul><li>&lt;a &amp; b&gt;</li><li>Camera</li></ul>');

  const trusted = raw('<strong>Bold</strong>');
  assert.equal(html`<div>${trusted}</div>`.toString(), '<div><strong>Bold</strong></div>');
});

test('renderHtml rejects plain strings', () => {
  const fakeEl = { innerHTML: '' };
  assert.throws(() => renderHtml(fakeEl, '<script>evil()</script>'), TypeError);
  renderHtml(fakeEl, html`<span>${'<safe>'}</span>`);
  assert.equal(fakeEl.innerHTML, '<span>&lt;safe&gt;</span>');
});

test('formatPaise formats Indian rupee grouping', () => {
  assert.equal(formatPaise(120000), '₹1,200');
  assert.equal(formatPaise(1031000), '₹10,310');
  assert.equal(formatPaise(0), '₹0');
});
