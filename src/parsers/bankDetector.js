export function detectBank(fullText) {
  const text = fullText.toLowerCase();

  if (text.includes('royal bank') || text.includes('rbc ') || text.includes('rbc.com') || text.includes('rbc®')) {
    if (text.includes('mastercard') || text.includes('master card')) {
      return { bank: 'RBC', accountType: 'Mastercard' };
    }
    if (text.includes('visa') || (text.includes('credit card') && text.includes('minimum payment'))) {
      return { bank: 'RBC', accountType: 'Visa' };
    }
    if (text.includes('day to day') || text.includes('personal deposit') || text.includes('chequing') || text.includes('savings')) {
      return { bank: 'RBC', accountType: 'Chequing' };
    }
    return { bank: 'RBC', accountType: 'Chequing' };
  }

  if (text.includes('american express') || text.includes('amex') || text.includes('americanexpress.ca')) {
    if (text.includes('cobalt')) return { bank: 'American Express', accountType: 'Cobalt' };
    if (text.includes('simplycash')) return { bank: 'American Express', accountType: 'Credit Card' };
    if (text.includes('platinum') || text.includes('gold card') || text.includes('green card')) {
      return { bank: 'American Express', accountType: 'Charge Card' };
    }
    return { bank: 'American Express', accountType: 'Credit Card' };
  }

  if (text.includes('cibc') || text.includes('canadian imperial')) {
    if (text.includes('aventura') || text.includes('dividend') || text.includes('aeroplan') ||
        text.includes('credit card') || text.includes('minimum payment')) {
      return { bank: 'CIBC', accountType: 'Credit Card' };
    }
    return { bank: 'CIBC', accountType: 'Chequing' };
  }

  return { bank: 'Unknown', accountType: 'Unknown' };
}
