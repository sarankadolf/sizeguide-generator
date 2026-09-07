import { Check, Loader2, AlertCircle, FileCheck, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GuideStatus } from '../../types';

interface StatusBadgeProps {
  status: GuideStatus;
  className?: string;
}

const statusConfig: Record<
  GuideStatus,
  { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Check }
> = {
  pending: {
    label: 'Pending',
    color: 'text-slate-400',
    bgColor: 'bg-slate-600/20',
    borderColor: 'border-slate-600/40',
    icon: Circle,
  },
  parsed: {
    label: 'Parsed',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/15',
    borderColor: 'border-blue-500/30',
    icon: FileCheck,
  },
  ready: {
    label: 'Ready',
    color: 'text-green-400',
    bgColor: 'bg-green-600/15',
    borderColor: 'border-green-500/30',
    icon: Check,
  },
  generating: {
    label: 'Generating',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600/15',
    borderColor: 'border-yellow-500/30',
    icon: Loader2,
  },
  done: {
    label: 'Done',
    color: 'text-green-400',
    bgColor: 'bg-green-600/15',
    borderColor: 'border-green-500/30',
    icon: Check,
  },
  error: {
    label: 'Error',
    color: 'text-red-400',
    bgColor: 'bg-red-600/15',
    borderColor: 'border-red-500/30',
    icon: AlertCircle,
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${status === 'generating' ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      <Icon className={`w-3 h-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
      {config.label}
    </motion.span>
  );
}
