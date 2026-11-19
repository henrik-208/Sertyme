import { CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { getExplorerTxUrl } from '../config/chain';

export type TxStage = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

interface TxStatusBannerProps {
  stage: TxStage;
  actionLabel: string;
  txHash?: string;
  errorMessage?: string | null;
}

export function TxStatusBanner({
  stage,
  actionLabel,
  txHash,
  errorMessage,
}: TxStatusBannerProps) {
  if (stage === 'idle') return null;

  if (stage === 'error') {
    return (
      <div
        role="alert"
        className="rounded-xl bg-[#F8E6E6] border border-[#9E2A2B]/30 px-4 py-3.5 text-sm text-[#2F3E34] flex items-start gap-3"
      >
        <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-[#2F3E34]">{actionLabel} could not be completed</p>
          <p className="text-xs text-[#435449] break-words">
            {errorMessage || 'Transaction was rejected or reverted on chain.'}
          </p>
        </div>
      </div>
    );
  }

  const isDone = stage === 'confirmed';

  return (
    <div
      role="status"
      className={`rounded-xl px-4 py-3.5 text-sm flex items-start justify-between gap-4 border ${
        isDone
          ? 'bg-[#E6ECE0] border-[#9CAF88]/60 text-[#2F3E34]'
          : 'bg-[#F4F1EA] border-[#C9A24B]/50 text-[#2F3E34]'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-[#2F3E34] shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <Loader2 className="w-4 h-4 text-[#2F3E34] shrink-0 mt-0.5 animate-spin" aria-hidden="true" />
        )}
        <div className="space-y-0.5">
          <p className="font-semibold text-[#2F3E34]">
            {stage === 'pending' && `Confirm ${actionLabel.toLowerCase()} in your wallet`}
            {stage === 'confirming' && `${actionLabel} confirming on Arc`}
            {stage === 'confirmed' && `${actionLabel} confirmed on Arc`}
          </p>
          <p className="text-xs text-[#435449]">
            {stage === 'pending' && 'Review the transaction details and approve the signature.'}
            {stage === 'confirming' && 'Waiting for block inclusion on Arc.'}
            {stage === 'confirmed' && 'On-chain state has been updated.'}
          </p>
        </div>
      </div>

      {txHash && (
        <a
          href={getExplorerTxUrl(txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F3E34] underline underline-offset-4 hover:opacity-80 whitespace-nowrap shrink-0"
        >
          Arcscan
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
