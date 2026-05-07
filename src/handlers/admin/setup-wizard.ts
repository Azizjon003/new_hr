import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { EmploymentType, ExperienceLevel } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';
import { questionTemplates, applyTemplate } from '../../data/question-templates.js';

export const adminSetupWizardComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

async function setupWizardConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  await ctx.reply(
    "🧙 <b>Sozlash sehrgari</b>\n\n" +
      "Bot bilan ishlashni boshlash uchun bosqichma-bosqich:\n" +
      "1. Kompaniya yaratish\n" +
      "2. Telegram kanal ulash\n" +
      "3. Bo'lim qo'shish\n" +
      "4. Lavozim qo'shish\n" +
      "5. Savollar shabloni qo'llash\n\n" +
      "Davom etamizmi?",
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Boshlash', 'sw:go').text('❌ Bekor', 'sw:abort'),
    },
  );
  const start = await conversation.waitFor('callback_query:data');
  await start.answerCallbackQuery();
  if (start.callbackQuery.data === 'sw:abort') {
    await ctx.reply('Bekor qilindi.');
    return;
  }

  // 1. Kompaniya
  await ctx.reply("🏢 <b>1/5</b> Kompaniya nomi (o'zbekcha):", { parse_mode: 'HTML' });
  const cNameUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('🏢 Название компании (русский):');
  const cNameRu = (await conversation.waitFor('message:text')).message.text.trim();

  // 2. Kanal
  await ctx.reply(
    "📺 <b>2/5</b> Telegram kanal ID si (masalan: <code>-1001234567890</code>).\n\n" +
      "💡 Botingizni kanalga admin qilib qo'shing. Kanal ID ni hozir bilmasangiz '-' yuboring, keyin sozlaysiz.",
    { parse_mode: 'HTML' },
  );
  const chRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const channelId = chRaw === '-' ? null : chRaw;

  const company = await conversation.external(() =>
    prisma.company.create({
      data: { nameUz: cNameUz, nameRu: cNameRu, channelId, isActive: true },
    }),
  );

  // 3. Bo'lim
  await ctx.reply("🗂 <b>3/5</b> Birinchi bo'lim nomi (o'zbekcha):", { parse_mode: 'HTML' });
  const dNameUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('🗂 Название отдела (русский):');
  const dNameRu = (await conversation.waitFor('message:text')).message.text.trim();

  const dept = await conversation.external(() =>
    prisma.department.create({
      data: { companyId: company.id, nameUz: dNameUz, nameRu: dNameRu, isActive: true },
    }),
  );

  // 4. Lavozim
  await ctx.reply("💼 <b>4/5</b> Birinchi lavozim nomi (o'zbekcha):", { parse_mode: 'HTML' });
  const pTitleUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('💼 Название должности (русский):');
  const pTitleRu = (await conversation.waitFor('message:text')).message.text.trim();

  const position = await conversation.external(() =>
    prisma.position.create({
      data: {
        departmentId: dept.id,
        titleUz: pTitleUz,
        titleRu: pTitleRu,
        salaryNegotiable: true,
        currency: 'UZS',
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.NO_EXPERIENCE,
        isActive: true,
      },
    }),
  );

  // 5. Savollar shabloni
  const tplKb = new InlineKeyboard();
  for (const tplName of Object.keys(questionTemplates)) {
    const count = questionTemplates[tplName].length;
    tplKb.text(`📋 ${tplName} (${count})`, `sw:tpl:${tplName}`).row();
  }
  tplKb.text('⏭ O‘tkazib yuborish', 'sw:tpl:none');

  await ctx.reply(
    "❓ <b>5/5</b> Savollar shablonini tanlang (yoki keyinroq qo'shasiz):",
    { parse_mode: 'HTML', reply_markup: tplKb },
  );
  const tplUpd = await conversation.waitFor('callback_query:data');
  await tplUpd.answerCallbackQuery();
  try {
    await tplUpd.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    /* ignore */
  }
  const tplMatch = tplUpd.callbackQuery.data.match(/^sw:tpl:(.+)$/);
  let questionsAdded = 0;
  if (tplMatch && tplMatch[1] !== 'none') {
    const seeds = applyTemplate(tplMatch[1]);
    let order = 0;
    await conversation.external(async () => {
      for (const s of seeds) {
        await prisma.question.create({
          data: {
            positionId: position.id,
            order: order++,
            textUz: s.textUz,
            textRu: s.textRu,
            type: s.type,
            required: s.required ?? true,
            options: s.options ?? undefined,
            validation: (s.validation as object | undefined) ?? undefined,
            placeholderUz: s.placeholderUz,
            placeholderRu: s.placeholderRu,
          },
        });
      }
    });
    questionsAdded = seeds.length;
  }

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'SETUP_WIZARD',
        entity: 'Company',
        entityId: company.id,
        details: { dept: dept.id, position: position.id, questions: questionsAdded },
      },
    }),
  );

  // Yakuniy xabar
  await ctx.reply(
    "🎉 <b>Sozlash tayyor!</b>\n\n" +
      `🏢 Kompaniya: <b>${cNameUz}</b>\n` +
      `🗂 Bo'lim: <b>${dNameUz}</b>\n` +
      `💼 Lavozim: <b>${pTitleUz}</b>\n` +
      `❓ Savollar: <b>${questionsAdded}</b>\n` +
      (channelId ? `📺 Kanal: <code>${channelId}</code>\n` : '⚠️ Kanal sozlanmagan — keyinroq sozlang\n') +
      "\nEndi botda foydalanuvchilar /start qilib anketa topshira oladi.\n" +
      "/admin orqali boshqarishda davom eting.",
    { parse_mode: 'HTML' },
  );
}

adminSetupWizardComposer.use(createConversation(setupWizardConvo, 'admin-setup-wizard'));

adminSetupWizardComposer.callbackQuery('adm:setup', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('admin-setup-wizard');
});

// Avto-taklif: agar kompaniyalar yo'q bo'lsa, /admin ga kirganda taklif qilamiz
export async function suggestSetupIfEmpty(ctx: MyContext): Promise<boolean> {
  const count = await prisma.company.count({ where: { isDeleted: false } });
  if (count > 0) return false;

  await ctx.reply(
    "👋 Salom! Bu bot hali sozlanmagan.\n\n" +
      "Sozlash sehrgarini ishga tushirasizmi? Bosqichma-bosqich birinchi kompaniya, bo'lim va lavozimni yaratamiz.",
    {
      reply_markup: new InlineKeyboard()
        .text('🧙 Sehrgarni boshlash', 'adm:setup')
        .row()
        .text('Yo‘q, qo‘lda sozlayman', 'adm:back'),
    },
  );
  return true;
}
