-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('UZ', 'RU');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('NO_EXPERIENCE', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'PHONE', 'EMAIL', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'FILE', 'PHOTO', 'BOOLEAN', 'LOCATION');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "tgFirstName" TEXT,
    "tgLastName" TEXT,
    "lang" "Lang" NOT NULL DEFAULT 'UZ',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "profileFullName" TEXT,
    "profilePhone" TEXT,
    "profileBirthDate" TIMESTAMP(3),
    "profileEmail" TEXT,
    "profileCity" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "descriptionUz" TEXT,
    "descriptionRu" TEXT,
    "logoFilePath" TEXT,
    "channelId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "titleUz" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "descriptionUz" TEXT,
    "descriptionRu" TEXT,
    "salaryFrom" INTEGER,
    "salaryTo" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "salaryNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'NO_EXPERIENCE',
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireCv" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "textUz" TEXT NOT NULL,
    "textRu" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "validation" JSONB,
    "placeholderUz" TEXT,
    "placeholderRu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "photoFilePath" TEXT,
    "cvFilePath" TEXT,
    "pdfFilePath" TEXT,
    "channelMessageId" TEXT,
    "channelChatId" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "AppStatus",
    "toStatus" "AppStatus" NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "Company_isActive_isDeleted_idx" ON "Company"("isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "Department_companyId_isActive_isDeleted_idx" ON "Department"("companyId", "isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "Position_departmentId_isActive_isDeleted_idx" ON "Position"("departmentId", "isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "Question_positionId_order_idx" ON "Question"("positionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Application_refCode_key" ON "Application"("refCode");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_positionId_status_idx" ON "Application"("positionId", "status");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_applicationId_questionId_key" ON "Answer"("applicationId", "questionId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_idx" ON "ApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_createdAt_idx" ON "AdminLog"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
