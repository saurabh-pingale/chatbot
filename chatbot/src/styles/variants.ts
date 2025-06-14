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
    y: [0, -8, 0, 0, 0],
    scale: [1, 1.3, 1, 1, 1],
    opacity: [0.5, 1, 0.5, 0.5, 0.5],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      repeatType: 'loop' as const,
      delay: i * 0.25,
      times: [0, 0.2, 0.4, 0.8, 1],
      ease: 'easeInOut',
    },
  }),
};