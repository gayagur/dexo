import { AppHeader } from './AppHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout wrapper for all authenticated pages.
 * Provides: sticky header with avatar dropdown + consistent page structure.
 * Adds smooth page transitions via Framer Motion.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
