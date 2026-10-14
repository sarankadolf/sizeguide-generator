import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trash2, ArrowRight, Languages, Split } from 'lucide-react';
import { toast } from 'sonner';
import { useGuideStore } from '../../store/useGuideStore';
import { DropZone } from '../ui/DropZone';
import { StatusBadge } from '../ui/StatusBadge';
import { parseExcelFile } from '../../lib/excel/parser';

/** Matches the "[n/N]" suffix appended to fileName for guides that were
 *  split out of one multi-guide workbook (see UploadStep's handleFilesDrop). */
const SPLIT_SUFFIX_RE = /^(.*) \[(\d+)\/(\d+)\]$/;

export function UploadStep() {
  const guides = useGuideStore((s) => s.guides);
  const addGuide = useGuideStore((s) => s.addGuide);
  const removeGuide = useGuideStore((s) => s.removeGuide);
  const setStep = useGuideStore((s) => s.setStep);

  const handleFilesDrop = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const parsed = parseExcelFile(buffer);
          const isMultiGuide = parsed.guides.length > 1;

          for (const guideBlock of parsed.guides) {
            const id = `guide_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const displayName = isMultiGuide
              ? `${file.name} [${guideBlock.blockIndex + 1}/${parsed.guides.length}]`
              : file.name;

            const parsedData = {
              fileName: displayName,
              sheets: [] as import('../../types').ParsedSheet[],
              sheetCount: parsed.detection.length,
              hasEN: guideBlock.enData !== null,
              hasAR: guideBlock.arData !== null,
            };

            addGuide({
              id,
              fileName: displayName,
              parsedData,
              guideNumber: null,
              status: 'parsed',
              generatorData: guideBlock.enData ?? guideBlock.arData ?? undefined,
              arGeneratorData: guideBlock.arData ?? undefined,
              file, // Retain original File for image extraction (shared across split guides)
            });
          }

          toast.success(
            isMultiGuide
              ? `Parsed "${file.name}" — split into ${parsed.guides.length} size guides`
              : `Parsed "${file.name}" — ${parsed.detection.length} sheet(s) detected`
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to parse file';
          toast.error(`Error parsing "${file.name}": ${message}`);
        }
      }
    },
    [addGuide]
  );

  const handleRemove = useCallback(
    (id: string, fileName: string) => {
      removeGuide(id);
      toast.info(`Removed "${fileName}"`);
    },
    [removeGuide]
  );

  const handleContinue = useCallback(() => {
    setStep('configure');
  }, [setStep]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Upload Excel Files</h2>
        <p className="text-slate-400 mt-2">
          Upload your size guide spreadsheets to get started
        </p>
      </div>

      {/* Drop Zone */}
      <DropZone onFilesDrop={handleFilesDrop} accept=".xlsx" multiple />

      {/* Uploaded Files List */}
      {guides.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Uploaded Files ({guides.length})
          </h3>

          <div className="space-y-2">
            {guides.map((guide, index) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{guide.fileName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">
                        {guide.parsedData.sheetCount} sheet{guide.parsedData.sheetCount !== 1 ? 's' : ''}
                      </span>
                      {(() => {
                        const m = guide.fileName.match(SPLIT_SUFFIX_RE);
                        if (!m) return null;
                        return (
                          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-600/15 text-purple-300 border border-purple-500/30">
                            <Split className="w-3 h-3" />
                            Split {m[2]}/{m[3]}
                          </span>
                        );
                      })()}
                      <div className="flex items-center gap-1.5">
                        <Languages className="w-3 h-3 text-slate-500" />
                        {guide.parsedData.hasEN && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/30">
                            EN
                          </span>
                        )}
                        {guide.parsedData.hasAR && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-600/15 text-amber-400 border border-amber-500/30">
                            AR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={guide.status} />
                  <button
                    onClick={() => handleRemove(guide.id, guide.fileName)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <motion.button
          onClick={handleContinue}
          disabled={guides.length === 0}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all
            ${guides.length > 0
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
          whileHover={guides.length > 0 ? { scale: 1.02 } : undefined}
          whileTap={guides.length > 0 ? { scale: 0.98 } : undefined}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
