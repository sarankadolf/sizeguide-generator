import { create } from 'zustand';
import type { Step, SizeGuideConfig, GeneratedFile } from '../types';

interface GuideStore {
  currentStep: Step;
  guides: SizeGuideConfig[];
  imageBaseUrl: string;
  generatedFiles: GeneratedFile[];
  generationProgress: number;
  isGenerating: boolean;
  previewLanguage: 'EN' | 'AR';

  setStep: (step: Step) => void;
  addGuide: (guide: SizeGuideConfig) => void;
  removeGuide: (id: string) => void;
  updateGuide: (id: string, updates: Partial<SizeGuideConfig>) => void;
  setImageBaseUrl: (url: string) => void;
  setGeneratedFiles: (files: GeneratedFile[]) => void;
  addGeneratedFile: (file: GeneratedFile) => void;
  setGenerationProgress: (progress: number) => void;
  setIsGenerating: (generating: boolean) => void;
  setPreviewLanguage: (lang: 'EN' | 'AR') => void;
  autoFillNumbers: (startNumber: number) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'upload' as Step,
  guides: [] as SizeGuideConfig[],
  imageBaseUrl: 'https://media.centrepointstores.com/i/centrepoint/',
  generatedFiles: [] as GeneratedFile[],
  generationProgress: 0,
  isGenerating: false,
  previewLanguage: 'EN' as const,
};

export const useGuideStore = create<GuideStore>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  addGuide: (guide) =>
    set((state) => ({ guides: [...state.guides, guide] })),

  removeGuide: (id) =>
    set((state) => ({ guides: state.guides.filter((g) => g.id !== id) })),

  updateGuide: (id, updates) =>
    set((state) => ({
      guides: state.guides.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  setImageBaseUrl: (url) => set({ imageBaseUrl: url }),

  setGeneratedFiles: (files) => set({ generatedFiles: files }),

  addGeneratedFile: (file) =>
    set((state) => ({
      generatedFiles: [...state.generatedFiles, file],
    })),

  setGenerationProgress: (progress) => set({ generationProgress: progress }),

  setIsGenerating: (generating) => set({ isGenerating: generating }),

  setPreviewLanguage: (lang) => set({ previewLanguage: lang }),

  autoFillNumbers: (startNumber) =>
    set((state) => ({
      guides: state.guides.map((g, i) => ({
        ...g,
        guideNumber: startNumber + i,
      })),
    })),

  reset: () => set(initialState),
}));
