import { useEffect } from 'react';
import { useAuthContext } from './Providers';
import { AnimatePresence, motion } from 'motion/react';
import { LoadingAnimation } from './LoadingAnimation';

/**
 * ABYRA STORE — Global Overlay Loader
 * Refined floating loader with no box/container and no blur.
 */
export const GlobalLoader = () => {
  const { globalLoading, isLoading } = useAuthContext();

  useEffect(() => {
    if (globalLoading || isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [globalLoading, isLoading]);

  return (
    <AnimatePresence>
      {(globalLoading || isLoading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center pointer-events-auto select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Floating Loader — No Box, No Blur, Just Animation */}
          <div className="flex items-center justify-center transform scale-90 md:scale-100">
            <LoadingAnimation />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
