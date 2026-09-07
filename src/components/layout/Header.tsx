import { Ruler } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30">
            <Ruler className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">
              Size Guide Generator
            </h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
              v1.0
            </span>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-2 text-xs text-slate-500"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <span>Centrepoint Size Guides</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </motion.div>
      </div>
    </header>
  );
}
