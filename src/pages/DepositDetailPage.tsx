import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ConnectWalletGate } from '../components/ConnectWalletGate';
import { TxStatusBanner, type TxStage } from '../components/TxStatusBanner';
import { sertymeAbi } from '../config/abi';
import {
  CONTRACT_ADDRESS,
  arcChain,
  getExplorerAddressUrl,
} from '../config/chain';
import { useArbiterAddress, useDepositDetail, useNowSeconds } from '../hooks/useSertyme';
import {
  deriveDepositPhase,
  formatCountdown,
  formatDateTime,
  formatTokenAmount,
  getClaimWindowEnd,
  getPhaseLabel,
  getViewerRole,
  truncateAddress,
  validateClaimForm,
  validateResolveForm,
} from '../lib/deposit';

export function DepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const nowSeconds = useNowSeconds();
  const arbiterAddress = useArbiterAddress();

  const parsedId = useMemo(() => {
    if (!id || !/^\d+$/.test(id)) return undefined;
    try {
      return BigInt(id);
    } catch {
      return undefined;
    }
  }, [id]);

  const { deposit, decimals, symbol, isLoading, isConfigured, refetch } =
    useDepositDetail(parsedId);

  const [claimAmount, setClaimAmount] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [resolveLandlordAmount, setResolveLandlordAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState('Transaction');

  const {
    data: txHash,
    writeContract,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      void refetch();
    }
  }, [isConfirmed, refetch]);

  const txStage: TxStage = writeError
    ? 'error'
    : isConfirmed
      ? 'confirmed'
      : isConfirming
        ? 'confirming'
        : isPending
          ? 'pending'
          : 'idle';

  const phase = deposit ? deriveDepositPhase(deposit, nowSeconds) : null;
  const role = deposit ? getViewerRole(deposit, address, arbiterAddress) : 'observer';
  const claimWindowEnd = deposit ? getClaimWindowEnd(deposit) : null;

  const handleSubmitClaim = (e: FormEvent) => {
    e.preventDefault();
    if (!deposit || !CONTRACT_ADDRESS) return;
    const check = validateClaimForm({
      claimAmountInput: claimAmount,
      depositAmount: deposit.amount,
      decimals,
      reason: claimReason,
    });
    if (!check.valid || check.parsedAmount === undefined) {
      setFormError(check.error ?? 'Check claim details.');
      return;
    }
    setFormError(null);
    setLastActionLabel('Submit claim');
    reset();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'submitClaim',
      args: [deposit.id, check.parsedAmount, claimReason.trim()],
      chainId: arcChain.id,
    });
  };

  const handleAcceptClaim = () => {
    if (!deposit || !CONTRACT_ADDRESS) return;
    setFormError(null);
    setLastActionLabel('Accept claim');
    reset();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'acceptClaim',
      args: [deposit.id],
      chainId: arcChain.id,
    });
  };

  const handleDisputeClaim = (e: FormEvent) => {
    e.preventDefault();
    if (!deposit || !CONTRACT_ADDRESS) return;
    if (disputeReason.trim().length < 5) {
      setFormError('Explain why you are disputing this claim (at least 5 characters).');
      return;
    }
    setFormError(null);
    setLastActionLabel('Dispute claim');
    reset();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'disputeClaim',
      args: [deposit.id, disputeReason.trim()],
      chainId: arcChain.id,
    });
  };

  const handleRelease = () => {
    if (!deposit || !CONTRACT_ADDRESS) return;
    setFormError(null);
    setLastActionLabel('Release deposit');
    reset();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'releaseDeposit',
      args: [deposit.id],
      chainId: arcChain.id,
    });
  };

  const handleResolveDispute = (e: FormEvent) => {
    e.preventDefault();
    if (!deposit || !CONTRACT_ADDRESS) return;
    const check = validateResolveForm({
      landlordAmountInput: resolveLandlordAmount,
      depositAmount: deposit.amount,
      decimals,
    });
    if (!check.valid || check.parsedAmount === undefined) {
      setFormError(check.error ?? 'Check resolution amount.');
      return;
    }
    setFormError(null);
    setLastActionLabel('Resolve dispute');
    reset();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'resolveDispute',
      args: [deposit.id, check.parsedAmount],
      chainId: arcChain.id,
    });
  };

  const busy = isPending || isConfirming;

  return (
    <div className="max-w-[1140px] mx-auto px-5 sm:px-8 pt-10 pb-16">
      <div className="mb-8">
        <Link
          to="/deposits"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#435449] hover:text-[#2F3E34] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to deposits</span>
        </Link>
      </div>

      {!isConfigured ? (
        <div className="editorial-card p-10 text-center space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#2F3E34]">Deposit ledger</h1>
          <p className="text-sm text-[#435449]">
            Configure <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to read
            deposit records from Arc.
          </p>
        </div>
      ) : parsedId === undefined ? (
        <div className="editorial-card p-10 text-center space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#2F3E34]">Invalid deposit identifier</h1>
          <p className="text-sm text-[#435449]">
            Deposit identifiers are numeric values assigned on chain when a deposit is locked.
          </p>
        </div>
      ) : isLoading ? (
        <div className="editorial-card p-10 animate-pulse h-64" aria-busy="true" />
      ) : !deposit || !phase || !claimWindowEnd ? (
        <div className="editorial-card p-10 text-center space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#2F3E34]">Deposit not found</h1>
          <p className="text-sm text-[#435449]">
            No deposit with ID #{parsedId.toString()} exists on the configured Sertyme contract.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Summary */}
          <div className="editorial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.06em] text-[#535C52]">
                Deposit #{deposit.id.toString()} · {getPhaseLabel(phase)}
              </p>
              <h1 className="text-[32px] sm:text-[42px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#2F3E34] tabular-nums">
                {formatTokenAmount(deposit.amount, decimals, 4)} {symbol}
              </h1>
              <p className="text-sm text-[#435449]">
                {phase === 'claim_window'
                  ? `Landlord claim window · ${formatCountdown(claimWindowEnd, nowSeconds)}`
                  : phase === 'locked'
                    ? `Rental ends ${formatDateTime(deposit.rentalEnd)}`
                    : phase === 'releasable'
                      ? 'Claim window ended with no claim · Ready for release to tenant'
                      : `Rental ended ${formatDateTime(deposit.rentalEnd)}`}
              </p>
            </div>

            <div className="text-xs text-[#535C52] space-y-1.5 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[#535C52]">Tenant</span>
                <a
                  href={getExplorerAddressUrl(deposit.tenant)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2F3E34] inline-flex items-center gap-1 hover:underline"
                >
                  {truncateAddress(deposit.tenant)}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-[#535C52]">Landlord</span>
                <a
                  href={getExplorerAddressUrl(deposit.landlord)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2F3E34] inline-flex items-center gap-1 hover:underline"
                >
                  {truncateAddress(deposit.landlord)}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Timeline Column */}
            <section className="lg:col-span-6 editorial-card p-6 sm:p-8 space-y-6">
              <h2 className="text-xl font-semibold text-[#2F3E34]">Deposit timeline</h2>

              <ol className="relative space-y-6 pl-7">
                <span
                  className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#9CAF88]/45 rounded-full"
                  aria-hidden="true"
                />

                <li className="relative">
                  <span
                    className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 bg-[#2F3E34] border-[#2F3E34]"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-mono text-[#535C52]">
                    {formatDateTime(deposit.createdAt)}
                  </p>
                  <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">Deposit locked</p>
                  <p className="text-xs text-[#535C52] mt-0.5">
                    {formatTokenAmount(deposit.amount, decimals, 4)} {symbol} held in contract
                  </p>
                </li>

                <li className="relative">
                  <span
                    className={`absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 ${
                      nowSeconds >= Number(deposit.rentalEnd)
                        ? 'bg-[#2F3E34] border-[#2F3E34]'
                        : 'bg-[#C9A24B] border-[#C9A24B]'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-xs font-mono text-[#535C52]">
                    {formatDateTime(deposit.rentalEnd)}
                  </p>
                  <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">Rental ends</p>
                  <p className="text-xs text-[#535C52] mt-0.5">
                    Claim window opens immediately after this timestamp.
                  </p>
                </li>

                <li className="relative">
                  <span
                    className={`absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 ${
                      phase === 'claim_window' || phase === 'claimed'
                        ? 'bg-[#C9A24B] border-[#C9A24B] ring-4 ring-[#C9A24B]/20'
                        : phase === 'disputed'
                          ? 'bg-[#9E2A2B] border-[#9E2A2B]'
                          : nowSeconds > Number(claimWindowEnd)
                            ? 'bg-[#2F3E34] border-[#2F3E34]'
                            : 'bg-[#FFFFFF] border-[#9CAF88]'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-xs font-mono text-[#535C52]">
                    {formatDateTime(claimWindowEnd)}
                  </p>
                  <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">
                    Claim window closes
                  </p>
                  <p className="text-xs text-[#535C52] mt-0.5">
                    {deposit.claimAmount > 0n
                      ? `Claim filed for ${formatTokenAmount(deposit.claimAmount, decimals, 4)} ${symbol}`
                      : 'No claim submitted.'}
                  </p>
                </li>

                <li className="relative">
                  <span
                    className={`absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 ${
                      phase === 'released' || phase === 'resolved'
                        ? 'bg-[#2F3E34] border-[#2F3E34]'
                        : phase === 'releasable'
                          ? 'bg-[#C9A24B] border-[#C9A24B] ring-4 ring-[#C9A24B]/20'
                          : 'bg-[#FFFFFF] border-[#9CAF88]'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-[#2F3E34]">Final settlement</p>
                  <p className="text-xs text-[#535C52] mt-0.5">{getPhaseLabel(phase)}</p>
                </li>
              </ol>

              {/* Claim / Dispute Notes if present */}
              {(deposit.claimReason || deposit.disputeReason) && (
                <div className="pt-5 border-t border-[#9CAF88]/25 space-y-4">
                  {deposit.claimReason && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#535C52]">
                        Landlord claim note
                      </p>
                      <p className="text-sm text-[#2F3E34] leading-relaxed">
                        {deposit.claimReason}
                      </p>
                    </div>
                  )}
                  {deposit.disputeReason && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#535C52]">
                        Tenant dispute note
                      </p>
                      <p className="text-sm text-[#2F3E34] leading-relaxed">
                        {deposit.disputeReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Role-Aware Action Column */}
            <section className="lg:col-span-6 space-y-5">
              {!isConnected ? (
                <ConnectWalletGate
                  title="Connect wallet to act on this deposit"
                  description="Available actions depend on your connected wallet role and the current timeline stage."
                />
              ) : (
                <div className="editorial-card p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#9CAF88]/25">
                    <h2 className="text-xl font-semibold text-[#2F3E34]">Actions</h2>
                    <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#535C52]">
                      Role · {role}
                    </span>
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-[#9E2A2B]">
                      {formError}
                    </p>
                  )}

                  <TxStatusBanner
                    stage={txStage}
                    actionLabel={lastActionLabel}
                    txHash={txHash}
                    errorMessage={writeError?.message}
                  />

                  {/* Landlord: Submit claim inside window */}
                  {phase === 'claim_window' && role === 'landlord' && (
                    <form onSubmit={handleSubmitClaim} className="space-y-4">
                      <p className="text-sm text-[#435449]">
                        The claim window is open. Submit a claim up to{' '}
                        <span className="font-mono font-semibold text-[#2F3E34]">
                          {formatTokenAmount(deposit.amount, decimals, 4)} {symbol}
                        </span>
                        .
                      </p>
                      <div className="space-y-1.5">
                        <label htmlFor="claim-amount" className="block text-sm font-semibold text-[#2F3E34]">
                          Claim amount ({symbol})
                        </label>
                        <input
                          id="claim-amount"
                          type="text"
                          inputMode="decimal"
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(e.target.value)}
                          placeholder="0.00"
                          className="editorial-input w-full px-4 py-2.5 text-sm font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="claim-reason" className="block text-sm font-semibold text-[#2F3E34]">
                          Reason for claim
                        </label>
                        <textarea
                          id="claim-reason"
                          rows={3}
                          value={claimReason}
                          onChange={(e) => setClaimReason(e.target.value)}
                          placeholder="Describe the documented deduction or damage"
                          className="editorial-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3 px-5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Submitting claim…' : 'Submit claim'}
                      </button>
                    </form>
                  )}

                  {/* Tenant: Accept or Dispute a submitted claim */}
                  {phase === 'claimed' && role === 'tenant' && (
                    <div className="space-y-5">
                      <p className="text-sm text-[#435449]">
                        The landlord submitted a claim for{' '}
                        <span className="font-mono font-semibold text-[#2F3E34]">
                          {formatTokenAmount(deposit.claimAmount, decimals, 4)} {symbol}
                        </span>
                        . You may accept the claim to settle immediately, or dispute it for arbiter
                        review.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleAcceptClaim}
                        className="w-full py-3 px-5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Processing…' : 'Accept claim and settle'}
                      </button>

                      <form
                        onSubmit={handleDisputeClaim}
                        className="pt-4 border-t border-[#9CAF88]/25 space-y-3"
                      >
                        <label htmlFor="dispute-reason" className="block text-sm font-semibold text-[#2F3E34]">
                          Or dispute this claim
                        </label>
                        <textarea
                          id="dispute-reason"
                          rows={3}
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Explain your position for the arbiter"
                          className="editorial-input w-full px-4 py-2.5 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-3 px-5 rounded-xl border border-[#2F3E34] text-[#2F3E34] text-sm font-semibold hover:bg-[#E6ECE0]/60 disabled:opacity-50 cursor-pointer"
                        >
                          {busy ? 'Submitting dispute…' : 'Dispute claim'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Anyone: Release deposit after claim window closes with no claim */}
                  {phase === 'releasable' && (
                    <div className="space-y-4">
                      <p className="text-sm text-[#435449]">
                        The claim window closed with no claim filed. Anyone can now trigger the
                        release to return the full balance to the tenant.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleRelease}
                        className="w-full py-3 px-5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Releasing deposit…' : 'Release deposit to tenant'}
                      </button>
                    </div>
                  )}

                  {/* Arbiter: Resolve dispute */}
                  {phase === 'disputed' && role === 'arbiter' && (
                    <form onSubmit={handleResolveDispute} className="space-y-4">
                      <p className="text-sm text-[#435449]">
                        Enter the amount to award to the landlord. Any remainder up to{' '}
                        <span className="font-mono font-semibold text-[#2F3E34]">
                          {formatTokenAmount(deposit.amount, decimals, 4)} {symbol}
                        </span>{' '}
                        returns to the tenant automatically.
                      </p>
                      <div className="space-y-1.5">
                        <label htmlFor="resolve-amount" className="block text-sm font-semibold text-[#2F3E34]">
                          Landlord payout ({symbol})
                        </label>
                        <input
                          id="resolve-amount"
                          type="text"
                          inputMode="decimal"
                          value={resolveLandlordAmount}
                          onChange={(e) => setResolveLandlordAmount(e.target.value)}
                          placeholder="0.00"
                          className="editorial-input w-full px-4 py-2.5 text-sm font-mono tabular-nums"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3 px-5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold hover:brightness-95 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Resolving dispute…' : 'Resolve dispute'}
                      </button>
                    </form>
                  )}

                  {/* Waiting / settled states */}
                  {phase === 'locked' && (
                    <p className="text-sm text-[#435449] leading-relaxed">
                      This deposit is locked for the duration of the rental. No action is available
                      until {formatDateTime(deposit.rentalEnd)}.
                    </p>
                  )}
                  {phase === 'claim_window' && role !== 'landlord' && (
                    <p className="text-sm text-[#435449] leading-relaxed">
                      The landlord claim window is currently open. If no claim is submitted by{' '}
                      {formatDateTime(claimWindowEnd)}, release will open to anyone.
                    </p>
                  )}
                  {phase === 'claimed' && role !== 'tenant' && (
                    <p className="text-sm text-[#435449] leading-relaxed">
                      A claim has been submitted and is waiting for the tenant to accept or dispute.
                    </p>
                  )}
                  {phase === 'disputed' && role !== 'arbiter' && (
                    <p className="text-sm text-[#435449] leading-relaxed">
                      This deposit is under dispute and awaiting resolution by the designated
                      arbiter.
                    </p>
                  )}
                  {(phase === 'released' || phase === 'resolved') && (
                    <p className="text-sm text-[#435449] leading-relaxed">
                      This deposit has been settled on chain and no further actions are required.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
