const CENTS_PER_UNIT = 100;
const BASIS_POINTS = 10_000;

export interface CheckoutMoneyLineInput {
  unitPrice: number;
  quantity: number;
  taxEnabled: boolean;
  taxPercentage: number;
}

export interface CheckoutMoneyTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function moneyToCents(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * CENTS_PER_UNIT);
}

export function centsToMoney(cents: number): number {
  return Number((cents / CENTS_PER_UNIT).toFixed(2));
}

export function roundMoney(value: number): number {
  return centsToMoney(moneyToCents(value));
}

function normalizeTaxPercentage(value: number): number {
  return roundMoney(value);
}

export function computeLineSubtotalCents(unitPrice: number, quantity: number): number {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
  return moneyToCents(unitPrice) * safeQuantity;
}

export function computeLineTaxCents(lineSubtotalCents: number, taxPercentage: number, taxEnabled: boolean): number {
  if (!taxEnabled || lineSubtotalCents <= 0) {
    return 0;
  }

  const taxBasisPoints = Math.round(normalizeTaxPercentage(taxPercentage) * CENTS_PER_UNIT);
  return Math.round((lineSubtotalCents * taxBasisPoints) / BASIS_POINTS);
}

export function computeLineSubtotal(unitPrice: number, quantity: number): number {
  return centsToMoney(computeLineSubtotalCents(unitPrice, quantity));
}

export function computeCheckoutTotals(lines: CheckoutMoneyLineInput[]): CheckoutMoneyTotals {
  let subtotalCents = 0;
  let taxCents = 0;

  for (const line of lines) {
    const lineSubtotalCents = computeLineSubtotalCents(line.unitPrice, line.quantity);
    const lineTaxCents = computeLineTaxCents(lineSubtotalCents, line.taxPercentage, line.taxEnabled);

    subtotalCents += lineSubtotalCents;
    taxCents += lineTaxCents;
  }

  const totalCents = subtotalCents + taxCents;

  return {
    subtotal: centsToMoney(subtotalCents),
    taxAmount: centsToMoney(taxCents),
    total: centsToMoney(totalCents),
    subtotalCents,
    taxCents,
    totalCents,
  };
}
