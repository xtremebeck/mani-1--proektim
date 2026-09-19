import { CITIES } from "./shared/content.mjs";

const STRINGS = {
  en: {
    navFeatures: "Features", navHow: "How it works", navCities: "Cities", navPartners: "For partners", navFaq: "FAQ", navCta: "Play demo",
    heroBadge: "Now in beta · Tashkent & Samarkand",
    heroTitle: "Uzbekistan,<br><span class=\"grad\">One Quest at a Time</span>",
    heroText: "The <b>gamified travel app</b> that turns Uzbekistan into a story you play. Follow a city-wide <b>quest story</b>, meet locals who give you secret clues, hunt for hidden spots, <b>earn XP</b> and <b>stamps</b>, and unlock <b>real discounts</b> at cafés, restaurants and shops.",
    heroCta: "Play the web demo", heroCta2: "Explore features", swipe: "Tap a phone to explore",
    statPlaces: "Adventures", statQuests: "Quests", statCities: "Cities", statLangs: "Languages",
    featLabel: "App features", featTitle: "Your complete Uzbekistan travel RPG", featText: "From smart suggestions to an AI companion, quest tracking and a digital passport, every walk becomes something to remember.",
    f1t: "10 kinds of quests", f1d: "Photo spots, treasure hunts with hot–cold GPS, riddles, timeline puzzles, quizzes, taste challenges — and meeting locals who whisper a secret word.",
    f2t: "Hamroh, your AI companion", f2d: "Ask about a place's story, what to eat, or how to get around. Hamroh answers in Uzbek, English or Russian, even offline.",
    f3t: "Smart suggestions", f3d: "Tell us what you love (history, food, crafts, hidden gems) and UzQuest suggests where to go next, closest first.",
    f4t: "Passport, cards & gift stamps", f4d: "Collect stamps, 15 collectible cards from common to legendary, and gift stamps like Early Bird, Night Owl and Local Friend.",
    f5t: "Real discounts", f5d: "Finishing places unlocks coupons for partner cafés, restaurants and shops: free tea, 2-for-1 somsa, 15% off plov and more.",
    f6t: "Digital detox", f6d: "Earn bonus XP for putting your phone away for 20 minutes and simply being present.",
    f7t: "Story campaigns", f7d: "Every city is a story. Carry a sealed letter across Tashkent or rebuild Ulugh Beg's lost star map in Samarkand, one chapter at a time.",
    f8t: "Offline-first", f8d: "Works in the metro and at the bazaar. Progress syncs when you're back online.",
    howLabel: "How it works", howTitle: "From first step to city conquered",
    s1t: "Choose city & interests", s1d: "Start in Tashkent or Samarkand and tell us what excites you.",
    s2t: "Follow the story", s2d: "Each chapter's clue — or a local you meet — tells you where to go next.",
    s3t: "Play the quests", s3d: "Snap the photo spot, crack the riddle, find the hidden point, get the secret word.",
    s4t: "Unlock rewards", s4d: "XP, stamps, collectible cards, gift stamps and real coupons from partner businesses.",
    citiesLabel: "Destinations", citiesTitle: "Two legendary cities. More coming.",
    places: "{n} adventures", quests: "{n} quests", soon: "Coming soon", soonText: "Bukhara · Khiva · Fergana Valley",
    shotsLabel: "Screenshots", shotsTitle: "See it in action", shotsText: "Real screens from the working web app.",
    sh1: "Easy onboarding", sh2: "Your adventure hub", sh3: "Quests at every place", sh4: "Adventure complete", sh5: "Digital passport", sh6: "Hamroh AI companion", sh7: "City map",
    tryLabel: "Try it now", tryTitle: "Play it right here", tryText: "This is the real app. Tap through onboarding, pick a place, complete its quests and finish your first adventure. Your progress is saved in this browser.",
    tryOpen: "Open full screen", tryPhone: "Best on a phone: open this page on your mobile and add it to your home screen.",
    partnersLabel: "For partners", partnersTitle: "Bring travellers to your door",
    partnersText: "Cafés, museums, craft workshops, hotels and tour operators can become quest locations and reward points.",
    p1t: "Foot traffic", p1d: "Become a quest stop or a reward point that travellers actively look for.",
    p2t: "Voucher redemption", p2d: "Verify rewards in seconds from the partner dashboard.",
    p3t: "Real analytics", p3d: "See how many travellers start, finish and come back.",
    partnersCta: "See the partner dashboard",
    faqLabel: "FAQ", faqTitle: "Questions, answered",
    q1: "What is UzQuest?", a1: "UzQuest is a gamified travel app for Uzbekistan. It turns sightseeing into adventures: each place has quests you complete to earn XP, stamps in your digital passport, badges and rewards.",
    q2: "Is it free? What are the rewards?", a2: "Yes, it's free for travellers. Finishing places and cities unlocks coupons from partner cafés, restaurants and shops, plus a city medal voucher.",
    q3: "Does it work offline?", a3: "Yes. Quests, your passport and progress are saved on your phone and sync when you reconnect. The AI guide also has an offline mode.",
    q4: "Which languages are supported?", a4: "Uzbek, English and Russian, and you can switch at any time.",
    q5: "Where can I use it?", a5: "Right now in Tashkent and Samarkand, with {places} adventures and {quests} quests. Bukhara and Khiva are next.",
    q6: "Is there a mobile app?", a6: "The web app already works like an app: add it to your home screen. Native iOS and Android versions are next on our roadmap.",
    ctaTitle: "Ready to start your Uzbekistan quest?", ctaText: "Open the demo, pick your first adventure and earn your first stamp in minutes.",
    footerText: "The gamified travel app that turns every trip to Uzbekistan into an adventure.",
    footerProduct: "Product", footerProject: "Project", footerDemo: "Web demo", footerAdmin: "Partner dashboard", footerRights: "UzQuest. Built in Uzbekistan.",
    sh8: "Coupons & rewards"
  },
  uz: {
    navFeatures: "Imkoniyatlar", navHow: "Qanday ishlaydi", navCities: "Shaharlar", navPartners: "Hamkorlar uchun", navFaq: "Savollar", navCta: "Demoni o'ynash",
    heroBadge: "Beta · Toshkent va Samarqand",
    heroTitle: "O'zbekiston —<br><span class=\"grad\">kvest ortidan kvest</span>",
    heroText: "O'zbekistonni o'ynaladigan hikoyaga aylantiruvchi <b>o'yinlashtirilgan ilova</b>. Shahar bo'ylab <b>kvest hikoyasi</b>ga ergashing, maxfiy ishora beradigan mahalliy odamlar bilan uchrashing, yashirin joylarni qidiring, <b>XP</b> va <b>stamplar</b> to'plang, kafe, restoran va do'konlarda <b>haqiqiy chegirmalar</b> oching.",
    heroCta: "Veb-demoni o'ynash", heroCta2: "Imkoniyatlar", swipe: "Telefonni bosib ko'ring",
    statPlaces: "Sarguzasht", statQuests: "Kvest", statCities: "Shahar", statLangs: "Til",
    featLabel: "Imkoniyatlar", featTitle: "O'zbekiston bo'ylab to'liq sayohat RPG'si", featText: "Aqlli tavsiyalar, AI hamroh, kvestlar va raqamli pasport — har bir sayr esda qoladigan voqeaga aylanadi.",
    f1t: "10 xil kvest", f1d: "Foto nuqtalar, GPS \"issiq-sovuq\" xazina ovi, topishmoqlar, vaqt chizig'i jumboqlari, viktorinalar, ta'm sinovlari — va maxfiy so'z aytadigan mahalliy odamlar bilan uchrashuvlar.",
    f2t: "Hamroh — AI yo'ldosh", f2d: "Joy tarixi, taom yoki transport haqida so'rang. Hamroh o'zbek, ingliz va rus tillarida, hatto oflayn javob beradi.",
    f3t: "Aqlli tavsiyalar", f3d: "Nimani yoqtirishingizni ayting — tarix, taom, hunarmandchilik, yashirin joylar — UzQuest keyingi manzilni taklif qiladi.",
    f4t: "Pasport, kartalar va sovg'a stamplari", f4d: "Stamplar, oddiydan afsonaviygacha 15 ta kolleksiya kartasi va \"Erta turuvchi\", \"Tungi boyo'g'li\", \"Mahalliy do'st\" kabi sovg'a stamplarini yig'ing.",
    f5t: "Haqiqiy chegirmalar", f5d: "Joylarni yakunlash hamkor kafe, restoran va do'konlar kuponlarini ochadi: bepul choy, 2 ta somsa 1 narxida, palovga 15% va boshqalar.",
    f6t: "Raqamli detoks", f6d: "Telefonni 20 daqiqa chetga qo'yib, lahzadan zavq olganingiz uchun bonus XP.",
    f7t: "Hikoya kampaniyalari", f7d: "Har bir shahar — hikoya. Toshkent bo'ylab muhrlangan maktubni olib boring yoki Samarqandda Ulug'bekning yo'qolgan yulduz xaritasini bob-bob tiklang.",
    f8t: "Oflayn ishlaydi", f8d: "Metroda ham, bozorda ham ishlaydi. Internet qaytganda progress sinxronlanadi.",
    howLabel: "Qanday ishlaydi", howTitle: "Birinchi qadamdan shahar zabtigacha",
    s1t: "Shahar va qiziqishlar", s1d: "Toshkent yoki Samarqandni tanlang va nimalar yoqishini ayting.",
    s2t: "Hikoyaga ergashing", s2d: "Har bir bobning ishorasi — yoki uchragan mahalliy odam — keyingi manzilni aytadi.",
    s3t: "Kvestlarni o'ynang", s3d: "Foto nuqtani suratga oling, topishmoqni yeching, yashirin nuqtani toping, maxfiy so'zni oling.",
    s4t: "Sovg'alarni oching", s4d: "XP, stamplar, kolleksiya kartalari, sovg'a stamplari va hamkorlardan haqiqiy kuponlar.",
    citiesLabel: "Manzillar", citiesTitle: "Ikki afsonaviy shahar. Yana ko'plari yo'lda.",
    places: "{n} sarguzasht", quests: "{n} kvest", soon: "Tez orada", soonText: "Buxoro · Xiva · Farg'ona vodiysi",
    shotsLabel: "Skrinshotlar", shotsTitle: "Amalda ko'ring", shotsText: "Ishlayotgan veb-ilovadan haqiqiy ekranlar.",
    sh1: "Oson boshlanish", sh2: "Sarguzashtlar markazi", sh3: "Har joyda kvestlar", sh4: "Sarguzasht yakunlandi", sh5: "Raqamli pasport", sh6: "Hamroh AI", sh7: "Shahar xaritasi",
    tryLabel: "Hozir sinab ko'ring", tryTitle: "Shu yerning o'zida o'ynang", tryText: "Bu haqiqiy ilova. Boshlang, joy tanlang, kvestlarni bajaring va birinchi sarguzashtingizni yakunlang. Progress shu brauzerda saqlanadi.",
    tryOpen: "To'liq ekranda ochish", tryPhone: "Telefonda yaxshiroq: sahifani mobil qurilmada oching va bosh ekranga qo'shing.",
    partnersLabel: "Hamkorlar uchun", partnersTitle: "Sayohatchilarni eshigingizga olib keling",
    partnersText: "Kafe, muzey, hunarmandchilik ustaxonalari, mehmonxona va turoperatorlar kvest manzili va mukofot nuqtasiga aylanishi mumkin.",
    p1t: "Mijozlar oqimi", p1d: "Sayohatchilar izlab keladigan kvest yoki mukofot nuqtasiga aylaning.",
    p2t: "Vaucherlarni tekshirish", p2d: "Hamkor panelida mukofotlarni soniyalarda tasdiqlang.",
    p3t: "Aniq statistika", p3d: "Nechta sayohatchi boshlagan, yakunlagan va qaytganini ko'ring.",
    partnersCta: "Hamkor panelini ko'rish",
    faqLabel: "Savollar", faqTitle: "Ko'p beriladigan savollar",
    q1: "UzQuest nima?", a1: "UzQuest — O'zbekiston bo'ylab o'yinlashtirilgan sayohat ilovasi. Har bir joyda kvestlar bor: ularni bajarib XP, pasport stamplari, nishonlar va mukofotlar olasiz.",
    q2: "Bepulmi? Qanday sovg'alar bor?", a2: "Ha, sayohatchilar uchun bepul. Joylar va shaharlarni yakunlash hamkor kafe, restoran va do'konlar kuponlarini hamda shahar medali vaucherini ochadi.",
    q3: "Internetsiz ishlaydimi?", a3: "Ha. Kvestlar, pasport va progress telefoningizda saqlanadi va internet qaytganda sinxronlanadi. AI yo'ldoshning ham oflayn rejimi bor.",
    q4: "Qaysi tillar bor?", a4: "O'zbek, ingliz va rus tillari — istalgan vaqtda almashtirish mumkin.",
    q5: "Qayerda ishlaydi?", a5: "Hozircha Toshkent va Samarqandda: {places} sarguzasht va {quests} kvest. Keyingisi — Buxoro va Xiva.",
    q6: "Mobil ilova bormi?", a6: "Veb-ilova allaqachon ilova kabi ishlaydi — uni bosh ekranga qo'shing. iOS va Android versiyalari rejamizda.",
    ctaTitle: "O'zbekiston kvestingizni boshlashga tayyormisiz?", ctaText: "Demoni oching, birinchi sarguzashtni tanlang va bir necha daqiqada birinchi stampni oling.",
    footerText: "Har bir sayohatni sarguzashtga aylantiruvchi o'yinlashtirilgan ilova.",
    footerProduct: "Mahsulot", footerProject: "Loyiha", footerDemo: "Veb-demo", footerAdmin: "Hamkor paneli", footerRights: "UzQuest. O'zbekistonda yaratilgan.",
    sh8: "Kuponlar va sovg'alar"
  },
  ru: {
    navFeatures: "Возможности", navHow: "Как это работает", navCities: "Города", navPartners: "Партнёрам", navFaq: "Вопросы", navCta: "Играть в демо",
    heroBadge: "Бета · Ташкент и Самарканд",
    heroTitle: "Узбекистан —<br><span class=\"grad\">квест за квестом</span>",
    heroText: "<b>Игровое тревел-приложение</b>, которое превращает Узбекистан в историю, которую вы проходите сами. Следуйте <b>сюжету квеста</b> по всему городу, встречайте местных с секретными подсказками, ищите скрытые места, копите <b>XP</b> и <b>штампы</b> и открывайте <b>настоящие скидки</b> в кафе, ресторанах и магазинах.",
    heroCta: "Играть в веб-демо", heroCta2: "Возможности", swipe: "Нажмите на телефон",
    statPlaces: "Приключений", statQuests: "Квестов", statCities: "Города", statLangs: "Языка",
    featLabel: "Возможности", featTitle: "Полноценная тревел-RPG по Узбекистану", featText: "Умные рекомендации, AI-спутник, квесты и цифровой паспорт — каждая прогулка становится историей.",
    f1t: "10 типов квестов", f1d: "Фото-точки, охота за сокровищами с GPS «горячо-холодно», загадки, хронологии, викторины, вкусовые задания — и встречи с местными, которые шепнут секретное слово.",
    f2t: "Хамрох — AI-спутник", f2d: "Спросите об истории места, еде или транспорте. Хамрох отвечает на узбекском, английском и русском, даже офлайн.",
    f3t: "Умные рекомендации", f3d: "Расскажите, что вам нравится — история, еда, ремёсла, скрытые места — и UzQuest подскажет, куда идти дальше.",
    f4t: "Паспорт, карты и подарочные штампы", f4d: "Собирайте штампы, 15 коллекционных карт от обычных до легендарных и подарочные штампы: «Ранняя пташка», «Ночная сова», «Местный друг».",
    f5t: "Настоящие скидки", f5d: "Пройденные места открывают купоны партнёрских кафе, ресторанов и магазинов: бесплатный чай, 2 самсы по цене одной, −15% на плов и другое.",
    f6t: "Цифровой детокс", f6d: "Бонус XP за то, что отложили телефон на 20 минут и просто были здесь и сейчас.",
    f7t: "Сюжетные кампании", f7d: "Каждый город — история. Пронесите запечатанное письмо через Ташкент или восстановите потерянную звёздную карту Улугбека в Самарканде — глава за главой.",
    f8t: "Работает офлайн", f8d: "Работает в метро и на базаре. Прогресс синхронизируется при подключении.",
    howLabel: "Как это работает", howTitle: "От первого шага до покорённого города",
    s1t: "Город и интересы", s1d: "Начните в Ташкенте или Самарканде и расскажите, что вам интересно.",
    s2t: "Следуйте сюжету", s2d: "Подсказка главы — или встреченный местный — скажет, куда идти дальше.",
    s3t: "Проходите квесты", s3d: "Снимите фото-точку, разгадайте загадку, найдите скрытое место, узнайте секретное слово.",
    s4t: "Открывайте награды", s4d: "XP, штампы, коллекционные карты, подарочные штампы и настоящие купоны от партнёров.",
    citiesLabel: "Направления", citiesTitle: "Два легендарных города. Скоро больше.",
    places: "{n} приключений", quests: "{n} квестов", soon: "Скоро", soonText: "Бухара · Хива · Ферганская долина",
    shotsLabel: "Скриншоты", shotsTitle: "Посмотрите в действии", shotsText: "Настоящие экраны работающего веб-приложения.",
    sh1: "Простой старт", sh2: "Центр приключений", sh3: "Квесты в каждом месте", sh4: "Приключение пройдено", sh5: "Цифровой паспорт", sh6: "AI-спутник Хамрох", sh7: "Карта города",
    tryLabel: "Попробуйте сейчас", tryTitle: "Играйте прямо здесь", tryText: "Это настоящее приложение. Пройдите онбординг, выберите место, выполните квесты и завершите первое приключение. Прогресс сохраняется в этом браузере.",
    tryOpen: "Открыть на весь экран", tryPhone: "Лучше на телефоне: откройте страницу на мобильном и добавьте на главный экран.",
    partnersLabel: "Партнёрам", partnersTitle: "Приведём путешественников к вам",
    partnersText: "Кафе, музеи, ремесленные мастерские, отели и туроператоры могут стать точками квестов и наград.",
    p1t: "Поток гостей", p1d: "Станьте точкой квеста или награды, которую путешественники ищут сами.",
    p2t: "Проверка ваучеров", p2d: "Подтверждайте награды за секунды в панели партнёра.",
    p3t: "Реальная аналитика", p3d: "Смотрите, сколько путешественников начали, завершили и вернулись.",
    partnersCta: "Открыть панель партнёра",
    faqLabel: "Вопросы", faqTitle: "Частые вопросы",
    q1: "Что такое UzQuest?", a1: "UzQuest — игровое тревел-приложение по Узбекистану. В каждом месте есть квесты: выполняя их, вы получаете XP, штампы в паспорт, значки и награды.",
    q2: "Это бесплатно? Какие награды?", a2: "Да, для путешественников бесплатно. Пройденные места и города открывают купоны партнёрских кафе, ресторанов и магазинов и ваучер на медаль города.",
    q3: "Работает без интернета?", a3: "Да. Квесты, паспорт и прогресс хранятся на телефоне и синхронизируются при подключении. У AI-спутника тоже есть офлайн-режим.",
    q4: "Какие языки поддерживаются?", a4: "Узбекский, английский и русский — переключайтесь в любой момент.",
    q5: "Где можно играть?", a5: "Сейчас в Ташкенте и Самарканде: {places} приключений и {quests} квестов. Дальше — Бухара и Хива.",
    q6: "Есть мобильное приложение?", a6: "Веб-версия уже работает как приложение — добавьте её на главный экран. Версии для iOS и Android — следующий шаг.",
    ctaTitle: "Готовы начать свой квест по Узбекистану?", ctaText: "Откройте демо, выберите первое приключение и получите первый штамп за несколько минут.",
    footerText: "Игровое тревел-приложение, превращающее каждую поездку по Узбекистану в приключение.",
    footerProduct: "Продукт", footerProject: "Проект", footerDemo: "Веб-демо", footerAdmin: "Панель партнёра", footerRights: "UzQuest. Сделано в Узбекистане.",
    sh8: "Купоны и награды"
  }
};

