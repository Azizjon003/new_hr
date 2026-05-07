# --- Umumiy ---
welcome = Assalomu alaykum! HR botga xush kelibsiz.
choose-language = Tilni tanlang / Выберите язык:
language-changed = ✅ Til o'zgartirildi: O'zbekcha
help-text =
    🤖 <b>HR Bot — qo'llanma</b>

    Ushbu bot orqali siz turli kompaniyalardagi vakansiyalarga ariza topshira olasiz.

    <b>Buyruqlar:</b>
    /start — botni qaytadan ishga tushirish
    /menu — asosiy menyu
    /help — yordam
    /cancel — joriy amalni bekor qilish

    <b>Anketa flow:</b>
    1. Kompaniya tanlash
    2. Bo'lim tanlash
    3. Lavozim tanlash
    4. Anketa savollariga javob berish
    5. (Agar so'ralsa) rasm yoki CV yuborish
    6. Tasdiqlash va yuborish

    Savollar bo'lsa: @your_admin
about-text =
    <b>HR Bot</b>

    Kompaniyalar uchun nomzodlardan ariza qabul qiladigan rasmiy bot.
    Versiya: 0.1.0

# --- Rozilik ---
consent-title = 📋 <b>Maxfiylik siyosati</b>
consent-text =
    Anketani topshirish uchun siz quyidagilarga rozi bo'lishingiz kerak:

    • Ism, familiya, telefon, email kabi shaxsiy ma'lumotlaringiz HR jamoasi tomonidan ko'rib chiqiladi.
    • Ma'lumotlaringiz uchinchi shaxslarga oshkor qilinmaydi.
    • Istalgan vaqtda "/profile o'chirish" orqali ma'lumotlarni o'chirishingiz mumkin.

    Davom etish uchun roziligingizni bildiring.
consent-accept = ✅ Roziman
consent-already = Siz allaqachon rozilik bildirgansiz.

# --- Asosiy menyu ---
menu-title = 🏠 Asosiy menyu
menu-apply = 📝 Anketa topshirish
menu-profile = 👤 Mening profilim
menu-my-applications = 📂 Mening arizalarim
menu-language = 🌐 Tilni o'zgartirish
menu-help = ❓ Yordam
menu-about = ℹ️ Bot haqida

# --- Profil ---
profile-title = 👤 <b>Mening profilim</b>
profile-empty = Profilingiz hali to'ldirilmagan. Iltimos, to'ldiring.
profile-fullname = To'liq ism
profile-phone = Telefon
profile-birthdate = Tug'ilgan sana
profile-email = Email
profile-city = Shahar
profile-not-set = ko'rsatilmagan
profile-edit = ✏️ Tahrirlash
profile-fill = ✏️ To'ldirish
profile-ask-fullname = To'liq ismingizni kiriting (FIO):
profile-ask-phone = Telefon raqamingizni yuboring (tugmani bosing yoki +998... ko'rinishida yozing):
profile-ask-phone-button = 📱 Telefon raqamni yuborish
profile-ask-birthdate = Tug'ilgan sanangizni kiriting (DD.MM.YYYY):
profile-ask-email = Email manzilingizni kiriting (yoki "-" — o'tkazib yuborish):
profile-ask-city = Yashash shahringizni kiriting (yoki "-" — o'tkazib yuborish):
profile-saved = ✅ Profil saqlandi.
profile-confirm-question = Profilingiz to'g'rimi?
profile-confirm-yes = ✅ Ha, to'g'ri
profile-confirm-edit = ✏️ Tahrirlash

# --- Anketa flow ---
apply-choose-company = 🏢 Kompaniyani tanlang:
apply-no-companies = ⚠️ Hozircha faol kompaniyalar yo'q.
apply-choose-department = 🗂 Bo'limni tanlang:
apply-no-departments = ⚠️ Bu kompaniyada faol bo'limlar yo'q.
apply-choose-position = 💼 Lavozimni tanlang:
apply-no-positions = ⚠️ Bu bo'limda faol lavozimlar yo'q.
apply-position-info =
    💼 <b>{ $title }</b>

    { $description }

    💰 <b>Maosh:</b> { $salary }
    📍 <b>Joylashuv:</b> { $location }
    🕒 <b>Ish turi:</b> { $employment }
    🎯 <b>Tajriba:</b> { $experience }
apply-position-start = ✅ Anketani boshlash
apply-position-cancel = ❌ Bekor qilish
apply-back = ⬅️ Orqaga
apply-skip = ⏭ O'tkazib yuborish
apply-cancel = ❌ Bekor qilish
apply-progress = Savol { $current }/{ $total }
apply-required = Bu savol majburiy.
apply-invalid = ⚠️ Noto'g'ri javob. Qaytadan urinib ko'ring.
apply-photo-request = 📸 Iltimos, rasmingizni yuboring:
apply-cv-request = 📄 Iltimos, CV (rezyume) faylingizni yuboring (PDF/DOCX):
apply-confirm-title = 📋 <b>Yuborishdan oldin tekshiring:</b>
apply-confirm-submit = ✅ Yuborish
apply-confirm-edit = ✏️ Tahrirlash
apply-confirm-cancel = ❌ Bekor qilish
apply-submitted = ✅ Arizangiz qabul qilindi! Raqami: <code>{ $ref }</code>
apply-cancelled = ❌ Anketa bekor qilindi.
apply-draft-found = ⚠️ Sizda yarim qolgan anketa bor.
apply-draft-continue = ⏯ Davom ettirish
apply-draft-restart = 🆕 Yangidan boshlash

# --- Mening arizalarim ---
my-apps-title = 📂 <b>Mening arizalarim</b>
my-apps-empty = Sizda hali ariza yo'q.
my-apps-status-DRAFT = 📝 Qoralama
my-apps-status-PENDING = ⏳ Ko'rib chiqilmoqda
my-apps-status-VIEWED = 👁 Ko'rildi
my-apps-status-ACCEPTED = ✅ Qabul qilindi
my-apps-status-REJECTED = ❌ Rad etildi
my-apps-status-WITHDRAWN = ↩️ Qaytarib olindi
my-apps-withdraw = ↩️ Qaytarib olish
my-apps-withdraw-confirm = Arizangizni qaytarib olishni xohlaysizmi?
my-apps-withdrawn = ✅ Ariza qaytarib olindi.
my-apps-filter-all = 📋 Hammasi
my-apps-detail-title = 📨 Ariza tafsiloti
my-apps-pdf = 📄 PDF yuklab olish
my-apps-no-pdf = ⚠️ PDF hali tayyor emas
my-apps-position = Lavozim
my-apps-company = Kompaniya
my-apps-submitted = Topshirilgan
my-apps-status-label = Holat
my-apps-answers-label = Javoblar
my-apps-empty-filter = Bu filterga mos arizalar yo'q
my-apps-page = Sahifa { $current }/{ $total }

# --- Validatsiya ---
val-text-too-short = Matn juda qisqa (kamida { $min } ta belgi).
val-text-too-long = Matn juda uzun (ko'pi bilan { $max } ta belgi).
val-not-number = Iltimos, son kiriting.
val-number-too-small = Son juda kichik (kamida { $min }).
val-number-too-large = Son juda katta (ko'pi bilan { $max }).
val-bad-date = Sana DD.MM.YYYY ko'rinishida bo'lishi kerak.
val-bad-phone = Telefon raqami noto'g'ri. Masalan: +998901234567
val-bad-email = Email manzili noto'g'ri.
val-file-too-large = Fayl juda katta (ko'pi bilan { $max } MB).
val-bad-file = Iltimos, fayl yuboring.
val-bad-photo = Iltimos, rasm yuboring.

# --- Choice ---
choice-done = ✅ Tugatish
boolean-yes = Ha
boolean-no = Yo'q

# --- Admin ---
admin-only = ⛔ Bu buyruq faqat adminlar uchun.
admin-menu-title = ⚙️ <b>Admin paneli</b>
admin-menu-companies = 🏢 Kompaniyalar
admin-menu-departments = 🗂 Bo'limlar
admin-menu-positions = 💼 Lavozimlar
admin-menu-questions = ❓ Savollar
admin-menu-applications = 📨 Arizalar
admin-menu-stats = 📊 Statistika
admin-menu-users = 👥 Foydalanuvchilar
admin-menu-admins = 👤 Adminlar
admin-menu-trash = 🗑 O'chirilganlar
admin-menu-log = 📜 Action log
admin-menu-setup = ⚙️ Sozlash sehrgari

# --- Xato ---
error-unknown = ⚠️ Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.
error-blocked = ⛔ Sizning hisobingiz bloklangan.
cancelled = ❌ Bekor qilindi.
back = ⬅️ Orqaga
done = ✅ Tayyor

# --- Ish turlari ---
emp-FULL_TIME = To'liq stavka
emp-PART_TIME = Yarim stavka
emp-CONTRACT = Shartnoma
emp-INTERNSHIP = Amaliyot
emp-REMOTE = Masofadan
emp-HYBRID = Gibrid

# --- Tajriba ---
exp-NO_EXPERIENCE = Tajribasiz
exp-JUNIOR = Junior (1-2 yil)
exp-MIDDLE = Middle (2-5 yil)
exp-SENIOR = Senior (5+ yil)
exp-LEAD = Lead/Manager
