import React, { useState } from 'react';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';
import { Search, X, Check, Image as ImageIcon } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  const categories = ['All', 'DevOps', 'Automation', 'Monitoring', 'Databases', 'Networking', 'Security', 'Storage', 'Media', 'General'];

  const filteredIcons = AVAILABLE_ICONS.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelectIcon(customInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Select Service Icon</h3>
            <p className="text-xs text-[var(--text-secondary)]">Choose from curated system icons or provide a custom image URL</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-[var(--border-subtle)] space-y-3 bg-[var(--bg-card)]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search icons by name, category, or tool..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent)] text-white font-medium shadow-xs'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filteredIcons.map((item) => {
            const isSelected = selectedIcon === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  onSelectIcon(item.name);
                  onClose();
                }}
                className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent-text)]'
                    : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)]'
                }`}
              >
                <div className={`p-2 rounded-md ${isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>
                  <IconRenderer name={item.name} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{item.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{item.label}</div>
                </div>
                {isSelected && <Check size={14} className="text-[var(--accent)] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Custom Icon / Image URL input */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
          <form onSubmit={handleApplyCustom} className="flex gap-2 items-center">
            <div className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0">
              <ImageIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Or enter image/svg URL (e.g. https://... or /logo.png)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Use Custom URL
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
