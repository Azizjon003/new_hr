import { prisma } from './prisma.js';

export async function generateRefCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `ref:${year}`;

  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });

  const seq = String(counter.value).padStart(4, '0');
  return `HR-${year}-${seq}`;
}
