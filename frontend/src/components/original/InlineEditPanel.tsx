import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface InlineEditPanelProps {
  open: boolean;
  children: ReactNode;
}

export const InlineEditPanel = ({ open, children }: InlineEditPanelProps) => {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="inline-edit-panel"
          initial={{ height: 0, opacity: 0, y: -10 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="overflow-hidden border-t"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ delay: 0.04, duration: 0.18 }}
            className="space-y-4 px-6 py-5"
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};