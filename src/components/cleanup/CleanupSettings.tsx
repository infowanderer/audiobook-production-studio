import { X } from 'lucide-react';
import type { CleanupConfig } from '@/processing/cleanup/types';
import { ALL_CLEANUP_RULES } from '@/processing/cleanup/rules';

interface CleanupSettingsProps {
  config: CleanupConfig;
  onSave: (config: CleanupConfig) => void;
  onClose: () => void;
}

const PLACEHOLDER_RULES = [
  {
    id: 'remove_publisher_ads',
    name: 'Remove Publisher Advertisements',
    description: 'Detects and removes publisher promotional content. (Coming in a future update)',
    category: 'advanced',
  },
  {
    id: 'remove_copyright_pages',
    name: 'Remove Copyright Pages',
    description: 'Detects and removes copyright and legal boilerplate. (Coming in a future update)',
    category: 'advanced',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  artifact_removal: 'Artifact Removal',
  whitespace: 'Whitespace',
  unicode: 'Unicode',
  structural: 'Structural',
  advanced: 'Advanced (Placeholder)',
};

export function CleanupSettings({ config, onSave, onClose }: CleanupSettingsProps) {
  const allRules = [
    ...ALL_CLEANUP_RULES.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      placeholder: false,
    })),
    ...PLACEHOLDER_RULES.map((r) => ({ ...r, placeholder: true })),
  ];

  const categories = [...new Set(allRules.map((r) => r.category))];

  const toggle = (ruleId: string) => {
    onSave({ ...config, [ruleId]: !config[ruleId] });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Cleanup Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h3>
              <div className="space-y-2">
                {allRules
                  .filter((r) => r.category === cat)
                  .map((rule) => (
                    <label
                      key={rule.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
                        ${rule.placeholder ? 'opacity-60' : 'hover:bg-slate-700/40'}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!config[rule.id]}
                        onChange={() => toggle(rule.id)}
                        disabled={rule.placeholder}
                        className="mt-0.5 rounded border-slate-600 bg-slate-900 text-sky-500
                          focus:ring-sky-500 focus:ring-offset-0"
                      />
                      <div>
                        <div className="text-sm text-slate-200">{rule.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500
              rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