const guessLang = () => { const nav = (navigator.language || "en").toLowerCase(); return nav.startsWith("ru") ? "ru" : nav.startsWith("uz") ? "uz" : "en"; };
let lang = (() => { try { return localStorage.getItem("uzq-site-lang"); } catch { return null; } })() ?? guessLang();
if (!STRINGS[lang]) lang = "en";
const t = (key, vars = {}) => (STRINGS[lang][key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
const $ = (s, root = document) => root.querySelector(s);
const all = (s, root = document) => [...root.querySelectorAll(s)];

const totals = {
  places: CITIES.reduce((sum, c) => sum + c.places.length, 0),
  quests: CITIES.reduce((sum, c) => sum + c.places.reduce((s, p) => s + p.quests.length, 0), 0),
  cities: CITIES.length,
  langs: 3
};

function renderCities() {
  const pick = (value) => value[lang] ?? value.en;
  $("#city-cards").innerHTML = CITIES.map((c) => `
    <article class="city">
      <img src="${c.image.replace("../", "")}" alt="${pick(c.name)}" loading="lazy" />
      <div class="city-body">
        <h3>${pick(c.name)}</h3><p class="muted">${pick(c.title)} — ${pick(c.tagline)}</p>
        <div class="chips"><span>🧭 ${t("places", { n: c.places.length })}</span><span>🎯 ${t("quests", { n: c.places.reduce((s, p) => s + p.quests.length, 0) })}</span></div>
        <div class="place-strip">${c.places.map((p) => `<span title="${pick(p.name)}" style="background:linear-gradient(135deg,${p.colors[0]},${p.colors[1]})">${p.emoji}</span>`).join("")}</div>
      </div>
    </article>`).join("") + `
    <article class="city soon"><div class="city-body"><span class="soon-badge">${t("soon")}</span><h3>🏺 ${t("soonText")}</h3></div></article>`;
}

function render() {
  document.documentElement.lang = lang;
  all("[data-t]").forEach((node) => { node.textContent = t(node.dataset.t, totals); });
  all("[data-th]").forEach((node) => { node.innerHTML = t(node.dataset.th); });
  all("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  $("#stat-places").textContent = totals.places;
  $("#stat-quests").textContent = totals.quests;
  $("#stat-cities").textContent = totals.cities;
  $("#stat-langs").textContent = totals.langs;
  renderCities();
}

// Hero phone fan: clicking a side phone (or waiting) rotates it to the centre.
const POSITIONS = ["far-left", "left", "center", "right", "far-right"];
let order = [0, 1, 2, 3, 4];
let heroTimer = null;
function layoutPhones() {
  all(".hero-phones .phone").forEach((phone, i) => { phone.dataset.pos = POSITIONS[order.indexOf(i)]; });
  const center = order[2];
  all(".dots i").forEach((dot, i) => dot.classList.toggle("on", i === center));
}
function focusPhone(index) {
  const shift = order.indexOf(index) - 2;
  for (let k = 0; k < Math.abs(shift); k++) order = shift > 0 ? [...order.slice(1), order[0]] : [order[4], ...order.slice(0, 4)];
  layoutPhones();
}
function autoRotate() { clearInterval(heroTimer); heroTimer = setInterval(() => focusPhone(order[3]), 3800); }

all(".hero-phones .phone").forEach((phone, i) => phone.addEventListener("click", () => { focusPhone(i); autoRotate(); }));
all(".dots i").forEach((dot, i) => dot.addEventListener("click", () => { focusPhone(i); autoRotate(); }));
all("[data-lang]").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.lang; try { localStorage.setItem("uzq-site-lang", lang); } catch { /* ignore */ } render(); }));
$("#menu").addEventListener("click", () => document.body.classList.toggle("menu-open"));
all(".nav-links a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

// Screenshot strip arrows
all("[data-scroll]").forEach((b) => b.addEventListener("click", () => {
  const strip = $("#shots");
  strip.scrollBy({ left: Number(b.dataset.scroll) * strip.clientWidth * 0.8, behavior: "smooth" });
}));

// Reveal-on-scroll
const observer = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); } }), { threshold: 0.12 });
all(".reveal").forEach((node) => observer.observe(node));

// Load the live demo iframe only when it scrolls into view.
const frame = $("#live-frame");
new IntersectionObserver((entries, obs) => { if (entries[0].isIntersecting) { frame.src = frame.dataset.src; obs.disconnect(); } }, { rootMargin: "300px" }).observe(frame);

window.addEventListener("scroll", () => document.body.classList.toggle("scrolled", window.scrollY > 10), { passive: true });

// On static hosting (e.g. GitHub Pages) there is no backend, so hide admin links.
fetch("api/v1/health", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((data) => {
  if (data?.service !== "uzquest-api") all("a[href=\"admin\"]").forEach((a) => { a.hidden = true; });
});

render();
layoutPhones();
autoRotate();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => undefined);
