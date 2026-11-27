import test from 'node:test';
import assert from 'node:assert/strict';
import { FEE_RATE } from '../../src/config/constants.js';
import { calculateBookingPricing, roundHalfUp } from '../../src/domain/pricing.js';

test('roundHalfUp rounds .5 upward cleanly', () => {
  assert.equal(roundHalfUp(10.5), 11);
  assert.equal(roundHalfUp(10.49), 10);
  assert.equal(roundHalfUp(0.5), 1);
  assert.equal(roundHalfUp(0), 0);
});

test('calculateBookingPricing passes table-driven edge cases', () => {
  const cases = [
    {
      name: '1 day with deposit',
      input: { dailyPaise: 120000, depositPaise: 800000, days: 1 },
      expected: { rental: 120000, fee: 6000, deposit: 800000, renterPays: 926000, ownerGets: 120000 },
    },
    {
      name: '7 days weekly rental',
      input: { dailyPaise: 45000, depositPaise: 150000, days: 7 },
      expected: { rental: 315000, fee: 15750, deposit: 150000, renterPays: 480750, ownerGets: 315000 },
    },
    {
      name: 'zero deposit',
      input: { dailyPaise: 20000, depositPaise: 0, days: 3 },
      expected: { rental: 60000, fee: 3000, deposit: 0, renterPays: 63000, ownerGets: 60000 },
    },
    {
      name: 'half-up rounding edge (10 paise * 0.05 = 0.5 -> 1 paise)',
      input: { dailyPaise: 10, depositPaise: 0, days: 1, feeRate: 0.05 },
      expected: { rental: 10, fee: 1, deposit: 0, renterPays: 11, ownerGets: 10 },
    },
    {
      name: 'large value (80,000-rupee camera deposit + 5 days)',
      input: { dailyPaise: 250000, depositPaise: 8000000, days: 5 },
      expected: { rental: 1250000, fee: 62500, deposit: 8000000, renterPays: 9312500, ownerGets: 1250000 },
    },
  ];

  assert.equal(FEE_RATE, 0.05);
  for (const tc of cases) {
    const out = calculateBookingPricing(tc.input);
    assert.deepEqual(
      {
        rental: out.rental,
        fee: out.fee,
        deposit: out.deposit,
        renterPays: out.renterPays,
        ownerGets: out.ownerGets,
      },
      tc.expected,
      tc.name,
    );
  }
});

test('calculateBookingPricing rejects invalid negative or zero days inputs', () => {
  assert.throws(() => calculateBookingPricing({ dailyPaise: 100, depositPaise: 0, days: 0 }), RangeError);
  assert.throws(() => calculateBookingPricing({ dailyPaise: -1, depositPaise: 0, days: 1 }), RangeError);
  assert.throws(() => calculateBookingPricing({ dailyPaise: 100.5, depositPaise: 0, days: 1 }), RangeError);
});
