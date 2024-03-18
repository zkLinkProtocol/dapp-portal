type WalletEntry = { walletName: string; type: "injected" | "metaMask" | "walletConnect" | "safe"};

export const confirmedSupportedWallets: WalletEntry[] = [
  { walletName: "MetaMask", type: "metaMask" },

  { walletName: "MetaMask", type: "injected" },
  { walletName: "BitKeep", type: "injected" },
  { walletName: "BlockWallet", type: "injected" },
  { walletName: "MathWallet", type: "injected" },
  { walletName: "ImToken", type: "injected" },
  
  { walletName: "MetaMask", type: "walletConnect" },
  { walletName: "imToken", type: "walletConnect" },
  { walletName: "OKX", type: "walletConnect" },
  { walletName: "Binance Web3", type: "walletConnect" },
  { walletName: "Bitget", type: "walletConnect" },
  { walletName: "Trust", type: "walletConnect" },
  { walletName: "TokenPocket", type: "walletConnect" },
  { walletName: "Safe", type: "safe" }
];

export const disabledWallets: WalletEntry[] = [
  { walletName: "Argent", type: "walletConnect" }, // Argent has different L1 and L2 Era addresses
];
