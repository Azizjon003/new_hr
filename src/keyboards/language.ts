import { InlineKeyboard } from 'grammy';

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🇺🇿 O‘zbekcha', 'lang:UZ')
    .text('🇷🇺 Русский', 'lang:RU');
}
