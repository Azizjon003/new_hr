import { Context, SessionFlavor } from 'grammy';
import type { ConversationFlavor } from '@grammyjs/conversations';
import type { I18nFlavor } from '@grammyjs/i18n';
import type { User as DbUser, Lang } from '@prisma/client';

export interface SessionData {
  applyState?: {
    companyId?: string;
    departmentId?: string;
    positionId?: string;
    // Menu xabari ID — edit qilish uchun
    messageId?: number;
    chatId?: number;
  };
  profileEdit?: {
    field?: 'fullName' | 'phone' | 'birthDate' | 'email' | 'city';
  };
  // admin sessiya — qaysi entity bilan ishlanyapti
  admin?: {
    selectedCompanyId?: string;
    selectedDepartmentId?: string;
    selectedPositionId?: string;
    selectedQuestionId?: string;
    selectedUserId?: string;
    editField?: string;
  };
}

export type MyContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor &
  I18nFlavor & {
    dbUser?: DbUser;
    isAdmin?: boolean;
  };

export type Tr = (key: string, vars?: Record<string, unknown>) => string;
export type { Lang };
