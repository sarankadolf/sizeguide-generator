import { Upload, Settings, Zap, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGuideStore } from '../../store/useGuideStore';
import type { Step } from '../../types';

const steps: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'configure', label: 'Configure', icon: Settings },
  { key: 'generate', label: 'Generate', icon: Zap },
];

const stepOrder: Step[] = ['upload', 'configure', 'generate'];

function getStepIndex(step: Step) {
  return stepOrder.indexOf(step);
}

export function StepIndicator() {
  const currentStep = useGuideStore((s) => s.currentStep);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.key === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <motion.div
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${isCurrent
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : isCompleted
                    ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
                }
              `}
              initial={false}
              animate={{
                scale: isCurrent ? 1 : 0.95,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span>{step.label}</span>
            </motion.div>

            {index < steps.length - 1 && (
              <div
                className={`w-8 h-px ${
                  index < currentIndex ? 'bg-green-500/50' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
