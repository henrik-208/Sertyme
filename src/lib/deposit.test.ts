import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DepositStatus,
  deriveDepositPhase,
  filterDepositsByCategory,
  formatCountdown,
  formatTokenAmount,
  getViewerRole,
  parseTokenInput,
  truncateAddress,
  validateClaimForm,
  validateLockForm,
  validateResolveForm,
  type DepositRecord,
} from './deposit';

const TENANT = '0x1111111111111111111111111111111111111111' as const;
const LANDLORD = '0x2222222222222222222222222222222222222222' as const;
const ARBITER = '0x3333333333333333333333333333333333333333' as const;
const OTHER = '0x4444444444444444444444444444444444444444' as const;
const USDC = '0x3600000000000000000000000000000000000000' as const;

function makeDeposit(overrides: Partial<DepositRecord> = {}): DepositRecord {
  return {
    id: 1n,
    tenant: TENANT,
    landlord: LANDLORD,
    token: USDC,
    amount: 1_500_000_000n, // 1,500 USDC (6 decimals)
    createdAt: 1_700_000_000n,
    rentalEnd: 1_700_100_000n,
    claimWindow: 604_800n, // 7 days
    status: DepositStatus.Active,
    claimAmount: 0n,
    claimReason: '',
    disputeReason: '',
    ...overrides,
  };
}

test('deriveDepositPhase transitions across rental, claim window, and releasable', () => {
  const deposit = makeDeposit();
  assert.equal(deriveDepositPhase(deposit, 1_700_050_000), 'locked');
  assert.equal(deriveDepositPhase(deposit, 1_700_100_000), 'claim_window');
  assert.equal(deriveDepositPhase(deposit, 1_700_704_800), 'claim_window');
  assert.equal(deriveDepositPhase(deposit, 1_700_704_801), 'releasable');
});

test('deriveDepositPhase respects explicit contract statuses', () => {
  assert.equal(deriveDepositPhase(makeDeposit({ status: DepositStatus.Claimed }), 1_700_200_000), 'claimed');
  assert.equal(deriveDepositPhase(makeDeposit({ status: DepositStatus.Disputed }), 1_700_200_000), 'disputed');
  assert.equal(deriveDepositPhase(makeDeposit({ status: DepositStatus.Released }), 1_700_200_000), 'released');
  assert.equal(deriveDepositPhase(makeDeposit({ status: DepositStatus.Resolved }), 1_700_200_000), 'resolved');
});

test('getViewerRole identifies tenant, landlord, arbiter, and observer', () => {
  const deposit = makeDeposit();
  assert.equal(getViewerRole(deposit, TENANT, ARBITER), 'tenant');
  assert.equal(getViewerRole(deposit, LANDLORD, ARBITER), 'landlord');
  assert.equal(getViewerRole(deposit, ARBITER, ARBITER), 'arbiter');
  assert.equal(getViewerRole(deposit, OTHER, ARBITER), 'observer');
  assert.equal(getViewerRole(deposit, undefined, ARBITER), 'observer');
});

test('formatTokenAmount and parseTokenInput handle arbitrary token decimals', () => {
  assert.equal(formatTokenAmount(1_500_250_000n, 6), '1,500.25');
  assert.equal(formatTokenAmount(2_000_000_000n, 6), '2,000');
  assert.equal(formatTokenAmount(1_250_000_000_000_000_000n, 18), '1.25');

  assert.equal(parseTokenInput('1500.25', 6), 1_500_250_000n);
  assert.equal(parseTokenInput('0', 6), null);
  assert.equal(parseTokenInput('-10', 6), null);
  assert.equal(parseTokenInput('abc', 6), null);
});

