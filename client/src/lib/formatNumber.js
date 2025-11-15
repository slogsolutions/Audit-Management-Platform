/**
 * Format number to Indian number system with 2 decimal places
 * Indian system: First 3 digits, then groups of 2
 * Example: 1234567.89 -> 12,34,567.89
 */
export function formatIndianCurrency(num) {
  if (num === null || num === undefined || num === '') return '0.00';
  
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0.00';
  
  // Round to 2 decimal places
  const rounded = Math.round(number * 100) / 100;
  
  // Split into integer and decimal parts
  const parts = rounded.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  
  // Apply Indian numbering system
  // After first 3 digits from right, group by 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    // Group remaining digits by 2
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = formattedRemaining + ',' + lastThree;
  }
  
  return `${integerPart}.${decimalPart}`;
}

/**
 * Format integer part only (for real-time input formatting)
 * @param {string} intStr - Integer part as string
 * @returns {string} Formatted integer with commas
 */
export function formatIndianInteger(intStr) {
  if (!intStr) return '';
  
  // Remove any existing commas
  const cleaned = intStr.replace(/,/g, '');
  
  if (cleaned.length <= 3) {
    return cleaned;
  }
  
  // Last 3 digits, then groups of 2
  const lastThree = cleaned.slice(-3);
  const remaining = cleaned.slice(0, -3);
  const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  
  return formattedRemaining + ',' + lastThree;
}

/**
 * Format number for display with currency symbol
 */
export function formatCurrency(num) {
  return `₹${formatIndianCurrency(num)}`;
}

/**
 * Parse Indian formatted number string back to number
 */
export function parseIndianNumber(str) {
  if (!str) return 0;
  // Remove all commas
  const cleaned = str.toString().replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2));
}
