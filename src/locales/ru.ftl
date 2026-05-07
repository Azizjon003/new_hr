# --- Общее ---
welcome = Здравствуйте! Добро пожаловать в HR бот.
choose-language = Tilni tanlang / Выберите язык:
language-changed = ✅ Язык изменён: Русский
help-text =
    🤖 <b>HR Бот — руководство</b>

    Через этого бота вы можете подавать заявки на вакансии в различных компаниях.

    <b>Команды:</b>
    /start — перезапустить бота
    /menu — главное меню
    /help — помощь
    /cancel — отменить текущее действие

    <b>Процесс подачи:</b>
    1. Выбор компании
    2. Выбор отдела
    3. Выбор должности
    4. Ответы на вопросы анкеты
    5. (Если требуется) фото или резюме
    6. Подтверждение и отправка

    Вопросы: @your_admin
about-text =
    <b>HR Бот</b>

    Официальный бот для приёма заявок от кандидатов.
    Версия: 0.1.0

# --- Согласие ---
consent-title = 📋 <b>Политика конфиденциальности</b>
consent-text =
    Для подачи заявки вы должны согласиться со следующим:

    • Ваши персональные данные (имя, телефон, email и т.д.) будут рассмотрены HR командой.
    • Ваши данные не будут переданы третьим лицам.
    • В любой момент вы можете удалить свои данные через "/profile удалить".

    Подтвердите согласие, чтобы продолжить.
consent-accept = ✅ Согласен(на)
consent-already = Вы уже дали согласие.

# --- Главное меню ---
menu-title = 🏠 Главное меню
menu-apply = 📝 Подать заявку
menu-profile = 👤 Мой профиль
menu-my-applications = 📂 Мои заявки
menu-language = 🌐 Сменить язык
menu-help = ❓ Помощь
menu-about = ℹ️ О боте

# --- Профиль ---
profile-title = 👤 <b>Мой профиль</b>
profile-empty = Профиль ещё не заполнен. Пожалуйста, заполните.
profile-fullname = ФИО
profile-phone = Телефон
profile-birthdate = Дата рождения
profile-email = Email
profile-city = Город
profile-not-set = не указано
profile-edit = ✏️ Редактировать
profile-fill = ✏️ Заполнить
profile-ask-fullname = Введите ваше ФИО:
profile-ask-phone = Отправьте номер телефона (нажмите кнопку или введите в формате +998...):
profile-ask-phone-button = 📱 Отправить номер
profile-ask-birthdate = Введите дату рождения (DD.MM.YYYY):
profile-ask-email = Введите email (или "-" — пропустить):
profile-ask-city = Введите город проживания (или "-" — пропустить):
profile-saved = ✅ Профиль сохранён.
profile-confirm-question = Профиль верный?
profile-confirm-yes = ✅ Да, верно
profile-confirm-edit = ✏️ Редактировать

# --- Заявка ---
apply-choose-company = 🏢 Выберите компанию:
apply-no-companies = ⚠️ Нет активных компаний.
apply-choose-department = 🗂 Выберите отдел:
apply-no-departments = ⚠️ В этой компании нет активных отделов.
apply-choose-position = 💼 Выберите должность:
apply-no-positions = ⚠️ В этом отделе нет активных должностей.
apply-position-info =
    💼 <b>{ $title }</b>

    { $description }

    💰 <b>Зарплата:</b> { $salary }
    📍 <b>Локация:</b> { $location }
    🕒 <b>Тип занятости:</b> { $employment }
    🎯 <b>Опыт:</b> { $experience }
