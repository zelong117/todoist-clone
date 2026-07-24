import { X, Zap, Check, Star } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

const FEATURES = [
  { text: '\u65e0\u9650\u9879\u76ee\u521b\u5efa', free: '5 \u4e2a', pro: '\u65e0\u9650' },
  { text: 'AI \u52a9\u624b\u4f7f\u7528', free: '3 \u6b21/\u5929', pro: '\u65e0\u9650' },
  { text: '\u56de\u5faa\u5f85\u529e\u529f\u80fd', free: false, pro: true },
  { text: '\u56e2\u961f\u534f\u4f5c', free: false, pro: true },
  { text: '\u4f18\u5148\u6280\u672f\u652f\u6301', free: false, pro: true },
];

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-[var(--accent)] to-[#B83A2E] text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">\u5347\u7ea7\u5230 Pro</h2>
              <p className="text-sm text-white/80">\u89e3\u9501\u5168\u90e8\u529f\u80fd</p>
            </div>
          </div>
          {reason && (
            <p className="text-sm text-white/90 bg-white/10 rounded-lg px-3 py-2 mt-2">{reason}</p>
          )}
        </div>

        {/* Feature Comparison */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-[var(--text-tertiary)] mb-3 pb-2 border-b border-[var(--border-color)]">
            <span>\u529f\u80fd</span>
            <span className="text-center">\u514d\u8d39\u7248</span>
            <span className="text-center text-[var(--accent)]">Pro</span>
          </div>
          {FEATURES.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-[var(--border-light)] last:border-0">
              <span className="text-[var(--text-primary)]">{f.text}</span>
              <span className="text-center text-[var(--text-tertiary)]">
                {f.free === false ? <X size={14} className="mx-auto text-red-400" /> : f.free}
              </span>
              <span className="text-center text-[var(--text-primary)]">
                {f.pro === true ? <Check size={14} className="mx-auto text-green-500" /> : f.pro}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button className="w-full py-3 bg-gradient-to-r from-[var(--accent)] to-[#B83A2E] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all duration-200 shadow-lg flex items-center justify-center gap-2">
            <Star size={16} fill="white" />
            \u7acb\u5373\u5347\u7ea7 \u2014 \u00a529/\u6708
          </button>
          <p className="text-center text-xs text-[var(--text-tertiary)] mt-3">\u968f\u65f6\u53ef\u53d6\u6d88\uff0c\u65e0\u9700\u7ed1\u5b9a</p>
        </div>
      </div>
    </div>
  );
}
