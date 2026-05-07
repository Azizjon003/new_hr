/* eslint-disable no-console */
import { PrismaClient, EmploymentType, ExperienceLevel } from '@prisma/client';
import { questionTemplates, applyTemplate } from './seeds/question-templates.js';
import { companiesSeed } from './seeds/companies.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seed boshlandi...');

  let createdCompanies = 0;
  let createdDepartments = 0;
  let createdPositions = 0;
  let createdQuestions = 0;

  for (const cSeed of companiesSeed) {
    // Kompaniya bor-yo'qligini tekshirish (name_uz bo'yicha)
    const existing = await prisma.company.findFirst({ where: { nameUz: cSeed.nameUz } });
    if (existing) {
      console.log(`⏭  "${cSeed.nameUz}" allaqachon mavjud — o'tkazib yuborildi`);
      continue;
    }

    const company = await prisma.company.create({
      data: {
        nameUz: cSeed.nameUz,
        nameRu: cSeed.nameRu,
        descriptionUz: cSeed.descriptionUz,
        descriptionRu: cSeed.descriptionRu,
        channelId: cSeed.channelId ?? null,
        isActive: true,
        order: cSeed.order ?? 0,
      },
    });
    createdCompanies++;
    console.log(`✅ Kompaniya: ${company.nameUz}`);

    for (const dSeed of cSeed.departments) {
      const dept = await prisma.department.create({
        data: {
          companyId: company.id,
          nameUz: dSeed.nameUz,
          nameRu: dSeed.nameRu,
          isActive: true,
          order: dSeed.order ?? 0,
        },
      });
      createdDepartments++;
      console.log(`   ↳ Bo'lim: ${dept.nameUz}`);

      for (const pSeed of dSeed.positions) {
        const position = await prisma.position.create({
          data: {
            departmentId: dept.id,
            titleUz: pSeed.titleUz,
            titleRu: pSeed.titleRu,
            descriptionUz: pSeed.descriptionUz,
            descriptionRu: pSeed.descriptionRu,
            salaryFrom: pSeed.salaryFrom,
            salaryTo: pSeed.salaryTo,
            currency: pSeed.currency ?? 'UZS',
            salaryNegotiable: pSeed.salaryNegotiable ?? false,
            location: pSeed.location,
            employmentType: pSeed.employmentType ?? EmploymentType.FULL_TIME,
            experienceLevel: pSeed.experienceLevel ?? ExperienceLevel.NO_EXPERIENCE,
            requirePhoto: pSeed.requirePhoto ?? false,
            requireCv: pSeed.requireCv ?? false,
            isActive: true,
            isFeatured: pSeed.isFeatured ?? false,
            order: pSeed.order ?? 0,
          },
        });
        createdPositions++;
        console.log(`      ↳ Lavozim: ${position.titleUz}`);

        // Savollar — template orqali yoki maxsus ro'yxatdan
        const questions = pSeed.useTemplate
          ? applyTemplate(pSeed.useTemplate)
          : pSeed.questions ?? [];

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await prisma.question.create({
            data: {
              positionId: position.id,
              order: i,
              textUz: q.textUz,
              textRu: q.textRu,
              type: q.type,
              required: q.required ?? true,
              options: q.options ?? undefined,
              validation: q.validation ?? undefined,
              placeholderUz: q.placeholderUz,
              placeholderRu: q.placeholderRu,
            },
          });
          createdQuestions++;
        }
        console.log(`         ↳ ${questions.length} ta savol qo'shildi`);
      }
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Yakuniy:`);
  console.log(`   🏢 Kompaniyalar: ${createdCompanies}`);
  console.log(`   🗂 Bo'limlar:    ${createdDepartments}`);
  console.log(`   💼 Lavozimlar:   ${createdPositions}`);
  console.log(`   ❓ Savollar:     ${createdQuestions}`);
  console.log(`   📋 Shablonlar:   ${Object.keys(questionTemplates).length} ta mavjud`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed muvaffaqiyatli tugadi!');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
