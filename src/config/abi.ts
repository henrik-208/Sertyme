import type { Abi } from 'viem';
import { ARC_EXPLORER_URL } from './chain';

export const erc20Abi = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const sertymeAbi = [
  {
    type: 'function',
    name: 'createDeposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'landlord', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'rentalEnd', type: 'uint64' },
      { name: 'claimWindow', type: 'uint64' },
    ],
    outputs: [{ name: 'depositId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'submitClaim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositId', type: 'uint256' },
      { name: 'claimAmount', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'acceptClaim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'depositId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'disputeClaim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'releaseDeposit',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'depositId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resolveDispute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositId', type: 'uint256' },
      { name: 'landlordAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getDeposit',
    stateMutability: 'view',
    inputs: [{ name: 'depositId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'tenant', type: 'address' },
          { name: 'landlord', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'createdAt', type: 'uint64' },
          { name: 'rentalEnd', type: 'uint64' },
          { name: 'claimWindow', type: 'uint64' },
          { name: 'status', type: 'uint8' },
          { name: 'claimAmount', type: 'uint256' },
          { name: 'claimReason', type: 'string' },
          { name: 'disputeReason', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getDepositsByTenant',
    stateMutability: 'view',
    inputs: [{ name: 'tenant', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getDepositsByLandlord',
    stateMutability: 'view',
    inputs: [{ name: 'landlord', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getPlatformStats',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalDeposits', type: 'uint256' },
      { name: 'activeDeposits', type: 'uint256' },
      { name: 'releasedDeposits', type: 'uint256' },
      { name: 'disputedDeposits', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'arbiter',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'depositCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'DepositCreated',
    inputs: [
      { name: 'depositId', type: 'uint256', indexed: true },
      { name: 'tenant', type: 'address', indexed: true },
      { name: 'landlord', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'rentalEnd', type: 'uint64', indexed: false },
      { name: 'claimWindow', type: 'uint64', indexed: false },
    ],
  },
] as const;

export async function fetchVerifiedAbi(contractAddress: string): Promise<Abi | null> {
  try {
    const url = `${ARC_EXPLORER_URL}/api?module=contract&action=getabi&address=${contractAddress}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; result?: string };
    if (data.status !== '1' || !data.result) return null;
    const parsed = JSON.parse(data.result) as Abi;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
