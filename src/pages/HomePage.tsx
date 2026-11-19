import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { usePlatformStats } from '../hooks/useSertyme';

const ABOUT_STEPS = [
  {
    step: '01',
    title: 'How the claim window works',
    body: 'When a tenant locks a deposit in USDC or EURC, the rental end date and claim window are written into the contract upfront. While the rental is active, neither party can touch the funds. Once the rental ends, the claim window opens for the landlord to inspect the property and submit a documented claim if needed.',
  },
  {
    step: '02',
    title: 'What happens without a claim',
    body: 'If the landlord makes no claim before the window closes, the deposit unlocks for full return to the tenant. Anyone can call the release function to send the full balance back to the tenant wallet, with no waiting for landlord sign-off.',
  },
  {
    step: '03',
    title: 'How disputes are handled',
    body: 'If a landlord submits a claim inside the window, the tenant can either accept it or open a dispute with their explanation. When disputed, funds remain locked until the designated arbiter reviews both sides and splits or returns the deposit on chain.',
  },
] as const;

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1',
    status: 'Live',
    title: 'Core deposits live',
    description:
      'Fixed-window rental and booking deposits in USDC and EURC on Arc with landlord claims, tenant acceptance or dispute, arbiter resolution, and permissionless release.',
    nodeState: 'active' as const,
  },
  {
    phase: 'Phase 2',
    status: 'Next',
    title: 'Partial releases for agreed deductions',
    description:
      'Allow tenant and landlord to co-sign an itemized deduction and release the remaining balance immediately without waiting for the full claim window to expire.',
    nodeState: 'upcoming' as const,
  },
  {
    phase: 'Phase 3',
    status: 'Planned',
    title: 'Inspection checklists with evidence',
    description:
      'Attach timestamped move-in and move-out photo hashes and signed condition checklists directly to each deposit record for clearer claim reviews.',
    nodeState: 'upcoming' as const,
  },
  {
    phase: 'Phase 4',
    status: 'Planned',
    title: 'Repeat tenant and landlord track records',
    description:
      'Verifiable on-chain history of completed rentals, clean releases, and resolved claims so both sides can establish trust across bookings.',
    nodeState: 'upcoming' as const,
  },
] as const;

const FAQ_ITEMS = [
  {
    question: 'What if the landlord makes no claim',
    answer:
      'As soon as the fixed claim window closes with no claim submitted, the deposit becomes eligible for full release back to the tenant. The contract enforces the deadline automatically so funds are never held indefinitely.',
  },
  {
    question: 'Can a claim be larger than the deposit',
    answer:
      'No. The contract strictly caps any landlord claim at the locked deposit amount. Any claim above the locked balance is rejected before submission and on chain.',
  },
  {
    question: 'What happens in a dispute',
    answer:
      'When a tenant disputes a submitted claim, the deposit stays locked in the contract and enters dispute status. The designated arbiter reviews the claim and dispute reasons and resolves the payout between landlord and tenant in a single transaction.',
  },
  {
    question: 'Who can release a deposit',
    answer:
      'Once the claim window passes with no claim filed, anyone can trigger the release transaction. Regardless of who submits the transaction, the contract always transfers the locked tokens directly to the tenant wallet.',
  },
] as const;

