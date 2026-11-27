import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOtpDigits, renderOtpCells } from '../../src/components/otpInput.js';

test('parseOtpDigits extracts up to 6 digits', () => {
  assert.deepEqual(parseOtpDigits('65-43 21'), ['6', '5', '4', '3', '2', '1']);
  assert.deepEqual(parseOtpDigits('123456789'), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(parseOtpDigits('abc'), []);
});

test('renderOtpCells outputs 6 accessible cells', () => {
  const markup = renderOtpCells({ idPrefix: 'test-otp', error: 'Invalid code' }).toString();
  const matches = markup.match(/class="otp-cell"/g) || [];
  assert.equal(matches.length, 6);
  assert.ok(markup.includes('Digit 1 of 6'));
  assert.ok(markup.includes('Digit 6 of 6'));
  assert.ok(markup.includes('Invalid code'));
});
