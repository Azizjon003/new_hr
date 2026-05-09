import { Api, InputFile, RawApi } from 'grammy';
import { Application } from '@prisma/client';
import { prisma } from './prisma.js';
import { getApplicationFull } from './application.service.js';
import { generateApplicationPdf } from './pdf.service.js';
import { getCompanyName, getDepartmentName, getPositionTitle } from './company.service.js';
import { logger } from '../utils/logger.js';
import { formatDate } from '../utils/validators.js';

export async function postApplicationToChannel(
  api: Api<RawApi>,
  applicationId: string,
): Promise<Application | null> {
  const app = await getApplicationFull(applicationId);
  if (!app) return null;

  const company = app.position.department.company;
  if (!company.channelId) {
    logger.warn({ companyId: company.id }, 'Company has no channelId, skipping channel post');
    return null;
  }

  const lang = app.user.lang;
  const pdfPath = app.pdfFilePath ?? (await generateApplicationPdf(applicationId));

  // PDF saqlash
  if (!app.pdfFilePath) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { pdfFilePath: pdfPath },
    });
  }

  const username = app.user.username ? `@${app.user.username}` : `id${app.user.telegramId}`;
  const tgFallbackName = [app.user.tgFirstName, app.user.tgLastName].filter(Boolean).join(' ');
  const displayName = app.user.profileFullName ?? tgFallbackName ?? '-';

  const lines = [
    `<b>📨 ${lang === 'RU' ? 'Новая заявка' : 'Yangi ariza'}</b>`,
    ``,
    `🆔 <code>${app.refCode}</code>`,
    `🏢 ${getCompanyName(company, lang)} · ${getDepartmentName(app.position.department, lang)}`,
    `💼 <b>${getPositionTitle(app.position, lang)}</b>`,
    ``,
    `👤 ${displayName || '-'}`,
  ];
  if (app.user.profilePhone) lines.push(`📞 ${app.user.profilePhone}`);
  lines.push(`💬 ${username}`, `📅 ${formatDate(app.submittedAt ?? app.createdAt)}`);
  const caption = lines.join('\n');

  try {
    const msg = await api.sendDocument(company.channelId, new InputFile(pdfPath), {
      caption,
      parse_mode: 'HTML',
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        channelChatId: String(msg.chat.id),
        channelMessageId: String(msg.message_id),
      },
    });

    if (app.photoFilePath) {
      await api.sendPhoto(company.channelId, new InputFile(app.photoFilePath), {
        caption: `📸 ${app.refCode}`,
      });
    }

    logger.info({ applicationId, channelId: company.channelId }, 'Application posted to channel');
    return app;
  } catch (err) {
    logger.error({ err, applicationId, channelId: company.channelId }, 'Failed to post to channel');
    return null;
  }
}
