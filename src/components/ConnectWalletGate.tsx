import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

interface ConnectWalletGateProps {
  title: string;
  description: string;
}

export function ConnectWalletGate({ title, description }: ConnectWalletGateProps) {
  return (
    <section className="max-w-[640px] mx-auto my-8">
      <div className="editorial-card p-8 sm:p-10 text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-[#E6ECE0] text-[#2F3E34] mx-auto flex items-center justify-center">
          <Wallet className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-2.5">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-[#2F3E34]">
            {title}
          </h2>
          <p className="text-base text-[#435449] leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                type="button"
                onClick={openConnectModal}
                className="px-6 py-3 rounded-xl bg-[#C9A24B] text-[#2F3E34] text-sm font-semibold tracking-[0.01em] hover:brightness-95 transition-[filter] duration-150 cursor-pointer whitespace-nowrap"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>
    </section>
  );
}
