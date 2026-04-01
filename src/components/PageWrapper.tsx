import { motion } from "framer-motion";
import { fadeInVariants } from "@/lib/animations";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}
