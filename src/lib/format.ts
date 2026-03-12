const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

export function formatMoney(value: number) {
  return moneyFormatter.format(value ?? 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

export function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
