import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-2xl',
  children,
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog static open={isOpen} onClose={onClose} className="relative z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
            <DialogPanel className={`w-full ${maxWidthClass}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-2xl border border-[#26342C] bg-[#121916] shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden"
              >
              <div className="flex items-start justify-between gap-4 border-b border-[#222E27] bg-[#0D110F] px-6 py-4">
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-semibold text-[#F5F7F5]">
                    {title}
                  </DialogTitle>
                  {subtitle && (
                    <p className="mt-1 text-xs text-[#9AA69E]">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="rounded-lg p-1.5 text-[#9AA69E] transition-colors hover:bg-[#18211C] hover:text-[#F5F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
              </motion.div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
