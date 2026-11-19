import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { CONTRACT_ADDRESS, getExplorerAddressUrl } from '../config/chain';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/lock', label: 'Lock a Deposit' },
  { to: '/deposits', label: 'My Deposits' },
  { to: '/landlord', label: 'Landlord Desk' },
] as const;

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
            className="shrink-0"
          >
            {!connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="px-4 py-2.5 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold tracking-[0.01em] hover:brightness-95 transition-[filter] duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="px-4 py-2.5 rounded-xl bg-[#9E2A2B] text-[#FFFFFF] text-sm font-semibold hover:brightness-95 transition-[filter] duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                Switch to Arc
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openChainModal}
                  className="hidden sm:inline-flex items-center px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#9CAF88]/40 text-[#2F3E34] text-xs font-semibold hover:border-[#2F3E34]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {chain.name}
                </button>
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="inline-flex items-center px-3.5 py-2 rounded-xl bg-[#2F3E34] text-[#F4F1EA] text-sm font-medium font-mono tabular-nums hover:bg-[#3A4C40] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {account.displayName}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA] text-[#2F3E34]">
      <header className="sticky top-0 z-40 bg-[#F4F1EA]/95 backdrop-blur-sm border-b border-[#9CAF88]/30">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-8">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="focus-visible:outline-[#C9A24B] rounded-lg"
            aria-label="Sertyme Home"
          >
            <Logo size={32} showWordmark />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                    isActive
                      ? 'text-[#2F3E34] border-[#C9A24B]'
                      : 'text-[#435449] border-transparent hover:text-[#2F3E34] hover:border-[#9CAF88]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <WalletButton />
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#9CAF88]/40 bg-[#FFFFFF] text-[#2F3E34] cursor-pointer"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            aria-label="Mobile"
            className="md:hidden border-t border-[#9CAF88]/30 bg-[#F4F1EA] px-5 py-4 flex flex-col gap-1"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FFFFFF] text-[#2F3E34] border border-[#9CAF88]/35'
                      : 'text-[#435449] hover:bg-[#FFFFFF]/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#2F3E34] text-[#F4F1EA] mt-20">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 pb-8 border-b border-[#F4F1EA]/15">
            <div className="space-y-2.5">
              <Logo size={30} showWordmark inverted />
              <p className="text-sm text-[#F4F1EA]/85 max-w-md leading-relaxed">
                A deposit keeper built on Arc with fixed claim windows and automatic release.
              </p>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm text-[#F4F1EA]/85 hover:text-[#F4F1EA] transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
              {CONTRACT_ADDRESS && (
                <a
                  href={getExplorerAddressUrl(CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#F4F1EA]/85 hover:text-[#F4F1EA] transition-colors whitespace-nowrap"
                >
                  Contract on Arcscan
                </a>
              )}
            </nav>
          </div>

          <div className="pt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-[#F4F1EA]">Built by Henrik</p>
            <p className="text-xs text-[#F4F1EA]/80">
              Sertyme is an independent project available on Arc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