test('formatCountdown formats remaining days, hours, minutes, and closed state', () => {
  assert.equal(formatCountdown(1_700_200_000n, 1_700_200_000), 'Closed');
  assert.equal(formatCountdown(1_700_200_000n, 1_700_200_000 - 90_000), '1d 1h remaining');
  assert.equal(formatCountdown(1_700_200_000n, 1_700_200_000 - 7_500), '2h 5m remaining');
  assert.equal(formatCountdown(1_700_200_000n, 1_700_200_000 - 300), '5m remaining');
});

test('truncateAddress shortens hex addresses cleanly', () => {
  assert.equal(truncateAddress(USDC), '0x3600…0000');
});

test('validateLockForm rejects self-deposit, insufficient balance, and past end dates', () => {
  const now = 1_700_000_000;
  const selfResult = validateLockForm({
    landlord: TENANT,
    tenant: TENANT,
    amount: '100',
    decimals: 6,
    balance: 500_000_000n,
    rentalEndSeconds: now + 86_400,
    claimWindowSeconds: 604_800,
    nowSeconds: now,
  });
  assert.equal(selfResult.valid, false);
  assert.ok(selfResult.errors.landlord);

  const balanceResult = validateLockForm({
    landlord: LANDLORD,
    tenant: TENANT,
    amount: '600',
    decimals: 6,
    balance: 500_000_000n,
    rentalEndSeconds: now + 86_400,
    claimWindowSeconds: 604_800,
    nowSeconds: now,
  });
  assert.equal(balanceResult.valid, false);
  assert.ok(balanceResult.errors.amount);

  const okResult = validateLockForm({
    landlord: LANDLORD,
    tenant: TENANT,
    amount: '250.5',
    decimals: 6,
    balance: 500_000_000n,
    rentalEndSeconds: now + 86_400,
    claimWindowSeconds: 604_800,
    nowSeconds: now,
  });
  assert.equal(okResult.valid, true);
});

test('validateClaimForm prevents claims larger than the locked deposit', () => {
  const tooLarge = validateClaimForm({
    claimAmountInput: '2000',
    depositAmount: 1_500_000_000n,
    decimals: 6,
    reason: 'Broken kitchen window',
  });
  assert.equal(tooLarge.valid, false);

  const valid = validateClaimForm({
    claimAmountInput: '350',
    depositAmount: 1_500_000_000n,
    decimals: 6,
    reason: 'Broken kitchen window',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.parsedAmount, 350_000_000n);
});

test('validateResolveForm allows zero payout to landlord (full refund to tenant) up to deposit amount', () => {
  const fullRefund = validateResolveForm({
    landlordAmountInput: '0',
    depositAmount: 1_500_000_000n,
    decimals: 6,
  });
  assert.equal(fullRefund.valid, true);
  assert.equal(fullRefund.parsedAmount, 0n);

  const tooHigh = validateResolveForm({
    landlordAmountInput: '1501',
    depositAmount: 1_500_000_000n,
    decimals: 6,
  });
  assert.equal(tooHigh.valid, false);
});

test('filterDepositsByCategory filters deposits by derived phase', () => {
  const now = 1_700_200_000;
  const list: DepositRecord[] = [
    makeDeposit({ id: 1n, rentalEnd: 1_700_500_000n }), // locked
    makeDeposit({ id: 2n, rentalEnd: 1_700_100_000n }), // claim_window
    makeDeposit({ id: 3n, status: DepositStatus.Claimed }),
    makeDeposit({ id: 4n, status: DepositStatus.Disputed }),
    makeDeposit({ id: 5n, status: DepositStatus.Released }),
  ];

  assert.equal(filterDepositsByCategory(list, 'all', now).length, 5);
  assert.equal(filterDepositsByCategory(list, 'locked', now).length, 1);
  assert.equal(filterDepositsByCategory(list, 'claim_window', now).length, 1);
  assert.equal(filterDepositsByCategory(list, 'claimed', now).length, 1);
  assert.equal(filterDepositsByCategory(list, 'disputed', now).length, 1);
  assert.equal(filterDepositsByCategory(list, 'settled', now).length, 1);
});
