export const padVector = (vector: number[], targetDimension: number): number[] => {
    if (vector.length >= targetDimension) {
      return vector.slice(0, targetDimension);
    }
    return [...vector, ...Array(targetDimension - vector.length).fill(0)];
  };
