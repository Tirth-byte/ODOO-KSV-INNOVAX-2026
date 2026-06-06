export function formatINR(amount: number | undefined | null): string {
  const value = typeof amount === 'number' ? amount : 0;
  if (value >= 10000000) {
    return '₹' + (value / 10000000).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  } else if (value >= 100000) {
    return '₹' + (value / 100000).toFixed(2).replace(/\.?0+$/, '') + ' L';
  } else if (value >= 1000) {
    return '₹' + (value / 1000).toFixed(1).replace(/\.?0+$/, '') + 'K';
  } else {
    return '₹' + value.toLocaleString('en-IN');
  }
}

export function formatINRFull(amount: number | undefined | null): string {
  const value = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatINRShort(amount: number | undefined | null): string {
  const value = typeof amount === 'number' ? amount : 0;
  if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + ' Cr';
  if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + ' L';
  if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'K';
  return '₹' + value.toLocaleString('en-IN');
}
