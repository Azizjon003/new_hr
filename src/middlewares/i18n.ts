import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18n } from '@grammyjs/i18n';
import { MyContext } from '../types/context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const i18n = new I18n<MyContext>({
  defaultLocale: 'uz',
  directory: path.resolve(__dirname, '..', 'locales'),
  fluentBundleOptions: { useIsolating: false },
  localeNegotiator: (ctx) => {
    const lang = ctx.dbUser?.lang;
    if (lang === 'RU') return 'ru';
    if (lang === 'UZ') return 'uz';
    return ctx.from?.language_code === 'ru' ? 'ru' : 'uz';
  },
});
