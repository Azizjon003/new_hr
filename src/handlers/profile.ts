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

  // FIO
  await ctx.reply(ctx.t('profile-ask-fullname'), { reply_markup: { remove_keyboard: true } });
  const fullNameMsg = await conversation.waitFor('message:text');
  const fullName = fullNameMsg.message.text.trim();

  // Telefon
  const phoneKb = new Keyboard()
    .requestContact(ctx.t('profile-ask-phone-button'))
    .resized()
    .oneTime();
  await ctx.reply(ctx.t('profile-ask-phone'), { reply_markup: phoneKb });
  const phoneMsg = await conversation.wait();
  let phone = '';
  if (phoneMsg.message?.contact?.phone_number) {
    phone = phoneMsg.message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;
  } else if (phoneMsg.message?.text) {
    const candidate = normalizePhone(phoneMsg.message.text.trim());
    if (!phoneRegex.test(candidate)) {
      await ctx.reply(ctx.t('val-bad-phone'));
      return;
    }
    phone = candidate;
  } else {
    await ctx.reply(ctx.t('val-bad-phone'));
    return;
  }

  // Tug'ilgan sana
  await ctx.reply(ctx.t('profile-ask-birthdate'), { reply_markup: { remove_keyboard: true } });
  let birthDate: Date | null = null;
  while (!birthDate) {
    const m = await conversation.waitFor('message:text');
    birthDate = parseDate(m.message.text);
    if (!birthDate) await ctx.reply(ctx.t('val-bad-date'));
  }

  // Email (ixtiyoriy)
  await ctx.reply(ctx.t('profile-ask-email'));
  const emailMsg = await conversation.waitFor('message:text');
  let email: string | null = null;
  const emailRaw = emailMsg.message.text.trim();
  if (emailRaw && emailRaw !== '-') {
    if (!emailRegex.test(emailRaw)) {
      await ctx.reply(ctx.t('val-bad-email'));
      return;
    }
    email = emailRaw;
  }

  // Shahar (ixtiyoriy)
  await ctx.reply(ctx.t('profile-ask-city'));
  const cityMsg = await conversation.waitFor('message:text');
  const cityRaw = cityMsg.message.text.trim();
  const city = cityRaw && cityRaw !== '-' ? cityRaw : null;

  await updateProfile(ctx.dbUser.id, {
    profileFullName: fullName,
    profilePhone: phone,
    profileBirthDate: birthDate,
    profileEmail: email,
    profileCity: city,
  });

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
