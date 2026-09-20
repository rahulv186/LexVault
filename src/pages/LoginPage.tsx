import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, Loader2, Wallet } from 'lucide-react';
import { cn } from '../utils/cn';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useSignMessage } from 'wagmi';
import apiClient from '../services/apiClient';

export const LoginPage: React.FC = () => {
  const { loginWithWallet } = useAuth();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletAuth = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request nonce from backend
      const nonceRes = await apiClient.get('/api/auth/nonce', {
        params: { wallet_address: address },
      });
      const nonce = nonceRes.data.nonce;

      // 2. Construct SIWE-like message
      const domain = 'lexvault.io';
      const statement = 'I authorize LexVault to authenticate my identity for secure evidence access.';
      const message = `LexVault Authentication\n\nDomain: ${domain}\nAddress: ${address}\nStatement: ${statement}\nNonce: ${nonce}\n\nPlease sign this message to prove ownership of your wallet.`;

      // 3. Sign the message
      const signature = await signMessageAsync({
        message,
      });

      // 4. Send signature to backend for JWT
      await loginWithWallet(address, signature, message);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="LexVault Authentication">
      <div className="max-w-md mx-auto mt-20">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-security-accent/10 text-security-accent">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Secure Access</h2>
            <p className="text-gray-500 text-sm">
              Authenticate using your digital identity to access the forensic vault.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-security-black border border-security-gray-700 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold mb-4">Wallet Authentication</p>
              <div className="flex flex-col items-center gap-4">
                <ConnectKitButton />

                {address && (
                  <button
                    onClick={handleWalletAuth}
                    disabled={loading}
                    className="w-full py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Verify & Sign In
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            <div className="text-center p-4 rounded-lg bg-security-gray-800/30 border border-security-gray-700">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                You will be asked to sign a message to prove wallet ownership.
                This is an off-chain signature and <span className="text-gray-300 font-bold">does not cost any gas.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default LoginPage;
