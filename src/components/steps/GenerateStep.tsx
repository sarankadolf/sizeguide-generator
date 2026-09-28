import { useEffect, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Eye,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Circle,
  ChevronDown,
  FileCode2,
  ImageIcon,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGuideStore } from '../../store/useGuideStore';
import { useMappingStore } from '../../store/useMappingStore';
import { generateSizeGuideHtml } from '../../lib/generator/engine';
import { downloadAsZip, downloadSingleFile } from '../../lib/utils/zip';
import {
  extractImagesFromExcel,
  downloadImagesAsZip,
} from '../../lib/excel/image-extractor';
import type { GeneratedFile } from '../../types';
import type { ExtractedImage } from '../../lib/excel/image-extractor';
import { buildImageBaseName } from '../../lib/utils/sanitize';

export function GenerateStep() {
  const guides = useGuideStore((s) => s.guides);
  const imageBaseUrl = useGuideStore((s) => s.imageBaseUrl);
  const generatedFiles = useGuideStore((s) => s.generatedFiles);
  const generationProgress = useGuideStore((s) => s.generationProgress);
  const isGenerating = useGuideStore((s) => s.isGenerating);
  const previewLanguage = useGuideStore((s) => s.previewLanguage);
  const updateGuide = useGuideStore((s) => s.updateGuide);
  const addGeneratedFile = useGuideStore((s) => s.addGeneratedFile);
  const setGenerationProgress = useGuideStore((s) => s.setGenerationProgress);
  const setIsGenerating = useGuideStore((s) => s.setIsGenerating);
  const setPreviewLanguage = useGuideStore((s) => s.setPreviewLanguage);
  const reset = useGuideStore((s) => s.reset);
  const setStep = useGuideStore((s) => s.setStep);

  const addMappings = useMappingStore((s) => s.addMappings);

  const [showDownloadList, setShowDownloadList] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [imagesExtracting, setImagesExtracting] = useState(false);
  const hasStarted = useRef(false);

  // Total files to generate (each guide has EN and AR variants)
  const totalFiles = guides.length * 2;

  // Run generation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const generate = async () => {
      setIsGenerating(true);
      setGenerationProgress(0);

      let completed = 0;

      for (const guide of guides) {
        if (!guide.generatorData || guide.guideNumber === null) {
          updateGuide(guide.id, { status: 'error', error: 'Missing generator data or guide number' });
          completed += 2;
          setGenerationProgress(Math.round((completed / totalFiles) * 100));
          continue;
        }

        updateGuide(guide.id, { status: 'generating' });

        for (const lang of ['en', 'ar'] as const) {
          try {
            const langSuffix = lang;
            const imageUrl = `${imageBaseUrl}${buildImageBaseName(guide.guideNumber, guide.fileName, lang)}`;
            // Use AR-specific parsed data for Arabic, fall back to EN data
            const dataForLang = lang === 'ar' && guide.arGeneratorData
              ? guide.arGeneratorData
              : guide.generatorData!;
            const html = generateSizeGuideHtml(dataForLang, lang, imageUrl);
            const fileName = `sizeguide_${guide.guideNumber}_${langSuffix}.html`;

            const generatedFile: GeneratedFile = {
              fileName,
              filename: fileName,
              language: lang === 'en' ? 'EN' : 'AR',
              html,
              content: html,
              guideId: guide.id,
            };

            addGeneratedFile(generatedFile);
            completed++;
            setGenerationProgress(Math.round((completed / totalFiles) * 100));

            // Small delay for visual effect
            await new Promise((r) => setTimeout(r, 150));
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Generation failed';
            updateGuide(guide.id, { status: 'error', error: message });
            toast.error(`Failed to generate ${guide.fileName} (${lang.toUpperCase()}): ${message}`);
            completed++;
            setGenerationProgress(Math.round((completed / totalFiles) * 100));
          }
        }

        // Only mark done if not already errored
        const currentGuide = guides.find((g) => g.id === guide.id);
        if (currentGuide?.status !== 'error') {
          updateGuide(guide.id, { status: 'done' });
        }
      }

      setIsGenerating(false);
      toast.success('All size guides generated successfully!');
    };

    generate();
  }, [
    guides,
    imageBaseUrl,
    totalFiles,
    updateGuide,
    addGeneratedFile,
    setGenerationProgress,
    setIsGenerating,
  ]);

  // Update preview when language changes or files are generated
  useEffect(() => {
    const previewFile = generatedFiles.find((f) => f.language === previewLanguage);
    if (previewFile) {
      setPreviewHtml(previewFile.html);
    }
  }, [previewLanguage, generatedFiles]);

  const handleDownloadZip = useCallback(async () => {
    try {
      await downloadAsZip(generatedFiles);
      toast.success('ZIP downloaded!');
    } catch {
      toast.error('Failed to create ZIP');
    }
  }, [generatedFiles]);

  const handleDownloadImages = useCallback(async () => {
    setImagesExtracting(true);
    try {
      const allImages: ExtractedImage[] = [];

      for (const guide of guides) {
        if (!guide.file || guide.guideNumber === null) continue;

        const buffer = await guide.file.arrayBuffer();
        const images = await extractImagesFromExcel(
          buffer,
          guide.fileName,
          guide.guideNumber
        );
        allImages.push(...images);
      }

      if (allImages.length === 0) {
        toast.error('No images found in the uploaded Excel files');
        return;
      }

      await downloadImagesAsZip(allImages);
      toast.success(`Downloaded ${allImages.length} image(s)!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image extraction failed';
      toast.error(`Failed to extract images: ${message}`);
    } finally {
      setImagesExtracting(false);
    }
  }, [guides]);

  const handleDownloadFile = useCallback((file: GeneratedFile) => {
    downloadSingleFile(file);
  }, []);

  const handleStartOver = useCallback(() => {
    reset();
    setStep('upload');
  }, [reset, setStep]);

  const handleUpdateMappings = useCallback(() => {
    const newEntries: { brand: string; categoryCode: string; templateId: number }[] = [];

    for (const g of guides) {
      if (g.guideNumber === null) continue;
      const templateId = g.guideNumber;

      // Get categories from parsed EN data (col A of Excel)
      const categories = g.generatorData?.categories ?? [];
      // Get brands from parsed EN data (Brand Name column)
      const brands = g.generatorData?.brands ?? [];
      const brandNames = brands.map(([name]) => name);
      const brandLabel = brandNames.length > 0 ? brandNames.join(', ') : g.fileName.replace(/\.[^.]+$/, '');

      if (categories.length > 0) {
        // One mapping entry per category code (matching the CSV format)
        for (const cat of categories) {
          newEntries.push({ brand: brandLabel, categoryCode: cat, templateId });
        }
      } else {
        // Fallback: single entry with filename as category
        newEntries.push({
          brand: brandLabel,
          categoryCode: g.fileName.replace(/\.[^.]+$/, ''),
          templateId,
        });
      }
    }

    if (newEntries.length === 0) {
      toast.error('No guides with valid numbers to add');
      return;
    }

    addMappings(newEntries);
    toast.success(`Mappings updated with ${newEntries.length} new entries`);
  }, [guides, addMappings]);

  const getFileStatus = useCallback(
    (guideId: string, lang: 'EN' | 'AR') => {
      const guide = guides.find((g) => g.id === guideId);
      if (!guide) return 'pending';
      const file = generatedFiles.find((f) => f.guideId === guideId && f.language === lang);
      if (file) return 'done';
      if (guide.status === 'generating') return 'generating';
      return 'pending';
    },
    [guides, generatedFiles]
  );

  // Check if any guides have files available for image extraction
  const hasFilesForImageExtraction = guides.some(
    (g) => g.file && g.guideNumber !== null
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Generate & Download</h2>
        <p className="text-slate-400 mt-2">
          {isGenerating
            ? 'Generating your size guide HTML files...'
            : 'All files are ready for download'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Generation Progress</span>
          <span className="text-sm font-mono text-blue-400">
            {generatedFiles.length}/{totalFiles} files
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
            initial={{ width: 0 }}
            animate={{ width: `${generationProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">{generationProgress}% complete</p>
      </div>

      {/* File Status List */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-300">Generated Files</h3>
        </div>
        <div className="divide-y divide-slate-700/30">
          {guides.map((guide) =>
            (['EN', 'AR'] as const).map((lang) => {
              const status = getFileStatus(guide.id, lang);
              return (
                <div
                  key={`${guide.id}-${lang}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : status === 'generating' ? (
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-sm text-slate-300 font-mono">
                      sizeguide_{guide.guideNumber}_{lang.toLowerCase()}.html
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        lang === 'EN'
                          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-600/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {lang}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      status === 'done'
                        ? 'text-green-400'
                        : status === 'generating'
                          ? 'text-yellow-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {status === 'done' ? 'Complete' : status === 'generating' ? 'Generating...' : 'Pending'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Preview */}
      {generatedFiles.length > 0 && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-300">Preview</h3>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-600 p-0.5">
              <button
                onClick={() => setPreviewLanguage('EN')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  previewLanguage === 'EN'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setPreviewLanguage('AR')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  previewLanguage === 'AR'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AR
              </button>
            </div>
          </div>
          <div className="p-4">
            <iframe
              srcDoc={previewHtml}
              title="Size Guide Preview"
              className="w-full h-[400px] rounded-lg border border-slate-700 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <motion.button
          onClick={handleStartOver}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4" />
          Start Over
        </motion.button>

        <div className="flex items-center gap-3">
          {/* Individual Download Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setShowDownloadList(!showDownloadList)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={generatedFiles.length === 0}
            >
              <FileCode2 className="w-4 h-4" />
              Individual Files
              <ChevronDown className={`w-3 h-3 transition-transform ${showDownloadList ? 'rotate-180' : ''}`} />
            </motion.button>

            {showDownloadList && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 bottom-full mb-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-20"
              >
                {generatedFiles.map((file) => (
                  <button
                    key={file.fileName}
                    onClick={() => {
                      handleDownloadFile(file);
                      setShowDownloadList(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono truncate">{file.fileName}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Download Images */}
          <motion.button
            onClick={handleDownloadImages}
            disabled={isGenerating || !hasFilesForImageExtraction || imagesExtracting}
            className={`
              flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all
              ${!isGenerating && hasFilesForImageExtraction && !imagesExtracting
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            whileHover={!isGenerating && hasFilesForImageExtraction && !imagesExtracting ? { scale: 1.02 } : undefined}
            whileTap={!isGenerating && hasFilesForImageExtraction && !imagesExtracting ? { scale: 0.98 } : undefined}
          >
            {imagesExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {imagesExtracting ? 'Extracting...' : 'Download Images'}
          </motion.button>

          {/* Update Mappings */}
          <motion.button
            onClick={handleUpdateMappings}
            disabled={isGenerating || generatedFiles.length === 0}
            className={`
              flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all
              ${!isGenerating && generatedFiles.length > 0
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            whileHover={!isGenerating && generatedFiles.length > 0 ? { scale: 1.02 } : undefined}
            whileTap={!isGenerating && generatedFiles.length > 0 ? { scale: 0.98 } : undefined}
          >
            <Database className="w-4 h-4" />
            Update Mappings
          </motion.button>

          {/* Download ZIP */}
          <motion.button
            onClick={handleDownloadZip}
            disabled={isGenerating || generatedFiles.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all
              ${!isGenerating && generatedFiles.length > 0
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            whileHover={!isGenerating && generatedFiles.length > 0 ? { scale: 1.02 } : undefined}
            whileTap={!isGenerating && generatedFiles.length > 0 ? { scale: 0.98 } : undefined}
          >
            <Download className="w-4 h-4" />
            Download HTML ZIP
          </motion.button>
        </div>
      </div>
    </div>
  );
}
