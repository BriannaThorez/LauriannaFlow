
export const resolveCSSVar = (varName: string): string => {
  if (typeof window === 'undefined') return '#000000';
  
  // Extract variable name if it's in the format var(--name)
  const match = varName.match(/var\((--[^)]+)\)/);
  const cleanName = match ? match[1] : varName;
  
  const value = getComputedStyle(document.documentElement).getPropertyValue(cleanName).trim();
  return value || '#000000';
};
