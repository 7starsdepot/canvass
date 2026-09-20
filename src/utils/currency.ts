/**
 * Formats a numeric value into Philippine Peso currency string (₱)
 */
export const formatPeso = (amount: number | string | undefined | null): string => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount ?? '0'));
  if (isNaN(numeric)) {
    return '₱0.00';
  }
  return `₱${numeric.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
