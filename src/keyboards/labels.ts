// Menyu tugma matnlari — `hears` filtri uchun ikkala tilda ham yoziladi.
// MUHIM: bu yerdagi matnlar uz.ftl va ru.ftl bilan harf-baholda mos bo'lishi shart
// (apostroflar, emoji, bo'shliqlar — hammasi).

export const LABELS = {
  apply: ['📝 Anketa topshirish', '📝 Подать заявку'],
  profile: ['👤 Mening profilim', '👤 Мой профиль'],
  myApplications: ['📂 Mening arizalarim', '📂 Мои заявки'],
  language: ["🌐 Tilni o'zgartirish", '🌐 Сменить язык'],
  help: ['❓ Yordam', '❓ Помощь'],
  about: ['ℹ️ Bot haqida', 'ℹ️ О боте'],
} as const;
