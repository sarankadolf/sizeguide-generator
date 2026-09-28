import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MappingEntry {
  brand: string;
  categoryCode: string;
  templateId: number;
}

interface MappingStore {
  mappings: MappingEntry[];
  isLoaded: boolean;
  lastUpdated: string | null;
  loadMappings: () => Promise<void>;
  addMappings: (entries: MappingEntry[]) => void;
  removeMappingsByTemplateId: (id: number) => void;
  getTemplateIds: () => Set<number>;
  getNextAvailableId: () => number;
  isTemplateIdUsed: (id: number) => boolean;
  searchMappings: (query: string) => MappingEntry[];
  getMappingsByTemplateId: (id: number) => MappingEntry[];
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((val) => val.replace(/^"|"$/g, '').trim());
}

function parseCsv(text: string): MappingEntry[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const entries: MappingEntry[] = [];
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length >= 3) {
      const templateId = parseInt(cols[2], 10);
      if (!isNaN(templateId)) {
        entries.push({
          brand: cols[0],
          categoryCode: cols[1],
          templateId,
        });
      }
    }
  }
  return entries;
}

export const useMappingStore = create<MappingStore>()(
  persist(
    (set, get) => ({
      mappings: [],
      isLoaded: false,
      lastUpdated: null,

      loadMappings: async () => {
        // If already loaded from localStorage with data, skip fetch
        const state = get();
        if (state.isLoaded && state.mappings.length > 0) return;

        try {
          const response = await fetch('/mappings.csv');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const text = await response.text();
          const entries = parseCsv(text);
          set({
            mappings: entries,
            isLoaded: true,
            lastUpdated: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to load mappings CSV:', err);
          set({ isLoaded: true });
        }
      },

      addMappings: (entries) =>
        set((state) => ({
          mappings: [...state.mappings, ...entries],
          lastUpdated: new Date().toISOString(),
        })),

      removeMappingsByTemplateId: (id) =>
        set((state) => ({
          mappings: state.mappings.filter((m) => m.templateId !== id),
          lastUpdated: new Date().toISOString(),
        })),

      getTemplateIds: () => {
        const { mappings } = get();
        return new Set(mappings.map((m) => m.templateId));
      },

      getNextAvailableId: () => {
        const { mappings } = get();
        if (mappings.length === 0) return 1;
        let max = 0;
        for (const m of mappings) {
          if (m.templateId > max) max = m.templateId;
        }
        return max + 1;
      },

      isTemplateIdUsed: (id) => {
        const { mappings } = get();
        return mappings.some((m) => m.templateId === id);
      },

      searchMappings: (query) => {
        const { mappings } = get();
        if (!query.trim()) return mappings;
        const q = query.toLowerCase().trim();
        const numQ = parseInt(q, 10);

        return mappings.filter((m) => {
          if (!isNaN(numQ) && m.templateId === numQ) return true;
          if (m.brand.toLowerCase().includes(q)) return true;
          if (m.categoryCode.toLowerCase().includes(q)) return true;
          if (String(m.templateId).includes(q)) return true;
          return false;
        });
      },

      getMappingsByTemplateId: (id) => {
        const { mappings } = get();
        return mappings.filter((m) => m.templateId === id);
      },
    }),
    {
      name: 'sizeguide-mappings',
      partialize: (state) => ({
        mappings: state.mappings,
        isLoaded: state.isLoaded,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