apply-position-start = ✅ Начать анкету
apply-position-cancel = ❌ Отмена
apply-back = ⬅️ Назад
apply-skip = ⏭ Пропустить
apply-cancel = ❌ Отмена
apply-progress = Вопрос { $current }/{ $total }
apply-required = Этот вопрос обязательный.
apply-invalid = ⚠️ Неверный ответ. Попробуйте ещё раз.
apply-photo-request = 📸 Пожалуйста, отправьте ваше фото:
apply-cv-request = 📄 Пожалуйста, отправьте резюме (PDF/DOCX):
apply-confirm-title = 📋 <b>Проверьте перед отправкой:</b>
apply-confirm-submit = ✅ Отправить
apply-confirm-edit = ✏️ Редактировать
apply-confirm-cancel = ❌ Отмена
apply-submitted = ✅ Заявка принята! Номер: <code>{ $ref }</code>
apply-cancelled = ❌ Анкета отменена.
apply-draft-found = ⚠️ У вас есть незавершённая анкета.
apply-draft-continue = ⏯ Продолжить
apply-draft-restart = 🆕 Начать заново

# --- Мои заявки ---
my-apps-title = 📂 <b>Мои заявки</b>
my-apps-empty = У вас пока нет заявок.
my-apps-status-DRAFT = 📝 Черновик
my-apps-status-PENDING = ⏳ На рассмотрении
my-apps-status-VIEWED = 👁 Просмотрено
my-apps-status-ACCEPTED = ✅ Принято
my-apps-status-REJECTED = ❌ Отклонено
my-apps-status-WITHDRAWN = ↩️ Отозвано
my-apps-withdraw = ↩️ Отозвать
my-apps-withdraw-confirm = Отозвать заявку?
my-apps-withdrawn = ✅ Заявка отозвана.
my-apps-filter-all = 📋 Все
my-apps-detail-title = 📨 Детали заявки
my-apps-pdf = 📄 Скачать PDF
my-apps-no-pdf = ⚠️ PDF ещё не готов
my-apps-position = Должность
my-apps-company = Компания
my-apps-submitted = Отправлено
my-apps-status-label = Статус
my-apps-answers-label = Ответы
my-apps-empty-filter = Нет заявок по этому фильтру
my-apps-page = Страница { $current }/{ $total }

# --- Валидация ---
val-text-too-short = Текст слишком короткий (минимум { $min } символов).
val-text-too-long = Текст слишком длинный (максимум { $max } символов).
val-not-number = Пожалуйста, введите число.
val-number-too-small = Число слишком маленькое (минимум { $min }).
val-number-too-large = Число слишком большое (максимум { $max }).
val-bad-date = Дата должна быть в формате DD.MM.YYYY.
val-bad-phone = Неверный номер телефона. Пример: +998901234567
val-bad-email = Неверный email.
val-file-too-large = Файл слишком большой (максимум { $max } MB).
val-bad-file = Пожалуйста, отправьте файл.
val-bad-photo = Пожалуйста, отправьте фото.

# --- Choice ---
choice-done = ✅ Готово
boolean-yes = Да
boolean-no = Нет

# --- Admin ---
admin-only = ⛔ Эта команда только для администраторов.
admin-menu-title = ⚙️ <b>Админ панель</b>
admin-menu-companies = 🏢 Компании
admin-menu-departments = 🗂 Отделы
admin-menu-positions = 💼 Должности
admin-menu-questions = ❓ Вопросы
admin-menu-applications = 📨 Заявки
admin-menu-stats = 📊 Статистика
admin-menu-users = 👥 Пользователи
admin-menu-admins = 👤 Администраторы
admin-menu-trash = 🗑 Удалённые
admin-menu-log = 📜 Журнал действий
admin-menu-setup = ⚙️ Мастер настройки

# --- Ошибки ---
error-unknown = ⚠️ Произошла непредвиденная ошибка. Попробуйте снова.
error-blocked = ⛔ Ваш аккаунт заблокирован.
cancelled = ❌ Отменено.
back = ⬅️ Назад
done = ✅ Готово

# --- Тип занятости ---
emp-FULL_TIME = Полная занятость
emp-PART_TIME = Частичная
emp-CONTRACT = Контракт
emp-INTERNSHIP = Стажировка
emp-REMOTE = Удалённо
emp-HYBRID = Гибрид

# --- Опыт ---
exp-NO_EXPERIENCE = Без опыта
exp-JUNIOR = Junior (1-2 года)
exp-MIDDLE = Middle (2-5 лет)
exp-SENIOR = Senior (5+ лет)
exp-LEAD = Lead/Manager
