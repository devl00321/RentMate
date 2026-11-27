import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAuthInput,
  validatePhoneInput,
  validateProfileInput,
  validateListingInput,
} from '../../src/domain/validators.js';

test('validateAuthInput enforces mode-specific fields', () => {
  const signinBad = validateAuthInput('signin', { email: 'bad', password: '123' });
  assert.ok(signinBad.email);
  assert.ok(signinBad.password);

  const resetOk = validateAuthInput('reset', { email: 'asha@example.com' });
  assert.deepEqual(resetOk, {});

  const signupBad = validateAuthInput('signup', { email: 'a@b.co', password: 'secret', name: 'A', city: '' });
  assert.ok(signupBad.name);
  assert.ok(signupBad.city);
});

test('validatePhoneInput enforces E.164 and 6-digit OTP', () => {
  assert.ok(validatePhoneInput('9876543210').phone);
  assert.deepEqual(validatePhoneInput('+91 98765-43210'), {});
  assert.ok(validatePhoneInput('+919876543210', '12345', true).otp);
  assert.deepEqual(validatePhoneInput('+919876543210', '654321', true), {});
});

test('validateProfileInput and validateListingInput check bounds', () => {
  assert.ok(validateProfileInput({ name: 'A', city: 'Pune', photoUrl: 'http://bad' }).photoUrl);
  assert.deepEqual(validateProfileInput({ name: 'Asha', city: 'Pune', photoUrl: 'https://cdn/a.jpg' }), {});

  const badListing = validateListingInput({
    title: 'Hi',
    description: 'short',
    category: '',
    city: 'P',
    dailyPaise: 50,
    depositPaise: -1,
  });
  assert.equal(Object.keys(badListing).length, 6);
});
