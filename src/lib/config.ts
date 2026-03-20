let _walletConnectProjectId: string | null = null;

export async function getWalletConnectProjectId(): Promise<string> {
  if (_walletConnectProjectId !== null) return _walletConnectProjectId;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      _walletConnectProjectId = data.walletConnectProjectId ?? '';
    }
  } catch {
    _walletConnectProjectId = '';
  }
  return _walletConnectProjectId ?? '';
}
