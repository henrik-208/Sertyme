import { formatUnits, isAddress, parseUnits } from 'viem';

export enum DepositStatus {
  Active = 0,
  Claimed = 1,
  Disputed = 2,
  Released = 3,
  Resolved = 4,
}

export interface DepositRecord {
  id: bigint;
  tenant: `0x${string}`;
  landlord: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  rentalEnd: bigint;
  claimWindow: bigint;
  status: DepositStatus;
  claimAmount: bigint;
  claimReason: string;
  disputeReason: string;
}

export interface PlatformStats {
  totalDeposits: bigint;
  activeDeposits: bigint;
  releasedDeposits: bigint;
  disputedDeposits: bigint;
}

export type DepositPhase =
  | 'locked'
  | 'claim_window'
  | 'releasable'
  | 'claimed'
  | 'disputed'
  | 'released'
  | 'resolved';

export type ViewerRole = 'tenant' | 'landlord' | 'arbiter' | 'observer';

export type DepositFilter =
  | 'all'
  | 'locked'
  | 'claim_window'
  | 'claimed'
  | 'disputed'
  | 'settled';

export function getClaimWindowEnd(deposit: Pick<DepositRecord, 'rentalEnd' | 'claimWindow'>): bigint {
  return deposit.rentalEnd + deposit.claimWindow;
}

export function deriveDepositPhase(
  deposit: Pick<DepositRecord, 'status' | 'rentalEnd' | 'claimWindow'>,
  nowSeconds: number
): DepositPhase {
  if (deposit.status === DepositStatus.Released) return 'released';
  if (deposit.status === DepositStatus.Resolved) return 'resolved';
  if (deposit.status === DepositStatus.Disputed) return 'disputed';
  if (deposit.status === DepositStatus.Claimed) return 'claimed';

  const now = BigInt(Math.floor(nowSeconds));
  const claimEnd = getClaimWindowEnd(deposit);

  if (now < deposit.rentalEnd) {
    return 'locked';
  }
  if (now <= claimEnd) {
    return 'claim_window';
  }
  return 'releasable';
}

export function getPhaseLabel(phase: DepositPhase): string {
  switch (phase) {
    case 'locked':
      return 'Held during rental';
    case 'claim_window':
      return 'Claim window open';
    case 'releasable':
      return 'Ready for release';
    case 'claimed':
      return 'Claim submitted';
    case 'disputed':
      return 'Under dispute';
    case 'released':
      return 'Released to tenant';
    case 'resolved':
      return 'Resolved by arbiter';
  }
}

export function getViewerRole(
  deposit: Pick<DepositRecord, 'tenant' | 'landlord'>,
  walletAddress?: string,
  arbiterAddress?: string
): ViewerRole {
  if (!walletAddress) return 'observer';
  const wallet = walletAddress.toLowerCase();
  if (deposit.tenant.toLowerCase() === wallet) return 'tenant';
  if (deposit.landlord.toLowerCase() === wallet) return 'landlord';
  if (arbiterAddress && arbiterAddress.toLowerCase() === wallet) return 'arbiter';
  return 'observer';
}

export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  maxFractionDigits = 2
): string {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ''] = formatted.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!fraction || maxFractionDigits <= 0) {
    return withCommas;
  }
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  return trimmed.length > 0 ? `${withCommas}.${trimmed}` : withCommas;
}

export function parseTokenInput(value: string, decimals: number): bigint | null {
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  try {
    const parsed = parseUnits(cleaned, decimals);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length <= start + end + 2) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

export function formatDateShort(timestampSeconds: bigint | number): string {
  const ms = Number(timestampSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ms));
}

