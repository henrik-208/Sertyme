import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { decodeEventLog, type Address } from 'viem';
import { ArrowRight } from 'lucide-react';
import { ConnectWalletGate } from '../components/ConnectWalletGate';
import { TxStatusBanner, type TxStage } from '../components/TxStatusBanner';
import { erc20Abi, sertymeAbi } from '../config/abi';
import {
  CONTRACT_ADDRESS,
  SUPPORTED_TOKENS,
  arcChain,
  isContractConfigured,
  type SupportedToken,
} from '../config/chain';
import { useNowSeconds, useTokenInfo } from '../hooks/useSertyme';
import {
  formatDateTime,
  formatTokenAmount,
  parseTokenInput,
  validateLockForm,
} from '../lib/deposit';

const WINDOW_PRESETS = [
  { label: '3 days', seconds: 3 * 86400 },
  { label: '7 days', seconds: 7 * 86400 },
  { label: '14 days', seconds: 14 * 86400 },
  { label: '30 days', seconds: 30 * 86400 },
] as const;

function defaultRentalEndInput(): string {
  const date = new Date(Date.now() + 30 * 86400 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function LockDepositPage() {
  const { address, isConnected } = useAccount();
  const nowSeconds = useNowSeconds();

  const [landlord, setLandlord] = useState('');
  const [selectedToken, setSelectedToken] = useState<SupportedToken>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [rentalEndInput, setRentalEndInput] = useState(defaultRentalEndInput);
  const [claimWindowSeconds, setClaimWindowSeconds] = useState<number>(7 * 86400);
  const [customDays, setCustomDays] = useState('');
  const [submittedOnce, setSubmittedOnce] = useState(false);

  const tokenInfo = useTokenInfo(selectedToken.address, address);

  const rentalEndSeconds = useMemo(() => {
    if (!rentalEndInput) return null;
    const ms = Date.parse(rentalEndInput);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }, [rentalEndInput]);

  const effectiveClaimWindow = useMemo(() => {
    if (customDays.trim() !== '') {
      const parsed = Number(customDays);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed * 86400);
      }
    }
    return claimWindowSeconds;
  }, [claimWindowSeconds, customDays]);

  const parsedAmount = useMemo(
    () => parseTokenInput(amount, tokenInfo.decimals),
    [amount, tokenInfo.decimals]
  );

  const validation = useMemo(
    () =>
      validateLockForm({
        landlord,
        tenant: address,
        amount,
        decimals: tokenInfo.decimals,
        balance: tokenInfo.balance,
        rentalEndSeconds,
        claimWindowSeconds: effectiveClaimWindow,
        nowSeconds,
      }),
    [
      landlord,
      address,
      amount,
      tokenInfo.decimals,
      tokenInfo.balance,
      rentalEndSeconds,
      effectiveClaimWindow,
      nowSeconds,
    ]
  );

  const needsApproval = useMemo(() => {
    if (!parsedAmount) return false;
    if (tokenInfo.allowance === undefined) return true;
    return tokenInfo.allowance < parsedAmount;
  }, [parsedAmount, tokenInfo.allowance]);

  // Approve transaction state
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  // Create deposit transaction state
  const {
    data: createHash,
    writeContract: writeCreate,
    isPending: isCreatePending,
    error: createError,
    reset: resetCreate,
  } = useWriteContract();

  const {
    data: createReceipt,
    isLoading: isCreateConfirming,
    isSuccess: isCreateConfirmed,
  } = useWaitForTransactionReceipt({ hash: createHash });

  useEffect(() => {
    if (isApproveConfirmed) {
      void tokenInfo.refetch();
    }
  }, [isApproveConfirmed, tokenInfo]);

  const createdDepositId = useMemo(() => {
    if (!createReceipt?.logs) return null;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: sertymeAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'DepositCreated' && 'depositId' in decoded.args) {
          return decoded.args.depositId as bigint;
        }
      } catch {
        // Ignore non-matching logs
      }
    }
    return null;
  }, [createReceipt]);

  const approveStage: TxStage = approveError
    ? 'error'
    : isApproveConfirmed
      ? 'confirmed'
      : isApproveConfirming
        ? 'confirming'
        : isApprovePending
          ? 'pending'
          : 'idle';

  const createStage: TxStage = createError
    ? 'error'
    : isCreateConfirmed
      ? 'confirmed'
      : isCreateConfirming
        ? 'confirming'
        : isCreatePending
          ? 'pending'
          : 'idle';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedOnce(true);
    if (!validation.valid || !parsedAmount || !rentalEndSeconds || !CONTRACT_ADDRESS) {
      return;
    }

    if (needsApproval) {
      resetApprove();
      writeApprove({
        address: selectedToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, parsedAmount],
        chainId: arcChain.id,
      });
      return;
    }

    resetCreate();
    writeCreate({
      address: CONTRACT_ADDRESS,
      abi: sertymeAbi,
      functionName: 'createDeposit',
      args: [
        landlord.trim() as Address,
        selectedToken.address,
        parsedAmount,
        BigInt(rentalEndSeconds),
        BigInt(effectiveClaimWindow),
      ],
      chainId: arcChain.id,
    });
  };

  const claimWindowEndPreview =
    rentalEndSeconds !== null ? rentalEndSeconds + effectiveClaimWindow : null;

  return (
    <div className="max-w-[1140px] mx-auto px-5 sm:px-8 pt-12 pb-16">
      <div className="max-w-2xl mb-10 space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#535C52]">
          Tenant ledger
        </p>
        <h1 className="text-[32px] sm:text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#2F3E34]">
          Lock a deposit
        </h1>
        <p className="text-base text-[#435449] leading-relaxed">
          Set the landlord wallet, token, amount, rental end date, and claim window. Your wallet
          will first approve the token transfer, then lock the deposit on Arc.
        </p>
      </div>

      {!isConnected ? (
        <ConnectWalletGate
          title="Connect your wallet to lock a deposit"
          description="Deposits are created directly from your connected wallet on Arc. Connect a wallet to check your token balance, allowance, and schedule a deposit."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Deposit Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-7 editorial-card p-6 sm:p-8 space-y-6"
          >
            {!isContractConfigured && (
              <div
                role="alert"
                className="rounded-xl bg-[#F4F1EA] border border-[#C9A24B]/60 px-4 py-3 text-sm text-[#2F3E34]"
              >
                Contract address is not configured yet. Set{' '}
                <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> before submitting a
                deposit.
              </div>
            )}

            {/* Landlord Address */}
            <div className="space-y-2">
              <label htmlFor="landlord-address" className="block text-sm font-semibold text-[#2F3E34]">
                Landlord wallet address
              </label>
              <input
                id="landlord-address"
                type="text"
                value={landlord}
                onChange={(e) => setLandlord(e.target.value)}
                placeholder="0x..."
                autoComplete="off"
                spellCheck={false}
                className="editorial-input w-full px-4 py-3 text-sm font-mono"
              />
              {submittedOnce && validation.errors.landlord && (
                <p className="text-xs text-[#9E2A2B] font-medium">{validation.errors.landlord}</p>
              )}
            </div>

            {/* Token Selector */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-[#2F3E34]">Deposit token</span>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Deposit token">
                {SUPPORTED_TOKENS.map((token) => {
                  const active = selectedToken.address === token.address;
                  return (
                    <button
                      key={token.address}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedToken(token)}
                      className={`px-4 py-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#E6ECE0] border-[#2F3E34] text-[#2F3E34]'
                          : 'bg-[#FFFFFF] border-[#9CAF88]/40 text-[#435449] hover:border-[#2F3E34]/40'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-[#2F3E34]">
                        {token.symbol}
                      </span>
                      <span className="block text-xs text-[#535C52] mt-0.5">{token.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="deposit-amount" className="block text-sm font-semibold text-[#2F3E34]">
                  Amount ({tokenInfo.symbol})
                </label>
                <span className="text-xs text-[#535C52] font-mono tabular-nums">
                  Balance:{' '}
                  {tokenInfo.balance !== undefined
                    ? `${formatTokenAmount(tokenInfo.balance, tokenInfo.decimals, 4)} ${tokenInfo.symbol}`
                    : tokenInfo.isLoading
                      ? 'Reading…'
                      : '—'}
                </span>
              </div>
              <input
                id="deposit-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="editorial-input w-full px-4 py-3 text-base font-mono tabular-nums"
              />
              {submittedOnce && validation.errors.amount && (
                <p className="text-xs text-[#9E2A2B] font-medium">{validation.errors.amount}</p>
              )}
            </div>

            {/* Rental End Date */}
            <div className="space-y-2">
              <label htmlFor="rental-end" className="block text-sm font-semibold text-[#2F3E34]">
                Rental end date and time
              </label>
              <input
                id="rental-end"
                type="datetime-local"
                value={rentalEndInput}
                onChange={(e) => setRentalEndInput(e.target.value)}
                className="editorial-input w-full px-4 py-3 text-sm tabular-nums"
              />
              {submittedOnce && validation.errors.rentalEnd && (
                <p className="text-xs text-[#9E2A2B] font-medium">{validation.errors.rentalEnd}</p>
              )}
            </div>

            {/* Claim Window */}
            <div className="space-y-2.5">
              <span className="block text-sm font-semibold text-[#2F3E34]">
                Landlord claim window
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {WINDOW_PRESETS.map((preset) => {
                  const active = customDays.trim() === '' && claimWindowSeconds === preset.seconds;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCustomDays('');
                        setClaimWindowSeconds(preset.seconds);
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#2F3E34] border-[#2F3E34] text-[#F4F1EA]'
                          : 'bg-[#FFFFFF] border-[#9CAF88]/40 text-[#2F3E34] hover:border-[#2F3E34]/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="pt-1 flex items-center gap-3">
                <label htmlFor="custom-days" className="text-xs font-medium text-[#535C52] whitespace-nowrap">
                  Or custom days
                </label>
                <input
                  id="custom-days"
                  type="number"
                  min={1}
                  max={90}
                  step="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="e.g. 10"
                  className="editorial-input w-28 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
              {submittedOnce && validation.errors.claimWindow && (
                <p className="text-xs text-[#9E2A2B] font-medium">{validation.errors.claimWindow}</p>
              )}
            </div>

            {/* Transaction Banners */}
            <div className="space-y-3">
              <TxStatusBanner
                stage={approveStage}
                actionLabel={`Approve ${tokenInfo.symbol}`}
                txHash={approveHash}
                errorMessage={approveError?.message}
              />
              <TxStatusBanner
                stage={createStage}
                actionLabel="Lock deposit"
                txHash={createHash}
                errorMessage={createError?.message}
              />
            </div>

            {isCreateConfirmed && (
              <div className="rounded-xl bg-[#E6ECE0] border border-[#9CAF88]/50 p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#2F3E34]">
                  Deposit locked on Arc.
                </p>
                <Link
                  to={createdDepositId !== null ? `/deposit/${createdDepositId.toString()}` : '/deposits'}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F3E34] underline underline-offset-4"
                >
                  <span>{createdDepositId !== null ? `Open Deposit #${createdDepositId.toString()}` : 'Go to My Deposits'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  !isContractConfigured ||
                  isApprovePending ||
                  isApproveConfirming ||
                  isCreatePending ||
                  isCreateConfirming
                }
                className="w-full py-3.5 px-6 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold tracking-[0.01em] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-[filter,opacity] duration-150 cursor-pointer"
              >
                {isApprovePending || isApproveConfirming
                  ? `Approving ${tokenInfo.symbol}…`
                  : isCreatePending || isCreateConfirming
                    ? 'Locking deposit…'
                    : needsApproval
                      ? `Step 1 of 2 · Approve ${tokenInfo.symbol}`
                      : `Lock ${amount.trim() ? `${amount.trim()} ` : ''}${tokenInfo.symbol} deposit`}
              </button>
            </div>
          </form>

          {/* Live Schedule Preview */}
          <aside className="lg:col-span-5 editorial-card p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-5 border-b border-[#9CAF88]/25">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#535C52]">
                Schedule summary
              </p>
              <p className="text-lg font-semibold text-[#2F3E34] tabular-nums">
                {parsedAmount
                  ? `${formatTokenAmount(parsedAmount, tokenInfo.decimals, 4)} ${tokenInfo.symbol}`
                  : `0 ${tokenInfo.symbol}`}
              </p>
            </div>

            <ol className="relative space-y-6 pl-7">
              <span
                className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#9CAF88]/45 rounded-full"
                aria-hidden="true"
              />
              <li className="relative">
                <span
                  className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 bg-[#C9A24B] border-[#C9A24B]"
                  aria-hidden="true"
                />
                <p className="text-xs uppercase tracking-[0.04em] text-[#535C52] font-semibold">
                  Today
                </p>
                <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">Deposit locked on Arc</p>
                <p className="text-xs text-[#535C52] mt-0.5">
                  Token decimals read from chain: {tokenInfo.decimals}
                </p>
              </li>

              <li className="relative">
                <span
                  className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 bg-[#FFFFFF] border-[#9CAF88]"
                  aria-hidden="true"
                />
                <p className="text-xs uppercase tracking-[0.04em] text-[#535C52] font-semibold tabular-nums">
                  {rentalEndSeconds ? formatDateTime(rentalEndSeconds) : 'Select end date'}
                </p>
                <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">
                  Rental ends and claim window opens
                </p>
                <p className="text-xs text-[#535C52] mt-0.5">
                  Landlord can submit a claim during the window.
                </p>
              </li>

              <li className="relative">
                <span
                  className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 bg-[#FFFFFF] border-[#9CAF88]"
                  aria-hidden="true"
                />
                <p className="text-xs uppercase tracking-[0.04em] text-[#535C52] font-semibold tabular-nums">
                  {claimWindowEndPreview ? formatDateTime(claimWindowEndPreview) : '—'}
                </p>
                <p className="text-sm font-semibold text-[#2F3E34] mt-0.5">
                  Claim window closes
                </p>
                <p className="text-xs text-[#535C52] mt-0.5">
                  If no claim was filed, anyone can release the full balance to you.
                </p>
              </li>
            </ol>

            <div className="pt-4 border-t border-[#9CAF88]/25 text-xs text-[#535C52] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span>Current allowance</span>
                <span className="font-mono text-[#2F3E34] tabular-nums">
                  {tokenInfo.allowance !== undefined
                    ? `${formatTokenAmount(tokenInfo.allowance, tokenInfo.decimals, 4)} ${tokenInfo.symbol}`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Claim window length</span>
                <span className="font-mono text-[#2F3E34] tabular-nums">
                  {Math.round(effectiveClaimWindow / 86400)} days
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
