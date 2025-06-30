export const messageListVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const dotVariants = {
  animate: (i: number) => ({
    y: [0, -3, 0],
    scale: [1, 1.1, 1],
    opacity: [0.6, 0.9, 0.6],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      repeatType: 'loop' as const,
      delay: i * 0.2,
      times: [0, 0.5, 1],
      ease: 'easeInOut',
    },
  }),
};