import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Database, Hash, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMappingStore } from '../../store/useMappingStore';

const PAGE_SIZE = 50;

export function MappingsPage() {
  const mappings = useMappingStore((s) => s.mappings);
  const lastUpdated = useMappingStore((s) => s.lastUpdated);
  const searchMappings = useMappingStore((s) => s.searchMappings);
  const getTemplateIds = useMappingStore((s) => s.getTemplateIds);
  const removeMappingsByTemplateId = useMappingStore((s) => s.removeMappingsByTemplateId);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloading, setReloading] = useState(false);

  const uniqueTemplateIds = useMemo(() => getTemplateIds(), [mappings, getTemplateIds]);

  const filtered = useMemo(() => {
    return searchMappings(query);
  }, [query, searchMappings, mappings]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Group page items by template ID for visual grouping
  const groupedItems = useMemo(() => {
    const groups: { templateId: number; items: typeof pageItems }[] = [];
    let currentGroup: (typeof groups)[0] | null = null;

    for (const item of pageItems) {
      if (!currentGroup || currentGroup.templateId !== item.templateId) {
        currentGroup = { templateId: item.templateId, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }
    return groups;
  }, [pageItems]);

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      // Clear and reload from CSV
      const response = await fetch('/mappings.csv');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const entries = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        if (cols.length >= 3) {
          const templateId = parseInt(cols[2], 10);
          if (!isNaN(templateId)) {
            entries.push({ brand: cols[0], categoryCode: cols[1], templateId });
          }
        }
      }
      useMappingStore.setState({
        mappings: entries,
        isLoaded: true,
        lastUpdated: new Date().toISOString(),
      });
      toast.success(`Reloaded ${entries.length} mappings from CSV`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reload';
      toast.error(`Reload failed: ${msg}`);
    } finally {
      setReloading(false);
    }
  }, []);

  const handleRemoveTemplate = useCallback((templateId: number) => {
    removeMappingsByTemplateId(templateId);
    toast.success(`Removed all mappings for template ID ${templateId}`);
  }, [removeMappingsByTemplateId]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Template ID Mappings</h2>
        <p className="text-slate-400 mt-2">
          Browse and search brand/category → template ID mappings
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">
            <span className="font-semibold text-white">{mappings.length.toLocaleString()}</span> total mappings
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <Hash className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">
            <span className="font-semibold text-white">{uniqueTemplateIds.size}</span> unique template IDs
          </span>
        </div>
        {lastUpdated && (
          <div className="text-xs text-slate-500">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Search + Reload */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by template ID, brand, or category code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all
              placeholder:text-slate-500"
          />
        </div>
        <motion.button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
          Reload from CSV
        </motion.button>
      </div>

      {/* Results count */}
      {query && (
        <p className="text-xs text-slate-500">
          Showing {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3 w-32">
                Template ID
              </th>
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                Brand
              </th>
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                Category Code
              </th>
              <th className="text-right text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.map((group) => (
              group.items.map((item, idx) => (
                <tr
                  key={`${group.templateId}-${idx}`}
                  className={`
                    hover:bg-slate-800/50 transition-colors
                    ${idx === 0 ? 'border-t-2 border-slate-600/50 bg-slate-800/40' : 'bg-slate-800/20'}
                  `}
                >
                  <td className="px-4 py-2">
                    {idx === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-400 border border-blue-500/30 text-sm font-mono font-semibold">
                        {item.templateId}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600 font-mono pl-2">
                        {item.templateId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-300">{item.brand}</td>
                  <td className="px-4 py-2 text-sm text-slate-400 font-mono">{item.categoryCode}</td>
                  <td className="px-4 py-2 text-right">
                    {idx === 0 && (
                      <button
                        onClick={() => handleRemoveTemplate(item.templateId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title={`Remove all mappings for template ${item.templateId}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm">
                  {query ? 'No mappings match your search' : 'No mappings loaded'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <motion.button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={currentPage > 1 ? { scale: 1.02 } : undefined}
            whileTap={currentPage > 1 ? { scale: 0.98 } : undefined}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </motion.button>

          <span className="text-sm text-slate-400">
            Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </span>

          <motion.button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={currentPage < totalPages ? { scale: 1.02 } : undefined}
            whileTap={currentPage < totalPages ? { scale: 0.98 } : undefined}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