export function HomePage() {
  const { stats, isLoading, isConfigured } = usePlatformStats();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const statItems = [
    {
      label: 'Total deposits',
      value: isConfigured ? (isLoading ? '…' : stats ? stats.totalDeposits.toString() : '0') : '—',
    },
    {
      label: 'Active held',
      value: isConfigured ? (isLoading ? '…' : stats ? stats.activeDeposits.toString() : '0') : '—',
    },
    {
      label: 'Released',
      value: isConfigured ? (isLoading ? '…' : stats ? stats.releasedDeposits.toString() : '0') : '—',
    },
    {
      label: 'Disputed',
      value: isConfigured ? (isLoading ? '…' : stats ? stats.disputedDeposits.toString() : '0') : '—',
    },
  ];

  return (
    <div className="max-w-[1140px] mx-auto px-5 sm:px-8">
      {/* Hero Section */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center space-y-6"
          >
            <p className="text-xs font-semibold tracking-[0.02em] text-[#435449]">
              Built on Arc · USDC and EURC deposit keeper
            </p>
            <h1 className="text-[36px] sm:text-[48px] font-semibold leading-[1.14] tracking-[-0.02em] text-[#2F3E34]">
              Deposits kept on schedule
            </h1>
            <p className="text-lg text-[#435449] leading-[1.6] max-w-[54ch]">
              A tenant locks a rental or booking deposit in a shared ledger. When the stay ends,
              the landlord has a fixed window to file a claim. If no claim is made, the deposit
              returns to the tenant.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/lock"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold tracking-[0.01em] hover:brightness-95 transition-[filter] duration-150 whitespace-nowrap"
              >
                <span>Lock a deposit</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/deposits"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[#9CAF88] text-[#2F3E34] text-sm font-semibold hover:bg-[#E6ECE0]/60 transition-colors whitespace-nowrap"
              >
                View my deposits
              </Link>
            </div>
          </motion.div>

          {/* Editorial Deposit Lifecycle Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="editorial-card p-7 sm:p-8 h-full flex flex-col justify-between">
              <div className="space-y-1 pb-5 border-b border-[#9CAF88]/25">
                <p className="text-xs font-semibold tracking-[0.02em] text-[#535C52]">
                  Deposit rhythm
                </p>
                <p className="text-base font-semibold text-[#2F3E34]">
                  Four clear stages from lock to return
                </p>
              </div>

              <ol className="relative my-6 space-y-6 pl-7">
                <span
                  className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#9CAF88]/45 rounded-full"
                  aria-hidden="true"
                />
                {[
                  {
                    label: 'Deposit locked',
                    detail: 'Tenant approves and locks USDC or EURC with fixed dates',
                    dot: 'bg-[#2F3E34] border-[#2F3E34]',
                  },
                  {
                    label: 'Rental ends',
                    detail: 'Stay concludes and the agreed claim window opens',
                    dot: 'bg-[#C9A24B] border-[#C9A24B] ring-4 ring-[#C9A24B]/20',
                  },
                  {
                    label: 'Claim window',
                    detail: 'Landlord may file a claim up to the locked balance',
                    dot: 'bg-[#FFFFFF] border-[#9CAF88]',
                  },
                  {
                    label: 'Automatic release',
                    detail: 'No claim filed means anyone can release funds to tenant',
                    dot: 'bg-[#FFFFFF] border-[#9CAF88]',
                  },
                ].map((stage) => (
                  <li key={stage.label} className="relative">
                    <span
                      className={`absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 ${stage.dot}`}
                      aria-hidden="true"
                    />
                    <p className="text-sm font-semibold text-[#2F3E34]">{stage.label}</p>
                    <p className="text-xs text-[#535C52] leading-relaxed mt-0.5">{stage.detail}</p>
                  </li>
                ))}
              </ol>

              <div className="pt-4 border-t border-[#9CAF88]/25 flex items-center justify-between text-xs text-[#535C52]">
                <span>Supported assets</span>
                <span className="font-mono font-medium text-[#2F3E34]">USDC · EURC</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Stats Strip */}
      <section className="py-10 border-y border-[#9CAF88]/30" aria-labelledby="stats-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
          <div>
            <p className="text-xs font-semibold tracking-[0.02em] text-[#535C52] mb-1">
              Live contract read
            </p>
            <h2
              id="stats-heading"
              className="text-2xl font-semibold tracking-[-0.015em] text-[#2F3E34]"
            >
              Ledger activity
            </h2>
          </div>
          {!isConfigured && (
            <p className="text-xs text-[#535C52]">
              Set a deployed contract address in environment config to read live counts.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statItems.map((item) => (
            <div key={item.label} className="editorial-card p-5 sm:p-6">
              <p className="text-xs font-medium text-[#535C52]">{item.label}</p>
              <p className="text-3xl font-semibold text-[#2F3E34] font-mono tabular-nums mt-2">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-20" aria-labelledby="about-heading">
        <div className="max-w-2xl mb-12 space-y-3">
          <p className="text-xs font-semibold tracking-[0.02em] text-[#535C52]">
            About Sertyme
          </p>
          <h2
            id="about-heading"
            className="text-[28px] sm:text-[32px] font-semibold leading-[1.2] tracking-[-0.015em] text-[#2F3E34]"
          >
            Plain rules for every deposit
          </h2>
          <p className="text-base text-[#435449] leading-relaxed">
            Every timeline is fixed before the keys change hands so neither party relies on memory
            or informal follow-ups.
          </p>
        </div>

        <div className="relative pl-8 sm:pl-12 space-y-8">
          <span
            className="absolute left-[11px] sm:left-[15px] top-3 bottom-3 w-[2px] bg-[#9CAF88]/45 rounded-full"
            aria-hidden="true"
          />

          {ABOUT_STEPS.map((item, idx) => (
            <div key={item.step} className="relative">
              <span
                className={`absolute -left-8 sm:-left-12 top-7 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-semibold ${
                  idx === 0
                    ? 'bg-[#C9A24B] border-[#C9A24B] text-[#2F3E34]'
                    : 'bg-[#FFFFFF] border-[#9CAF88] text-[#2F3E34]'
                }`}
                aria-hidden="true"
              >
                {item.step}
              </span>
              <div className="editorial-card p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-[#2F3E34] tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-base text-[#435449] leading-[1.65] mt-3 max-w-[70ch]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap Section */}
      <section
        id="roadmap"
        className="py-16 sm:py-20 border-t border-[#9CAF88]/30"
        aria-labelledby="roadmap-heading"
      >
        <div className="max-w-2xl mb-12 space-y-3">
          <p className="text-xs font-semibold tracking-[0.02em] text-[#535C52]">
            Roadmap
          </p>
          <h2
            id="roadmap-heading"
            className="text-[28px] sm:text-[32px] font-semibold leading-[1.2] tracking-[-0.015em] text-[#2F3E34]"
          >
            Where Sertyme goes next
          </h2>
          <p className="text-base text-[#435449] leading-relaxed">
            Built step by step to keep the core contract small, auditable, and calm to use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ROADMAP_PHASES.map((item) => (
            <article
              key={item.phase}
              className={`editorial-card p-6 sm:p-7 flex flex-col justify-between ${
                item.nodeState === 'active' ? 'bg-[#FFFFFF]' : 'bg-[#FFFFFF]/80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono font-semibold uppercase tracking-[0.05em] text-[#435449]">
                    {item.phase} · {item.status}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                      item.nodeState === 'active'
                        ? 'bg-[#C9A24B] border-[#C9A24B]'
                        : 'bg-[#FFFFFF] border-[#9CAF88]'
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg font-semibold text-[#2F3E34]">{item.title}</h3>
                <p className="text-sm text-[#435449] leading-relaxed">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="py-16 sm:py-20 border-t border-[#9CAF88]/30"
        aria-labelledby="faq-heading"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-3">
            <p className="text-xs font-semibold tracking-[0.02em] text-[#535C52]">
              Questions
            </p>
            <h2
              id="faq-heading"
              className="text-[28px] sm:text-[32px] font-semibold leading-[1.2] tracking-[-0.015em] text-[#2F3E34]"
            >
              Common questions
            </h2>
            <p className="text-sm text-[#435449] leading-relaxed">
              Direct answers on how deadlines, claims, disputes, and releases work on chain.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.question} className="editorial-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E6ECE0]/35 transition-colors"
                  >
                    <span className="text-base font-semibold text-[#2F3E34]">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#2F3E34] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-6 pb-6 pt-1 text-sm text-[#435449] leading-[1.65] border-t border-[#9CAF88]/20">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
