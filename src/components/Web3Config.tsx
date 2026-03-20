import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React from 'react';

const config = getDefaultConfig({
  appName: 'Plank',
  projectId: 'YOUR_PROJECT_ID', // In a real app, this would be from env
  chains: [mainnet, polygon, arbitrum, optimism],
  ssr: false,
});

const queryClient = new QueryClient();

export function Web3Config({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#10b981', // emerald-500
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
