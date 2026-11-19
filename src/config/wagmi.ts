import { connectorsForWallets, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import {
  arcChain,
  ARC_RPC_URL,
  WALLETCONNECT_PROJECT_ID,
  hasWalletConnectId,
} from './chain';

export const wagmiConfig = hasWalletConnectId
  ? getDefaultConfig({
      appName: 'Sertyme',
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [arcChain],
      transports: {
        [arcChain.id]: http(ARC_RPC_URL),
      },
      ssr: false,
    })
  : createConfig({
      chains: [arcChain],
      connectors: connectorsForWallets(
        [
          {
            groupName: 'Browser Wallets',
            wallets: [injectedWallet],
          },
        ],
        {
          appName: 'Sertyme',
          projectId: WALLETCONNECT_PROJECT_ID,
        }
      ),
      transports: {
        [arcChain.id]: http(ARC_RPC_URL),
      },
      ssr: false,
    });
