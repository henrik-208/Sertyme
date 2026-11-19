import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getTokenByAddress } from '../config/chain';
import {
  deriveDepositPhase,
  formatCountdown,
  formatDateShort,
  formatTokenAmount,
  getClaimWindowEnd,
  getPhaseLabel,
  truncateAddress,
  type DepositPhase,
  type DepositRecord,
} from '../lib/deposit';

interface DepositRowProps {
  deposit: DepositRecord;
  nowSeconds: number;
  perspective: 'tenant' | 'landlord';
}

function getNodeStyle(phase: DepositPhase): string {
  switch (phase) {
    case 'released':
    case 'resolved':
      return 'bg-[#2F3E34] border-[#2F3E34]';
    case 'claim_window':
    case 'releasable':
    case 'claimed':
      return 'bg-[#C9A24B] border-[#C9A24B] ring-4 ring-[#C9A24B]/20';
    case 'disputed':
      return 'bg-[#9E2A2B] border-[#9E2A2B] ring-4 ring-[#9E2A2B]/15';
    default:
      return 'bg-[#FFFFFF] border-[#9CAF88]';
  }
}

export function DepositRow({ deposit, nowSeconds, perspective }: DepositRowProps) {
  const token = getTokenByAddress(deposit.token);
  const decimals = token?.fallbackDecimals ?? 6;
  const symbol = token?.symbol ?? 'TOKEN';
  const phase = deriveDepositPhase(deposit, nowSeconds);
  const claimWindowEnd = getClaimWindowEnd(deposit);
  const counterparty = perspective === 'tenant' ? deposit.landlord : deposit.tenant;
  const counterpartyLabel = perspective === 'tenant' ? 'Landlord' : 'Tenant';

  const timingLine =
    phase === 'locked'
      ? `Rental ends ${formatDateShort(deposit.rentalEnd)}`
      : phase === 'claim_window'
        ? `Claim window · ${formatCountdown(claimWindowEnd, nowSeconds)}`
        : phase === 'releasable'
          ? 'Claim window closed · Ready to release'
          : phase === 'claimed'
            ? `Claimed ${formatTokenAmount(deposit.claimAmount, decimals)} ${symbol}`
            : phase === 'disputed'
              ? 'Awaiting arbiter resolution'
              : `Ended ${formatDateShort(deposit.rentalEnd)}`;

  return (
    <Link
      to={`/deposit/${deposit.id.toString()}`}
      className="group block editorial-card p-5 sm:p-6 hover:border-[#2F3E34]/30 transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <span
            className={`w-3 h-3 rounded-full border-2 shrink-0 mt-1.5 ${getNodeStyle(phase)}`}
            aria-hidden="true"
          />
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-lg font-semibold text-[#2F3E34] tabular-nums">
                {formatTokenAmount(deposit.amount, decimals)} {symbol}
              </span>
              <span className="text-xs text-[#636B60]" aria-hidden="true">
                ·
              </span>
              <span className="text-sm font-medium text-[#2F3E34]">
                {getPhaseLabel(phase)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#636B60]">
              <span className="font-mono tabular-nums">Deposit #{deposit.id.toString()}</span>
              <span aria-hidden="true">·</span>
              <span>
                {counterpartyLabel}{' '}
                <span className="font-mono text-[#2F3E34]">{truncateAddress(counterparty)}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{timingLine}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-[#2F3E34] shrink-0 pl-7 sm:pl-0">
          <span>View ledger</span>
          <ArrowRight
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
