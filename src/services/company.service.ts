import { Company, Department, Position, Lang } from '@prisma/client';
import { prisma } from './prisma.js';

export async function listActiveCompanies(): Promise<Company[]> {
  return prisma.company.findMany({
    where: { isActive: true, isDeleted: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function listActiveDepartments(companyId: string): Promise<Department[]> {
  return prisma.department.findMany({
    where: { companyId, isActive: true, isDeleted: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function listActivePositions(departmentId: string): Promise<Position[]> {
  return prisma.position.findMany({
    where: { departmentId, isActive: true, isDeleted: false },
    orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getPositionWithRelations(id: string) {
  return prisma.position.findUnique({
    where: { id },
    include: {
      department: { include: { company: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  });
}

export function getCompanyName(c: Company, lang: Lang): string {
  return lang === 'RU' ? c.nameRu : c.nameUz;
}
export function getDepartmentName(d: Department, lang: Lang): string {
  return lang === 'RU' ? d.nameRu : d.nameUz;
}
export function getPositionTitle(p: Position, lang: Lang): string {
  return lang === 'RU' ? p.titleRu : p.titleUz;
}
export function getPositionDescription(p: Position, lang: Lang): string {
  return (lang === 'RU' ? p.descriptionRu : p.descriptionUz) ?? '';
}

export function formatSalary(p: Position, lang: Lang): string {
  if (p.salaryNegotiable) return lang === 'RU' ? 'По договорённости' : 'Kelishilgan holda';
  if (p.salaryFrom && p.salaryTo) {
    return `${formatNumber(p.salaryFrom)}–${formatNumber(p.salaryTo)} ${p.currency}`;
  }
  if (p.salaryFrom) return `${lang === 'RU' ? 'от' : 'dan'} ${formatNumber(p.salaryFrom)} ${p.currency}`;
  if (p.salaryTo) return `${lang === 'RU' ? 'до' : 'gacha'} ${formatNumber(p.salaryTo)} ${p.currency}`;
  return lang === 'RU' ? 'не указано' : 'koʼrsatilmagan';
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ');
}
