// src/lib/numberToWords.js
// Convert a number to Indian English words (for invoice footer)

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ones[n]
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
}

function threeDigits(n) {
  if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '')
  return twoDigits(n)
}

export function numberToWords(amount) {
  if (amount === 0) return 'Zero Only'
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)

  let result = ''
  let n = rupees

  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  const rest = n

  if (crore) result += threeDigits(crore) + ' Crore '
  if (lakh) result += threeDigits(lakh) + ' Lakh '
  if (thousand) result += threeDigits(thousand) + ' Thousand '
  if (rest) result += threeDigits(rest)

  result = result.trim()
  if (paise) result += ' And ' + twoDigits(paise) + ' Paise'
  return result + ' Only'
}
