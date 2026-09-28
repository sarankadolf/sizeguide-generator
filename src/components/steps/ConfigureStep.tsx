import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Hash, AlertTriangle, Link, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGuideStore } from '../../store/useGuideStore';
import { useMappingStore } from '../../store/useMappingStore';
import { StatusBadge } from '../ui/StatusBadge';
import type { GuideStatus } from '../../types';
import {
  extractImagesFromExcel,
  downloadImagesAsZip,
} from '../../lib/excel/image-extractor';
import type { ExtractedImage } from '../../lib/excel/image-extractor';

function validateImageName(name: string): boolean {
  return /^[a-z0-9_]+$/.test(name);
}

export function ConfigureStep() {
  const guides = useGuideStore((s) => s.guides);
  const imageBaseUrl = useGuideStore((s) => s.imageBaseUrl);
  const updateGuide = useGuideStore((s) => s.updateGuide);
  const setImageBaseUrl = useGuideStore((s) => s.setImageBaseUrl);
  const autoFillNumbers = useGuideStore((s) => s.autoFillNumbers);
  const setStep = useGuideStore((s) => s.setStep);

  const getNextAvailableId = useMappingStore((s) => s.getNextAvailableId);
  const isTemplateIdUsed = useMappingStore((s) => s.isTemplateIdUsed);
  const mappingsLoaded = useMappingStore((s) => s.isLoaded);

  const [startNumber, setStartNumber] = useState(1);
  const [imagesExtracting, setImagesExtracting] = useState(false);

  // Pre-populate startNumber with next available ID once mappings are loaded
  useEffect(() => {
    if (mappingsLoaded) {
      setStartNumber(getNextAvailableId());
    }
  }, [mappingsLoaded, getNextAvailableId]);

  const handleAutoFill = useCallback(() => {
    autoFillNumbers(startNumber);
    toast.success(`Auto-filled guide numbers starting from ${startNumber}`);
  }, [autoFillNumbers, startNumber]);

  const handleGuideNumberChange = useCallback(
    (id: string, value: string) => {
      const num = value === '' ? null : parseInt(value, 10);
      updateGuide(id, { guideNumber: isNaN(num as number) ? null : num });
    },
    [updateGuide]
  );

  const handleImageNameChange = useCallback(
    (id: string, value: string) => {
      updateGuide(id, { imageName: value.toLowerCase() });
    },
    [updateGuide]
  );

  // Validation
  const { allValid, duplicateNumbers, invalidNames } = useMemo(() => {
    const numbers = guides
      .map((g) => g.guideNumber)
      .filter((n): n is number => n !== null);
    const duplicateNumbers = new Set(
      numbers.filter((n, i) => numbers.indexOf(n) !== i)
    );

    const invalidNames = new Set(
      guides
        .filter((g) => g.imageName && !validateImageName(g.imageName))
        .map((g) => g.id)
    );

    const allValid =
      guides.length > 0 &&
      guides.every(
        (g) =>
          g.guideNumber !== null &&
          g.imageName.length > 0 &&
          validateImageName(g.imageName) &&
          !duplicateNumbers.has(g.guideNumber)
      );

    return { allValid, duplicateNumbers, invalidNames };
  }, [guides]);

  const getGuideStatus = useCallback(
    (guide: typeof guides[0]): GuideStatus => {
      if (guide.guideNumber === null || guide.imageName.length === 0) return 'pending';
      if (invalidNames.has(guide.id)) return 'error';
      if (guide.guideNumber !== null && duplicateNumbers.has(guide.guideNumber)) return 'error';
      return 'ready';
    },
    [duplicateNumbers, invalidNames]
  );

  const hasFilesForImageExtraction = useMemo(
    () => guides.some((g) => g.file && g.guideNumber !== null),
    [guides]
  );

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

  const handleGenerate = useCallback(() => {
    // Update all guide statuses to ready before moving
    for (const guide of guides) {
      updateGuide(guide.id, { status: 'ready' });
    }
    setStep('generate');
  }, [guides, updateGuide, setStep]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Configure Guides</h2>
        <p className="text-slate-400 mt-2">
          Set guide numbers and image names for each file
        </p>
      </div>

      {/* Image Base URL */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm p-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
          <Link className="w-4 h-4 text-blue-400" />
          Image Base URL
        </label>
        <input
          type="text"
          value={imageBaseUrl}
          onChange={(e) => setImageBaseUrl(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          placeholder="https://example.com/media/sizeguide/"
        />
        <p className="text-xs text-slate-500 mt-2">
          Base URL where size guide images are hosted
        </p>
      </div>

      {/* Auto-fill Numbers */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <Hash className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm text-slate-300 whitespace-nowrap">Start from:</label>
          <input
            type="number"
            value={startNumber}
            onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
            min={1}
            className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
          <button
            onClick={handleAutoFill}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors"
          >
            Auto-fill Numbers
          </button>
        </div>
      </div>

      {/* Guides Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                File Name
              </th>
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                Guide #
              </th>
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                Image Name
              </th>
              <th className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wider px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {guides.map((guide, index) => {
              const rowStatus = getGuideStatus(guide);
              const hasDuplicateNumber =
                guide.guideNumber !== null && duplicateNumbers.has(guide.guideNumber);
              const hasInvalidName = invalidNames.has(guide.id);

              return (
                <motion.tr
                  key={guide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-300 font-mono">{guide.fileName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={guide.guideNumber ?? ''}
                        onChange={(e) => handleGuideNumberChange(guide.id, e.target.value)}
                        min={1}
                        className={`w-24 px-3 py-1.5 rounded-lg bg-slate-800 border text-white text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
                          ${hasDuplicateNumber ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'}
                        `}
                        placeholder="#"
                      />
                      {hasDuplicateNumber && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">Duplicate</span>
                        </div>
                      )}
                      {!hasDuplicateNumber && guide.guideNumber !== null && isTemplateIdUsed(guide.guideNumber) && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-amber-400">Template ID already exists</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={guide.imageName}
                        onChange={(e) => handleImageNameChange(guide.id, e.target.value)}
                        className={`w-full max-w-[240px] px-3 py-1.5 rounded-lg bg-slate-800 border text-white text-sm font-mono
                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
                          ${hasInvalidName ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'}
                        `}
                        placeholder="image_name"
                      />
                      {hasInvalidName && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">Use lowercase a-z, 0-9, _</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rowStatus} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setStep('upload')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleDownloadImages}
            disabled={!hasFilesForImageExtraction || imagesExtracting}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all
              ${hasFilesForImageExtraction && !imagesExtracting
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            whileHover={hasFilesForImageExtraction && !imagesExtracting ? { scale: 1.02 } : undefined}
            whileTap={hasFilesForImageExtraction && !imagesExtracting ? { scale: 0.98 } : undefined}
          >
            {imagesExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {imagesExtracting ? 'Extracting...' : 'Download Images'}
          </motion.button>

          <motion.button
            onClick={handleGenerate}
            disabled={!allValid}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all
              ${allValid
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            whileHover={allValid ? { scale: 1.02 } : undefined}
            whileTap={allValid ? { scale: 0.98 } : undefined}
          >
            <Zap className="w-4 h-4" />
            Generate All
          </motion.button>
        </div>
      </div>
    </div>
  );
}
