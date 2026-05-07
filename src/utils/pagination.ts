import { InlineKeyboard } from 'grammy';

export interface PaginationOptions<T> {
  items: T[];
  page: number;
  perPage?: number;
  buildButton: (item: T) => { text: string; data: string };
  prevData: string;
  nextData: string;
  noopData?: string;
}

export function paginate<T>({
  items,
  page,
  perPage = 8,
  buildButton,
  prevData,
  nextData,
  noopData = 'noop',
}: PaginationOptions<T>): { keyboard: InlineKeyboard; pageItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * perPage;
  const pageItems = items.slice(start, start + perPage);

  const keyboard = new InlineKeyboard();
  for (const item of pageItems) {
    const btn = buildButton(item);
    keyboard.text(btn.text, btn.data).row();
  }

  if (totalPages > 1) {
    if (safePage > 0) keyboard.text('⬅️', prevData);
    keyboard.text(`${safePage + 1}/${totalPages}`, noopData);
    if (safePage < totalPages - 1) keyboard.text('➡️', nextData);
  }

  return { keyboard, pageItems, totalPages };
}
