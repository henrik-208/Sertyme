import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWalletGate } from '../components/ConnectWalletGate';
import { DepositRow } from '../components/DepositRow';
import { useDepositsByRole, useNowSeconds } from '../hooks/useSertyme';
import {
  deriveDepositPhase,
  filterDepositsByCategory,
  truncateAddress,
  type DepositFilter,
} from '../lib/deposit';

const LANDLORD_FILTERS: ReadonlyArray<{ id: DepositFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'locked', label: 'Awaiting End' },
  { id: 'claim_window', label: 'Claim Window' },
  { id: 'claimed', label: 'Claim Submitted' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'settled', label: 'Settled' },
];

export function LandlordDeskPage() {
  const { address, isConnected } = useAccount();
  const nowSeconds = useNowSeconds();
  const [filter, setFilter] = useState<DepositFilter>('all');

  const { deposits, isLoading, isConfigured } = useDepositsByRole('landlord', address);

  const filtered = useMemo(
    () => filterDepositsByCategory(deposits, filter, nowSeconds),
    [deposits, filter, nowSeconds]
  );

  const counts = useMemo(() => {
    let openWindow = 0;
    let activeClaims = 0;
    let settled = 0;
    for (const d of deposits) {
      const p = deriveDepositPhase(d, nowSeconds);
      if (p === 'claim_window') openWindow += 1;
      if (p === 'claimed' || p === 'disputed') activeClaims += 1;
      if (p === 'released' || p === 'resolved') settled += 1;
    }
    return { openWindow, activeClaims, settled };
  }, [deposits, nowSeconds]);

  return (
    <div className="max-w-[1140px] mx-auto px-5 sm:px-8 pt-12 pb-16">
      <div className="max-w-2xl mb-10 space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#535C52]">
          Landlord view
        </p>
        <h1 className="text-[32px] sm:text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#2F3E34]">
          Landlord desk
        </h1>
        <p className="text-base text-[#435449] leading-relaxed">
          Only deposits where your connected wallet is named as landlord appear here. Track rental
          end dates and file claims inside the agreed window.
        </p>
      </div>

      {!isConnected ? (
        <ConnectWalletGate
          title="Connect your landlord wallet"
          description="The Landlord Desk reads deposits strictly for the connected landlord wallet. Connect your wallet to review upcoming end dates and open claim windows."
        />
      ) : (
        <div className="space-y-6">
          {/* Connected landlord real counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="editorial-card p-5">
              <p className="text-xs text-[#535C52]">Assigned deposits</p>
              <p className="text-2xl font-semibold text-[#2F3E34] font-mono tabular-nums mt-1.5">
                {deposits.length}
              </p>
            </div>
            <div className="editorial-card p-5">
              <p className="text-xs text-[#535C52]">Claim window open</p>
              <p className="text-2xl font-semibold text-[#2F3E34] font-mono tabular-nums mt-1.5">
                {counts.openWindow}
              </p>
            </div>
            <div className="editorial-card p-5">
              <p className="text-xs text-[#535C52]">Claims in progress</p>
              <p className="text-2xl font-semibold text-[#2F3E34] font-mono tabular-nums mt-1.5">
                {counts.activeClaims}
              </p>
            </div>
            <div className="editorial-card p-5">
              <p className="text-xs text-[#535C52]">Settled</p>
              <p className="text-2xl font-semibold text-[#2F3E34] font-mono tabular-nums mt-1.5">
                {counts.settled}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#E6ECE0]/70 border border-[#9CAF88]/30"
              role="tablist"
              aria-label="Filter landlord deposits"
            >
              {LANDLORD_FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(item.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#FFFFFF] text-[#2F3E34] shadow-xs'
                        : 'text-[#435449] hover:text-[#2F3E34]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-[#535C52]">
              Landlord{' '}
              <span className="font-mono text-[#2F3E34]">{truncateAddress(address ?? '')}</span>
            </p>
          </div>

          {!isConfigured ? (
            <div className="editorial-card p-8 sm:p-10 text-center space-y-3">
              <p className="text-lg font-semibold text-[#2F3E34]">Contract not configured</p>
              <p className="text-sm text-[#435449] max-w-md mx-auto">
                Add your deployed Sertyme contract address to{' '}
                <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to read landlord
                deposits from Arc.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading landlord deposits">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="editorial-card p-6 h-24 animate-pulse bg-[#FFFFFF]/70"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="editorial-card p-10 text-center space-y-3">
              <p className="text-lg font-semibold text-[#2F3E34]">
                {deposits.length === 0
                  ? 'No deposits assigned to this wallet'
                  : 'No deposits match this filter'}
              </p>
              <p className="text-sm text-[#435449] max-w-md mx-auto leading-relaxed">
                {deposits.length === 0
                  ? 'When a tenant locks a deposit naming this wallet as landlord, it will appear here automatically.'
                  : 'Switch back to All to inspect every deposit assigned to this wallet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((deposit) => (
                <DepositRow
                  key={deposit.id.toString()}
                  deposit={deposit}
                  nowSeconds={nowSeconds}
                  perspective="landlord"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
