import { defineChain, isAddress, type Address } from 'viem';

export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARC_RPC_URL) ||
  'https://rpc.testnet.arc.network';
export const ARC_EXPLORER_URL = 'https://testnet.arcscan.app';

export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: ARC_EXPLORER_URL,
    },
  },
});

export interface SupportedToken {
  symbol: 'USDC' | 'EURC';
  name: string;
  address: Address;
  fallbackDecimals: number;
}

export const SUPPORTED_TOKENS: readonly SupportedToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
    fallbackDecimals: 6,
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    fallbackDecimals: 6,
  },
] as const;

export function getTokenByAddress(address?: string): SupportedToken | undefined {
  if (!address) return undefined;
  const normalized = address.toLowerCase();
  return SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === normalized);
}

const rawContractAddress =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTRACT_ADDRESS) || '';
const rawAdminWallet =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_WALLET) || '';
const rawWalletConnectId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) || '';

export const CONTRACT_ADDRESS: Address | undefined = isAddress(rawContractAddress)
  ? (rawContractAddress as Address)
  : undefined;

export const ADMIN_WALLET: Address | undefined = isAddress(rawAdminWallet)
  ? (rawAdminWallet as Address)
  : undefined;

export const hasWalletConnectId: boolean = Boolean(
  rawWalletConnectId && !rawWalletConnectId.startsWith('[') && rawWalletConnectId.length >= 16
);

export const WALLETCONNECT_PROJECT_ID: string = hasWalletConnectId
  ? rawWalletConnectId
  : '00000000000000000000000000000000';

export const isContractConfigured = Boolean(CONTRACT_ADDRESS);

export function getExplorerTxUrl(hash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}
