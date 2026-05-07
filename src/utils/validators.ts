export const phoneRegex = /^\+998\d{9}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseDate(input: string): Date | null {
  // DD.MM.YYYY
  const m = input.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null;
  }
  return d;
}

export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function normalizePhone(input: string): string {
  return input.replace(/[\s()-]/g, '');
}
