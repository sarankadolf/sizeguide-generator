import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { useGuideStore } from './store/useGuideStore';
import { Header } from './components/layout/Header';
import { StepIndicator } from './components/layout/StepIndicator';
import { UploadStep } from './components/steps/UploadStep';
import { ConfigureStep } from './components/steps/ConfigureStep';
import { GenerateStep } from './components/steps/GenerateStep';

function App() {
  const currentStep = useGuideStore((s) => s.currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <StepIndicator />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'upload' && <UploadStep />}
            {currentStep === 'configure' && <ConfigureStep />}
            {currentStep === 'generate' && <GenerateStep />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}

export default App;
