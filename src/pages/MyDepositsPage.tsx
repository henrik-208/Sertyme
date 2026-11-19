import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowRight, Search } from 'lucide-react';
import { ConnectWalletGate } from '../components/ConnectWalletGate';
import { DepositRow } from '../components/DepositRow';
import { useDepositsByRole, useNowSeconds } from '../hooks/useSertyme';
import {
  filterDepositsByCategory,
  truncateAddress,
  type DepositFilter,
} from '../lib/deposit';

const FILTERS: ReadonlyArray<{ id: DepositFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'locked', label: 'Held' },
  { id: 'claim_window', label: 'Claim Window' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'settled', label: 'Settled' },
];

export function MyDepositsPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const nowSeconds = useNowSeconds();

  const [filter, setFilter] = useState<DepositFilter>('all');
  const [lookupId, setLookupId] = useState('');

  const { deposits, isLoading, isConfigured } = useDepositsByRole('tenant', address);

  const filtered = useMemo(
    () => filterDepositsByCategory(deposits, filter, nowSeconds),
    [deposits, filter, nowSeconds]
  );

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = lookupId.trim();
    if (/^\d+$/.test(cleaned)) {
      navigate(`/deposit/${cleaned}`);
    }
  };

  return (
    <div className="max-w-[1140px] mx-auto px-5 sm:px-8 pt-12 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2.5 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#535C52]">
            Tenant view
          </p>
          <h1 className="text-[32px] sm:text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#2F3E34]">
            My deposits
          </h1>
          <p className="text-base text-[#435449] leading-relaxed">
            Deposits locked from your connected wallet on Arc. Respond to claims or trigger
            releases once a claim window closes.
          </p>
        </div>

        {isConnected && (
          <Link
            to="/lock"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 transition-[filter] duration-150 whitespace-nowrap self-start md:self-auto"
          >
            <span>Lock a deposit</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!isConnected ? (
        <ConnectWalletGate
          title="Connect your wallet to see your deposits"
          description="Only deposits locked by your connected wallet appear here. Connect a wallet to read your active and settled deposits from Arc."
        />
      ) : (
        <div className="space-y-6">
          {/* Filter + Lookup Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#E6ECE0]/70 border border-[#9CAF88]/30"
              role="tablist"
              aria-label="Filter deposits by stage"
            >
              {FILTERS.map((item) => {
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

            <form onSubmit={handleLookup} className="flex items-center gap-2">
              <label htmlFor="deposit-id-lookup" className="sr-only">
                Open deposit by ID
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#535C52] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="deposit-id-lookup"
                  type="text"
                  inputMode="numeric"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="Deposit ID"
                  className="editorial-input pl-9 pr-3 py-2 text-sm font-mono w-36"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl border border-[#9CAF88] text-sm font-semibold text-[#2F3E34] hover:bg-[#E6ECE0]/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                Open
              </button>
            </form>
          </div>

          <p className="text-xs text-[#535C52]">
            Connected tenant{' '}
            <span className="font-mono text-[#2F3E34]">{truncateAddress(address ?? '')}</span>
            {' · '}
            <span className="tabular-nums">{deposits.length}</span> on-chain record
            {deposits.length === 1 ? '' : 's'}
          </p>

          {!isConfigured ? (
            <div className="editorial-card p-8 sm:p-10 text-center space-y-3">
              <p className="text-lg font-semibold text-[#2F3E34]">Contract not configured</p>
              <p className="text-sm text-[#435449] max-w-md mx-auto">
                Add your deployed Sertyme contract address to{' '}
                <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to read deposits
                from Arc.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading deposits">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="editorial-card p-6 h-24 animate-pulse bg-[#FFFFFF]/70"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="editorial-card p-10 text-center space-y-4">
              <p className="text-lg font-semibold text-[#2F3E34]">
                {deposits.length === 0
                  ? 'No deposits locked yet'
                  : 'No deposits match this filter'}
              </p>
              <p className="text-sm text-[#435449] max-w-md mx-auto leading-relaxed">
                {deposits.length === 0
                  ? 'When you lock a rental or booking deposit from this wallet, it will appear here with its live schedule and claim status.'
                  : 'Try switching back to All to inspect every deposit associated with this wallet.'}
              </p>
              {deposits.length === 0 && (
                <div className="pt-2">
                  <Link
                    to="/lock"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 transition-[filter] duration-150"
                  >
                    Lock your first deposit
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((deposit) => (
                <DepositRow
                  key={deposit.id.toString()}
                  deposit={deposit}
                  nowSeconds={nowSeconds}
                  perspective="tenant"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
