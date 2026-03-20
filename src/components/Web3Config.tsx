import '@rainbow-me/rainbowkit/styles.css';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { arbitrum, mainnet, optimism, polygon } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

const config = getDefaultConfig({
  appName: 'Plank',
  projectId,
  chains: [mainnet, polygon, arbitrum, optimism],
  ssr: false,
});

const queryClient = new QueryClient();

export function Web3Config({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#10b981', accentColorForeground: 'white', borderRadius: 'medium' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