export function formatDateTime(timestampSeconds: bigint | number): string {
  const ms = Number(timestampSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function formatCountdown(targetSeconds: bigint | number, nowSeconds: number): string {
  const diff = Number(targetSeconds) - Math.floor(nowSeconds);
  if (diff <= 0) return 'Closed';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${Math.max(1, minutes)}m remaining`;
}

export interface LockFormValidation {
  valid: boolean;
  errors: {
    landlord?: string;
    amount?: string;
    rentalEnd?: string;
    claimWindow?: string;
  };
}

export function validateLockForm(params: {
  landlord: string;
  tenant?: string;
  amount: string;
  decimals: number;
  balance?: bigint;
  rentalEndSeconds: number | null;
  claimWindowSeconds: number;
  nowSeconds: number;
}): LockFormValidation {
  const errors: LockFormValidation['errors'] = {};

  if (!params.landlord.trim() || !isAddress(params.landlord.trim())) {
    errors.landlord = 'Enter a valid landlord wallet address.';
  } else if (
    params.tenant &&
    params.landlord.trim().toLowerCase() === params.tenant.toLowerCase()
  ) {
    errors.landlord = 'Landlord address must be different from your wallet.';
  }

  const parsedAmount = parseTokenInput(params.amount, params.decimals);
  if (!parsedAmount) {
    errors.amount = 'Enter a deposit amount greater than zero.';
  } else if (params.balance !== undefined && parsedAmount > params.balance) {
    errors.amount = 'Amount exceeds your available token balance.';
  }

  if (!params.rentalEndSeconds || params.rentalEndSeconds <= params.nowSeconds + 60) {
    errors.rentalEnd = 'Rental end date must be in the future.';
  }

  if (!Number.isFinite(params.claimWindowSeconds) || params.claimWindowSeconds < 3600) {
    errors.claimWindow = 'Claim window must be at least 1 hour.';
  } else if (params.claimWindowSeconds > 90 * 86400) {
    errors.claimWindow = 'Claim window cannot exceed 90 days.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateClaimForm(params: {
  claimAmountInput: string;
  depositAmount: bigint;
  decimals: number;
  reason: string;
}): { valid: boolean; error?: string; parsedAmount?: bigint } {
  const parsed = parseTokenInput(params.claimAmountInput, params.decimals);
  if (!parsed) {
    return { valid: false, error: 'Enter a valid claim amount greater than zero.' };
  }
  if (parsed > params.depositAmount) {
    return { valid: false, error: 'A claim cannot be larger than the locked deposit.' };
  }
  if (params.reason.trim().length < 5) {
    return { valid: false, error: 'Provide a clear reason for the claim (at least 5 characters).' };
  }
  return { valid: true, parsedAmount: parsed };
}

export function validateResolveForm(params: {
  landlordAmountInput: string;
  depositAmount: bigint;
  decimals: number;
}): { valid: boolean; error?: string; parsedAmount?: bigint } {
  const cleaned = params.landlordAmountInput.trim().replace(/,/g, '');
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) {
    return { valid: false, error: 'Enter a valid payout amount for the landlord (0 or more).' };
  }
  try {
    const parsed = parseUnits(cleaned, params.decimals);
    if (parsed < 0n || parsed > params.depositAmount) {
      return { valid: false, error: 'Landlord payout cannot exceed the deposit amount.' };
    }
    return { valid: true, parsedAmount: parsed };
  } catch {
    return { valid: false, error: 'Invalid token amount format.' };
  }
}

export function filterDepositsByCategory(
  deposits: DepositRecord[],
  filter: DepositFilter,
  nowSeconds: number
): DepositRecord[] {
  if (filter === 'all') return deposits;
  return deposits.filter((deposit) => {
    const phase = deriveDepositPhase(deposit, nowSeconds);
    if (filter === 'locked') return phase === 'locked';
    if (filter === 'claim_window') return phase === 'claim_window' || phase === 'releasable';
    if (filter === 'claimed') return phase === 'claimed';
    if (filter === 'disputed') return phase === 'disputed';
    if (filter === 'settled') return phase === 'released' || phase === 'resolved';
    return true;
  });
}
