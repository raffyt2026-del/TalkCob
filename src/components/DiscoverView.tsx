import React from 'react';
import { ArrowRight, Check, Lock, Menu, MessageSquare } from 'lucide-react';
import { AppTheme, Server } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { TalkcobIcon } from './TalkcobIcon';

const FREE_INCLUDED_FEATURES = [
  'Unlimited channels & HD voice rooms',
  'Full-size image uploads & reactions',
  'Custom profiles, themes & shortcuts',
  '100% free forever with zero paywalls',
];

interface DiscoverViewProps {
  existingServers: Server[];
  onOpenServer: (serverId: string) => void;
  onOpenMobileMenu: () => void;
  theme: AppTheme;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  existingServers,
  onOpenServer,
  onOpenMobileMenu,
  theme,
}) => {
  const t = THEME_TOKENS[theme];

  return (
    <main className={`flex-1 min-w-0 h-full overflow-y-auto talkcob-scroll ${t.chatBg}`}>
      <div className={`md:hidden h-12 px-4 flex items-center gap-3 border-b ${t.headerBg} ${t.border}`}>
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation sidebar"
          className={`p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className={`font-display font-bold text-sm ${t.textPrimary}`}>Talkcob Overview</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Hero Card showcasing the red Talkcob talking icon & 100% Free commitment */}
        <section
          className={`rounded-2xl border p-8 flex flex-col gap-6 ${t.dockBg} ${t.border}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="shrink-0">
              <TalkcobIcon size={72} variant="badge" badgeColor="#E53935" animated />
            </div>
            <div>
              <h1 className={`font-display font-extrabold text-2xl sm:text-3xl tracking-tight ${t.textPrimary}`}>
                Talkcob — Free Voice & Community Chat
              </h1>
              <p className={`text-sm sm:text-base mt-1.5 max-w-xl leading-relaxed ${t.textMuted}`}>
                Everything on Talkcob is 100% free with zero paid tiers or locked features. Talkcob HQ is your permanent home server.
              </p>
            </div>
          </div>

          <div className={`pt-4 border-t ${t.border} grid grid-cols-1 sm:grid-cols-2 gap-2.5`}>
            {FREE_INCLUDED_FEATURES.map((feat) => (
              <div key={feat} className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                <Check className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Talkcob HQ Card */}
        <section className={`rounded-xl border p-6 ${t.sidebarBg} ${t.border}`}>
          <h2 className={`font-display font-bold text-base mb-3 ${t.textPrimary}`}>
            Your Servers ({existingServers.length})
          </h2>
          <div className="space-y-3">
            {existingServers.map((srv) => (
              <div
                key={srv.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${t.border} ${t.dockBg}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: srv.iconUrl ? undefined : srv.accentColor }}
                  >
                    {srv.iconUrl ? (
                      <img src={srv.iconUrl} alt={srv.name} className="w-full h-full object-cover" />
                    ) : (
                      srv.shortName
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-base font-display font-bold truncate flex items-center gap-2 ${t.textPrimary}`}>
                      <span>{srv.name}</span>
                      {srv.id === 'srv-hq' && (
                        <Lock className="w-3.5 h-3.5 text-[#EF4444]" aria-label="Permanent server" />
                      )}
                    </div>
                    <div className={`text-xs mt-0.5 ${t.textMuted}`}>{srv.description}</div>
                  </div>
                </div>

                <button
                  onClick={() => onOpenServer(srv.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E53935] hover:bg-[#C62828] text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open {srv.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
