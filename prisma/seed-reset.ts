/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🧹 Seed ma\'lumotlarini tozalash...');

  // Bog'liqlik tartibida o'chirish
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.application.deleteMany();
  await prisma.question.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();
  await prisma.adminLog.deleteMany();

  console.log('✅ Tozalandi.');
  console.log('');

  await prisma.$disconnect();

  console.log('🌱 Yangi seed ishga tushirilmoqda...');
  const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], { stdio: 'inherit', shell: true });
  process.exit(result.status ?? 0);
}

main().catch((e) => {
  console.error('❌ Reset xatolik:', e);
  process.exit(1);
});
