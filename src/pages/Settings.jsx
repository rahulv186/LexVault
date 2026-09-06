import React from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Shield, Bell, Globe, Database, User } from 'lucide-react';

const SettingSection = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <Shield className="w-5 h-5 text-security-accent" />
      {title}
    </h3>
    <div className="glass-card p-6 space-y-6">
      {children}
    </div>
  </div>
);

const SettingField = ({ label, description, children }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-300">{label}</label>
    </div>
    <p className="text-xs text-gray-500 mb-2">{description}</p>
    {children}
  </div>
);

export const Settings = () => {
  return (
    <PageContainer title="Vault Settings">
      <div className="max-w-3xl mx-auto">
        <SettingSection title="User Profile">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-full bg-security-gray-800 flex items-center justify-center border border-security-gray-700">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h4 className="text-white font-bold">Operator_A</h4>
              <p className="text-xs text-gray-500">Security Clearance: Level 3 (Senior Investigator)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Display Name" description="Publicly visible name on custody logs">
              <input type="text" className="w-full bg-security-black border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white" defaultValue="Operator_A" />
            </SettingField>
            <SettingField label="Notification Email" description="Alerts for integrity mismatches">
              <input type="email" className="w-full bg-security-black border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white" defaultValue="op_a@lexvault.sec" />
            </SettingField>
          </div>
        </SettingSection>

        <SettingSection title="Infrastructure Configuration">
          <div className="space-y-6">
            <SettingField label="Blockchain Network" description="Target network for evidence anchoring">
              <select className="w-full bg-security-black border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option>Sepolia Testnet (Default)</option>
                <option>Goerli Testnet</option>
                <option>Ethereum Mainnet</option>
                <option>Private Forensic Chain</option>
              </select>
            </SettingField>
            <SettingField label="IPFS Gateway" description="Preferred gateway for evidence retrieval">
              <input type="text" className="w-full bg-security-black border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white" defaultValue="https://ipfs.io/ipfs/" />
            </SettingField>
            <SettingField label="ZK Circuit Version" description="Circuit used for proof generation">
              <select className="w-full bg-security-black border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option>v1.0.4-stable</option>
                <option>v1.1.0-beta (Optimized)</option>
              </select>
            </SettingField>
          </div>
        </SettingSection>

        <SettingSection title="Security Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-security-black border border-security-gray-700">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-white">Instant Integrity Alerts</p>
                  <p className="text-xs text-gray-500">Notify immediately on hash mismatch</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-security-accent rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-security-black rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-security-black border border-security-gray-700">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-white">Hardware Key Enforcement</p>
                  <p className="text-xs text-gray-500">Require YubiKey for custody transfers</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-security-gray-700 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-3 h-3 bg-security-black rounded-full"></div>
              </div>
            </div>
          </div>
        </SettingSection>

        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Discard Changes</button>
          <button className="px-6 py-2 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors text-sm">Save Configuration</button>
        </div>
      </div>
    </PageContainer>
  );
};

export default Settings;
