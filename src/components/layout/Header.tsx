import { Ruler, Database, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppPage } from '../../App';

interface HeaderProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
}

export function Header({ activePage, onPageChange }: HeaderProps) {
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

        {/* Navigation Tabs */}
        <motion.nav
          className="flex items-center gap-1 rounded-lg bg-slate-800/50 border border-slate-700/50 p-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <button
            onClick={() => onPageChange('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePage === 'generator'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Generator
          </button>
          <button
            onClick={() => onPageChange('mappings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePage === 'mappings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Mappings
          </button>
        </motion.nav>

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
