import { Composer, Keyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../types/context.js';
import { updateProfile } from '../services/user.service.js';
import { parseDate, formatDate, normalizePhone, phoneRegex, emailRegex } from '../utils/validators.js';
import { mainMenuKeyboard } from '../keyboards/main-menu.js';
import { LABELS } from '../keyboards/labels.js';

export const profileComposer = new Composer<MyContext>();

type ProfileConvo = Conversation<MyContext>;

async function profileFillConversation(conversation: ProfileConvo, ctx: MyContext): Promise<void> {
  if (!ctx.dbUser) return;

  // ── FIO (majburiy, kamida 3 ta belgi)
  await ctx.reply(ctx.t('profile-ask-fullname'), { reply_markup: { remove_keyboard: true } });
  let fullName = '';
  while (!fullName) {
    const m = await conversation.waitFor('message:text');
    const t = m.message.text.trim();
    if (t.length < 3) {
      await ctx.reply(ctx.t('val-text-too-short', { min: 3 }));
      continue;
    }
    fullName = t;
  }

  // ── Telefon (contact tugmasi yoki +998... matn)
  const phoneKb = new Keyboard()
    .requestContact(ctx.t('profile-ask-phone-button'))
    .resized()
    .oneTime();
  await ctx.reply(ctx.t('profile-ask-phone'), { reply_markup: phoneKb });
  let phone = '';
  while (!phone) {
    const upd = await conversation.wait();
    if (upd.message?.contact?.phone_number) {
      phone = upd.message.contact.phone_number;
      if (!phone.startsWith('+')) phone = '+' + phone;
      break;
    }
    if (upd.message?.text) {
      const candidate = normalizePhone(upd.message.text.trim());
      if (phoneRegex.test(candidate)) {
        phone = candidate;
        break;
      }
    }
    await ctx.reply(ctx.t('val-bad-phone'));
  }

  // ── Tug'ilgan sana (DD.MM.YYYY)
  await ctx.reply(ctx.t('profile-ask-birthdate'), { reply_markup: { remove_keyboard: true } });
  let birthDate: Date | null = null;
  while (!birthDate) {
    const m = await conversation.waitFor('message:text');
    birthDate = parseDate(m.message.text);
    if (!birthDate) await ctx.reply(ctx.t('val-bad-date'));
  }

  // ── Email (ixtiyoriy, "-" o'tkazib yuborish)
  await ctx.reply(ctx.t('profile-ask-email'));
  let email: string | null = null;
  while (true) {
    const m = await conversation.waitFor('message:text');
    const raw = m.message.text.trim();
    if (raw === '-' || raw === '') {
      email = null;
      break;
    }
    if (emailRegex.test(raw)) {
      email = raw;
      break;
    }
    await ctx.reply(ctx.t('val-bad-email'));
  }

  // ── Shahar (ixtiyoriy)
  await ctx.reply(ctx.t('profile-ask-city'));
  const cityMsg = await conversation.waitFor('message:text');
  const cityRaw = cityMsg.message.text.trim();
  const city = cityRaw && cityRaw !== '-' ? cityRaw : null;

  await conversation.external(() =>
    updateProfile(ctx.dbUser!.id, {
      profileFullName: fullName,
      profilePhone: phone,
      profileBirthDate: birthDate,
      profileEmail: email,
      profileCity: city,
    }),
  );

  await ctx.reply(ctx.t('profile-saved'), { reply_markup: mainMenuKeyboard(ctx) });
}

profileComposer.use(createConversation(profileFillConversation, 'profile-fill'));

profileComposer.hears([...LABELS.profile], async (ctx) => {
    if (!ctx.dbUser) return;
    const u = ctx.dbUser;
    const ns = ctx.t('profile-not-set');
    const text = [
      ctx.t('profile-title'),
      '',
      `<b>${ctx.t('profile-fullname')}:</b> ${u.profileFullName ?? ns}`,
      `<b>${ctx.t('profile-phone')}:</b> ${u.profilePhone ?? ns}`,
      `<b>${ctx.t('profile-birthdate')}:</b> ${u.profileBirthDate ? formatDate(u.profileBirthDate) : ns}`,
      `<b>${ctx.t('profile-email')}:</b> ${u.profileEmail ?? ns}`,
      `<b>${ctx.t('profile-city')}:</b> ${u.profileCity ?? ns}`,
    ].join('\n');

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: ctx.t('profile-edit'), callback_data: 'profile:edit' }]] },
    });
});

profileComposer.callbackQuery('profile:edit', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('profile-fill');
});
