import { useEffect, useMemo, useState } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { erc20Abi, sertymeAbi } from '../config/abi';
import {
  ADMIN_WALLET,
  CONTRACT_ADDRESS,
  arcChain,
  getTokenByAddress,
  isContractConfigured,
} from '../config/chain';
import { DepositStatus, type DepositRecord, type PlatformStats } from '../lib/deposit';

export function useNowSeconds(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function normalizeDeposit(raw: unknown): DepositRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.tenant !== 'string' || typeof d.landlord !== 'string') return null;
  if (d.tenant === '0x0000000000000000000000000000000000000000') return null;
  return {
    id: BigInt(d.id as bigint | number | string),
    tenant: d.tenant as Address,
    landlord: d.landlord as Address,
    token: d.token as Address,
    amount: BigInt(d.amount as bigint | number | string),
    createdAt: BigInt(d.createdAt as bigint | number | string),
    rentalEnd: BigInt(d.rentalEnd as bigint | number | string),
    claimWindow: BigInt(d.claimWindow as bigint | number | string),
    status: Number(d.status) as DepositStatus,
    claimAmount: BigInt(d.claimAmount as bigint | number | string),
    claimReason: String(d.claimReason ?? ''),
    disputeReason: String(d.disputeReason ?? ''),
  };
}

export function usePlatformStats() {
  const query = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: sertymeAbi,
    functionName: 'getPlatformStats',
    chainId: arcChain.id,
    query: {
      enabled: isContractConfigured,
      refetchInterval: 30_000,
    },
  });

  const stats: PlatformStats | null = useMemo(() => {
    if (!query.data) return null;
    const [totalDeposits, activeDeposits, releasedDeposits, disputedDeposits] = query.data;
    return {
      totalDeposits,
      activeDeposits,
      releasedDeposits,
      disputedDeposits,
    };
  }, [query.data]);

  return {
    stats,
    isLoading: isContractConfigured && query.isLoading,
    isError: isContractConfigured && query.isError,
    isConfigured: isContractConfigured,
    refetch: query.refetch,
  };
}

export function useArbiterAddress(): Address | undefined {
  const query = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: sertymeAbi,
    functionName: 'arbiter',
    chainId: arcChain.id,
    query: {
      enabled: isContractConfigured,
    },
  });

  return (query.data as Address | undefined) ?? ADMIN_WALLET;
}

export function useDepositsByRole(role: 'tenant' | 'landlord', walletAddress?: Address) {
  const functionName = role === 'tenant' ? 'getDepositsByTenant' : 'getDepositsByLandlord';
  const enabled = Boolean(isContractConfigured && CONTRACT_ADDRESS && walletAddress);

  const idsQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: sertymeAbi,
    functionName,
    args: walletAddress ? [walletAddress] : undefined,
    chainId: arcChain.id,
    query: {
      enabled,
      refetchInterval: 20_000,
    },
  });

  const depositIds = useMemo(() => {
    if (!idsQuery.data) return [];
    return [...idsQuery.data].reverse();
  }, [idsQuery.data]);

  const detailContracts = useMemo(() => {
    if (!CONTRACT_ADDRESS || depositIds.length === 0) return [];
    return depositIds.map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'getDeposit' as const,
      args: [id] as const,
      chainId: arcChain.id,
    }));
  }, [depositIds]);

  const detailsQuery = useReadContracts({
    contracts: detailContracts,
    query: {
      enabled: enabled && detailContracts.length > 0,
      refetchInterval: 20_000,
    },
  });

  const deposits = useMemo(() => {
    if (!detailsQuery.data) return [];
    const list: DepositRecord[] = [];
    for (const item of detailsQuery.data) {
      if (item.status === 'success') {
        const parsed = normalizeDeposit(item.result);
        if (parsed) list.push(parsed);
      }
    }
    return list;
  }, [detailsQuery.data]);

  return {
    deposits,
    isLoading: enabled && (idsQuery.isLoading || (depositIds.length > 0 && detailsQuery.isLoading)),
    isError: enabled && (idsQuery.isError || detailsQuery.isError),
    isConfigured: isContractConfigured,
    refetch: async () => {
      await idsQuery.refetch();
      await detailsQuery.refetch();
    },
  };
}

export function useDepositDetail(depositId?: bigint) {
  const enabled = Boolean(isContractConfigured && CONTRACT_ADDRESS && depositId !== undefined);

  const depositQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: sertymeAbi,
    functionName: 'getDeposit',
    args: depositId !== undefined ? [depositId] : undefined,
    chainId: arcChain.id,
    query: {
      enabled,
      refetchInterval: 15_000,
    },
  });

  const deposit = useMemo(() => normalizeDeposit(depositQuery.data), [depositQuery.data]);

  const tokenQuery = useReadContracts({
    contracts: deposit
      ? [
          {
            address: deposit.token,
            abi: erc20Abi,
            functionName: 'decimals' as const,
            chainId: arcChain.id,
          },
          {
            address: deposit.token,
            abi: erc20Abi,
            functionName: 'symbol' as const,
            chainId: arcChain.id,
          },
        ]
      : [],
    query: {
      enabled: Boolean(deposit),
    },
  });

  const knownToken = getTokenByAddress(deposit?.token);
  const decimals =
    tokenQuery.data?.[0]?.status === 'success'
      ? Number(tokenQuery.data[0].result)
      : knownToken?.fallbackDecimals ?? 6;
  const symbol =
    tokenQuery.data?.[1]?.status === 'success'
      ? String(tokenQuery.data[1].result)
      : knownToken?.symbol ?? 'TOKEN';

  return {
    deposit,
    decimals,
    symbol,
    isLoading: enabled && depositQuery.isLoading,
    isError: enabled && depositQuery.isError,
    isConfigured: isContractConfigured,
    refetch: depositQuery.refetch,
  };
}

export function useTokenInfo(tokenAddress: Address, ownerAddress?: Address) {
  const knownToken = getTokenByAddress(tokenAddress);

  const decimalsQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId: arcChain.id,
    query: { enabled: Boolean(tokenAddress) },
  });

  const symbolQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId: arcChain.id,
    query: { enabled: Boolean(tokenAddress) },
  });

  const balanceQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: ownerAddress ? [ownerAddress] : undefined,
    chainId: arcChain.id,
    query: {
      enabled: Boolean(tokenAddress && ownerAddress),
      refetchInterval: 15_000,
    },
  });

  const allowanceQuery = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: ownerAddress && CONTRACT_ADDRESS ? [ownerAddress, CONTRACT_ADDRESS] : undefined,
    chainId: arcChain.id,
    query: {
      enabled: Boolean(tokenAddress && ownerAddress && CONTRACT_ADDRESS),
      refetchInterval: 15_000,
    },
  });

  const decimals =
    decimalsQuery.data !== undefined
      ? Number(decimalsQuery.data)
      : knownToken?.fallbackDecimals ?? 6;

  const symbol = symbolQuery.data ?? knownToken?.symbol ?? 'USDC';

  return {
    decimals,
    symbol,
    balance: balanceQuery.data,
    allowance: allowanceQuery.data,
    isLoading:
      decimalsQuery.isLoading ||
      symbolQuery.isLoading ||
      balanceQuery.isLoading ||
      allowanceQuery.isLoading,
    refetch: async () => {
      await Promise.all([balanceQuery.refetch(), allowanceQuery.refetch()]);
    },
  };
}
