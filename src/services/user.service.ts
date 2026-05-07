import { Lang, User } from '@prisma/client';
import { prisma } from './prisma.js';

export async function setUserLang(userId: string, lang: Lang): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { lang } });
}

export async function setUserConsent(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { consentGivenAt: new Date() },
  });
}

export async function updateProfile(
  userId: string,
  data: Partial<
    Pick<User, 'profileFullName' | 'profilePhone' | 'profileBirthDate' | 'profileEmail' | 'profileCity'>
  >,
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data });
}

export function isProfileComplete(user: User): boolean {
  return Boolean(user.profileFullName && user.profilePhone && user.profileBirthDate);
}
