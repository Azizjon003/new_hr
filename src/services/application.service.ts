import { AppStatus, Application, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { generateRefCode } from './ref-code.service.js';

export async function findOrCreateDraft(
  userId: string,
  positionId: string,
): Promise<Application> {
  const existing = await prisma.application.findFirst({
    where: { userId, positionId, status: 'DRAFT' },
  });
  if (existing) return existing;

  const refCode = await generateRefCode();
  return prisma.application.create({
    data: { userId, positionId, status: 'DRAFT', refCode },
  });
}

export async function findUserDraft(userId: string): Promise<Application | null> {
  return prisma.application.findFirst({
    where: { userId, status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function saveAnswer(
  applicationId: string,
  questionId: string,
  data: {
    valueText?: string | null;
    valueNumber?: number | null;
    valueDate?: Date | null;
    valueJson?: Prisma.InputJsonValue;
    filePath?: string | null;
  },
): Promise<void> {
  const payload = {
    valueText: data.valueText ?? null,
    valueNumber: data.valueNumber ?? null,
    valueDate: data.valueDate ?? null,
    valueJson: data.valueJson ?? Prisma.DbNull,
    filePath: data.filePath ?? null,
  };
  await prisma.answer.upsert({
    where: { applicationId_questionId: { applicationId, questionId } },
    update: payload,
    create: { applicationId, questionId, ...payload },
  });
}

export async function setApplicationFiles(
  applicationId: string,
  data: { photoFilePath?: string; cvFilePath?: string; pdfFilePath?: string },
): Promise<Application> {
  return prisma.application.update({ where: { id: applicationId }, data });
}

export async function submitApplication(applicationId: string): Promise<Application> {
  const app = await prisma.application.update({
    where: { id: applicationId },
    data: { status: 'PENDING', submittedAt: new Date() },
  });
  await prisma.applicationStatusHistory.create({
    data: { applicationId, fromStatus: 'DRAFT', toStatus: 'PENDING' },
  });
  return app;
}

export async function withdrawApplication(
  applicationId: string,
  userId: string,
): Promise<Application | null> {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app || app.userId !== userId) return null;
  if (app.status !== 'PENDING') return null;
  // 24 soat ichida
  if (app.submittedAt && Date.now() - app.submittedAt.getTime() > 24 * 60 * 60 * 1000) return null;

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: 'WITHDRAWN' },
  });
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId,
      fromStatus: 'PENDING',
      toStatus: 'WITHDRAWN',
      changedById: userId,
    },
  });
  return updated;
}

export async function changeStatus(
  applicationId: string,
  toStatus: AppStatus,
  changedById: string,
  reason?: string,
): Promise<Application> {
  const current = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: toStatus, rejectReason: reason },
  });
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId,
      fromStatus: current.status,
      toStatus,
      changedById,
      reason,
    },
  });
  return updated;
}

export async function getUserApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId, status: { not: 'DRAFT' } },
    include: { position: { include: { department: { include: { company: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getApplicationFull(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      user: true,
      position: {
        include: {
          department: { include: { company: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
      answers: true,
    },
  });
}
