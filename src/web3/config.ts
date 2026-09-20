import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    coinbaseWallet(),
    walletConnect({
      projectId: '3b4ead6245ef5dd2c2f0ae8d22ed2936',
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});
