// All city, place and quest content. Shared by the web app and the Node backend.
// Each place is an "adventure": a set of quests the traveller marks complete.

export const XP = { placeComplete: 50, cityComplete: 300, daily: 75, detox: 60 };
export const DETOX_MINUTES = 20;

export const QUEST_TYPES = {
  checkin: { icon: "📍", xp: 30, label: { uz: "Yetib keling", en: "Check in", ru: "Чек-ин" } },
  quiz: { icon: "❓", xp: 40, label: { uz: "Viktorina", en: "Quiz", ru: "Викторина" } },
  photo: { icon: "📸", xp: 40, label: { uz: "Foto", en: "Photo", ru: "Фото" } },
  taste: { icon: "🍽️", xp: 50, label: { uz: "Ta'm", en: "Taste", ru: "Вкус" } },
  find: { icon: "🔎", xp: 40, label: { uz: "Topish", en: "Find", ru: "Найти" } },
  talk: { icon: "💬", xp: 30, label: { uz: "Suhbat", en: "Talk", ru: "Общение" } }
};

export const INTERESTS = [
  { id: "history", icon: "📜", name: { uz: "Tarix", en: "History", ru: "История" } },
  { id: "architecture", icon: "🕌", name: { uz: "Me'morchilik", en: "Architecture", ru: "Архитектура" } },
  { id: "food", icon: "🍛", name: { uz: "Taomlar", en: "Food", ru: "Еда" } },
  { id: "culture", icon: "🧵", name: { uz: "Madaniyat va hunarmandchilik", en: "Culture & crafts", ru: "Культура и ремёсла" } },
  { id: "modern", icon: "🏙️", name: { uz: "Zamonaviy shahar", en: "Modern city", ru: "Современный город" } },
  { id: "hidden", icon: "💎", name: { uz: "Yashirin joylar", en: "Hidden gems", ru: "Скрытые жемчужины" } }
];

// Helper so quest lists stay compact: checkin quests only need the place name.
const checkin = (id, name) => ({
  id, type: "checkin",
  title: { uz: "Yetib keldim", en: "I've arrived", ru: "Я на месте" },
  prompt: { uz: `${name.uz}ga yetib keling va atrofni ko'zdan kechiring.`, en: `Get to ${name.en} and take a first look around.`, ru: `Доберитесь до места «${name.ru}» и осмотритесь.` }
});

const place = (data) => ({ ...data, quests: [checkin(`${data.id}-checkin`, data.name), ...data.quests] });

export const CITIES = [
  {
    id: "tashkent",
    short: "TAS",
    name: { uz: "Toshkent", en: "Tashkent", ru: "Ташкент" },
    title: { uz: "Poytaxt ritmi", en: "Rhythm of the Capital", ru: "Ритм столицы" },
    tagline: {
      uz: "Eski shahar gumbazlaridan kosmik metro bekatlarigacha.",
      en: "From old-town domes to cosmic metro stations.",
      ru: "От куполов старого города до космических станций метро."
    },
    image: "../assets/tashkent-hero.svg",
    reward: {
      name: { uz: "Toshkent kashfiyotchisi", en: "Tashkent Explorer", ru: "Исследователь Ташкента" },
      prize: { uz: "Cheklangan medal, postcard va choyxonada bepul choy", en: "Limited medal, postcard and a free tea at a partner choyxona", ru: "Лимитированная медаль, открытка и бесплатный чай в чайхане-партнёре" }
    },
    places: [
      place({
        id: "hazrati-imam", emoji: "🕌", colors: ["#1f8a8a", "#0b3d4a"], lat: 41.3385, lng: 69.2404, minutes: 45,
        interests: ["history", "architecture"],
        name: { uz: "Hazrati Imom majmuasi", en: "Khast Imam Complex", ru: "Комплекс Хазрати Имам" },
        tip: { uz: "Ikki minora orasidagi darvozadan kiring. Yelka va tizzalarni yoping.", en: "Enter through the gate between the two minarets. Cover shoulders and knees.", ru: "Войдите через ворота между минаретами. Закройте плечи и колени." },
        story: { uz: "Toshkentning ma'naviy markazi. Kutubxonada dunyodagi eng qadimgi Qur'on nusxalaridan biri saqlanadi.", en: "Tashkent's spiritual centre. Its library keeps one of the oldest Qur'an manuscripts in the world.", ru: "Духовный центр Ташкента. В библиотеке хранится один из древнейших списков Корана в мире." },
        quests: [
          { id: "tas-imam-quiz", type: "quiz",
            title: { uz: "Qadimiy qo'lyozma", en: "The ancient manuscript", ru: "Древняя рукопись" },
            prompt: { uz: "Muyi Muborak kutubxonasida qaysi mashhur qo'lyozma saqlanadi?", en: "Which famous manuscript is kept in the Muyi Muborak library?", ru: "Какая знаменитая рукопись хранится в библиотеке Муйи Мубарак?" },
            options: [{ uz: "Usmon Qur'oni", en: "The Uthman Qur'an", ru: "Коран Усмана" }, { uz: "Boburnoma", en: "The Baburnama", ru: "Бабур-наме" }, { uz: "Avesto", en: "The Avesta", ru: "Авеста" }], answer: 0 },
          { id: "tas-imam-photo", type: "photo",
            title: { uz: "Ikki minora", en: "Twin minarets", ru: "Два минарета" },
            prompt: { uz: "Ikkala minorani bitta kadrga sig'diring.", en: "Fit both minarets into a single shot.", ru: "Поместите оба минарета в один кадр." } }
        ]
      }),
      place({
        id: "chorsu", emoji: "🛍️", colors: ["#e0823a", "#6b2d17"], lat: 41.3267, lng: 69.2361, minutes: 60,
        interests: ["food", "culture"],
        name: { uz: "Chorsu bozori", en: "Chorsu Bazaar", ru: "Базар Чорсу" },
        tip: { uz: "Ertalab boring — non va somsa eng issiq payti.", en: "Go in the morning, when the bread and somsa are hottest.", ru: "Приходите утром — лепёшки и самса самые горячие." },
        story: { uz: "Ipak yo'li zamonidan beri savdo qaynaydigan chorraha. Ulkan ko'k gumbaz ostida ziravorlar, non va suhbat.", en: "A crossroads of trade since Silk Road times. Spices, bread and conversation under a giant blue dome.", ru: "Перекрёсток торговли со времён Шёлкового пути. Специи, хлеб и разговоры под огромным синим куполом." },
        quests: [
          { id: "tas-chorsu-taste", type: "taste",
            title: { uz: "Issiq somsa", en: "Hot somsa", ru: "Горячая самса" },
            prompt: { uz: "Tandirdan yangi uzilgan somsa yoki non tatib ko'ring.", en: "Taste a somsa or a bread fresh out of the tandir oven.", ru: "Попробуйте самсу или лепёшку прямо из тандыра." } },
          { id: "tas-chorsu-photo", type: "photo",
            title: { uz: "Ziravorlar rangi", en: "Colours of spice", ru: "Цвета специй" },
            prompt: { uz: "Eng rang-barang ziravor rastasini suratga oling.", en: "Photograph the most colourful spice stall you can find.", ru: "Сфотографируйте самый яркий прилавок со специями." } },
          { id: "tas-chorsu-talk", type: "talk",
            title: { uz: "Narxni so'rang", en: "Ask the price", ru: "Спросите цену" },
            prompt: { uz: "Sotuvchidan o'zbekcha so'rang: \"Qancha turadi?\"", en: "Ask a vendor in Uzbek: \"Qancha turadi?\" (How much is it?)", ru: "Спросите продавца по-узбекски: «Қанча туради?» (Сколько стоит?)" } }
        ]
      }),
      place({
        id: "kukeldash", emoji: "🏛️", colors: ["#c9a24a", "#4a3410"], lat: 41.3253, lng: 69.2388, minutes: 30,
        interests: ["history", "architecture"],
        name: { uz: "Ko'kaldosh madrasasi", en: "Kukeldash Madrasa", ru: "Медресе Кукельдаш" },
        tip: { uz: "Chorsu bozoridan chiqib, tepalikka ko'tariling.", en: "Walk up the hill right next to Chorsu Bazaar.", ru: "Поднимитесь на холм рядом с базаром Чорсу." },
        story: { uz: "Toshkentning eng katta madrasalaridan biri. Uning peshtoqi asrlar davomida shahar belgisi bo'lib kelgan.", en: "One of Tashkent's largest madrasas. Its portal has been a city landmark for centuries.", ru: "Одно из крупнейших медресе Ташкента. Его портал веками служит символом города." },
        quests: [
          { id: "tas-kuk-quiz", type: "quiz",
            title: { uz: "Qaysi asr?", en: "Which century?", ru: "Какой век?" },
            prompt: { uz: "Ko'kaldosh madrasasi qaysi asrda qurilgan?", en: "In which century was Kukeldash Madrasa built?", ru: "В каком веке построено медресе Кукельдаш?" },
            options: [{ uz: "XII asr", en: "12th century", ru: "XII век" }, { uz: "XVI asr", en: "16th century", ru: "XVI век" }, { uz: "XIX asr", en: "19th century", ru: "XIX век" }], answer: 1 },
          { id: "tas-kuk-find", type: "find",
            title: { uz: "Hujralar hovlisi", en: "The courtyard", ru: "Внутренний двор" },
            prompt: { uz: "Ichki hovlini toping — talabalar yashagan hujralarni ko'ring.", en: "Find the inner courtyard and spot the small cells where students once lived.", ru: "Найдите внутренний двор и кельи, где когда-то жили студенты." } }
        ]
      }),
      place({
        id: "kosmonavtlar", emoji: "🚇", colors: ["#3b5bdb", "#101a4a"], lat: 41.3052, lng: 69.2752, minutes: 25,
        interests: ["modern", "hidden"],
        name: { uz: "Kosmonavtlar metro bekati", en: "Kosmonavtlar Metro Station", ru: "Станция «Космонавтлар»" },
        tip: { uz: "Chorsu bekatidan O'zbekiston liniyasida bir necha bekat yuring.", en: "Ride a few stops along the Uzbekistan line from Chorsu station.", ru: "Проедьте несколько станций по Узбекистанской линии от «Чорсу»." },
        story: { uz: "Toshkent metrosi — Markaziy Osiyodagi birinchi metro. Bu bekat kosmonavtlarga bag'ishlangan.", en: "The Tashkent Metro was the first in Central Asia. This station is dedicated to cosmonauts.", ru: "Ташкентское метро — первое в Центральной Азии. Эта станция посвящена космонавтам." },
        quests: [
          { id: "tas-metro-quiz", type: "quiz",
            title: { uz: "Metro tarixi", en: "Metro history", ru: "История метро" },
            prompt: { uz: "Toshkent metrosi qaysi yili ochilgan?", en: "In which year did the Tashkent Metro open?", ru: "В каком году открылось Ташкентское метро?" },
            options: [{ uz: "1966", en: "1966", ru: "1966" }, { uz: "1977", en: "1977", ru: "1977" }, { uz: "1991", en: "1991", ru: "1991" }], answer: 1 },
          { id: "tas-metro-photo", type: "photo",
            title: { uz: "Kosmik medalyon", en: "Cosmic medallion", ru: "Космический медальон" },
            prompt: { uz: "Devordagi kosmonavt portretlaridan birini suratga oling.", en: "Photograph one of the cosmonaut portraits on the walls.", ru: "Сфотографируйте один из портретов космонавтов на стенах." } }
        ]
      }),
      place({
        id: "amir-timur", emoji: "🐎", colors: ["#2f9e6e", "#0d3b2a"], lat: 41.3111, lng: 69.2797, minutes: 45,
        interests: ["history", "modern"],
        name: { uz: "Amir Temur xiyoboni", en: "Amir Timur Square", ru: "Сквер Амира Темура" },
        tip: { uz: "Ko'k gumbazli Temuriylar tarixi muzeyiga ham kiring.", en: "Pop into the blue-domed Museum of Timurid History too.", ru: "Загляните и в музей истории Темуридов с голубым куполом." },
        story: { uz: "Shahar markazi. Sohibqiron haykali va Temuriylar tarixi davlat muzeyi shu yerda.", en: "The heart of the city, home to Timur's statue and the State Museum of Timurid History.", ru: "Сердце города: памятник Темуру и Государственный музей истории Темуридов." },
        quests: [
          { id: "tas-timur-quiz", type: "quiz",
            title: { uz: "Ko'k gumbaz", en: "The blue dome", ru: "Голубой купол" },
            prompt: { uz: "Temuriylar tarixi muzeyi qaysi yili ochilgan?", en: "In which year did the Museum of Timurid History open?", ru: "В каком году открылся музей истории Темуридов?" },
            options: [{ uz: "1970", en: "1970", ru: "1970" }, { uz: "1996", en: "1996", ru: "1996" }, { uz: "2011", en: "2011", ru: "2011" }], answer: 1 },
          { id: "tas-timur-photo", type: "photo",
            title: { uz: "Sohibqiron", en: "The conqueror", ru: "Завоеватель" },
            prompt: { uz: "Otliq haykal bilan selfi oling.", en: "Take a selfie with the equestrian statue.", ru: "Сделайте селфи с конной статуей." } }
        ]
      }),
      place({
        id: "mustaqillik", emoji: "🕊️", colors: ["#8b8fa8", "#262a3f"], lat: 41.3143, lng: 69.2723, minutes: 40,
        interests: ["modern", "culture"],
        name: { uz: "Mustaqillik maydoni", en: "Independence Square", ru: "Площадь Независимости" },
        tip: { uz: "Kechqurun favvoralar yonida sayr qilish ayniqsa yoqimli.", en: "The fountains make it lovely for an evening walk.", ru: "Вечером здесь особенно приятно гулять у фонтанов." },
        story: { uz: "Mamlakatning bosh maydoni: Ezgu intilishlar arkasi, favvoralar va soyali xiyobonlar.", en: "The country's main square: the Arch of Good and Noble Aspirations, fountains and shady alleys.", ru: "Главная площадь страны: арка Добрых и благородных устремлений, фонтаны и тенистые аллеи." },
        quests: [
          { id: "tas-arch-quiz", type: "quiz",
            title: { uz: "Arka qushlari", en: "Birds of the arch", ru: "Птицы арки" },
            prompt: { uz: "Ezgu intilishlar arkasi tepasida qaysi qushlar tasvirlangan?", en: "Which birds sit on top of the Arch of Good and Noble Aspirations?", ru: "Какие птицы изображены на вершине арки Добрых устремлений?" },
            options: [{ uz: "Laylaklar", en: "Storks", ru: "Аисты" }, { uz: "Burgutlar", en: "Eagles", ru: "Орлы" }, { uz: "Kaptarlar", en: "Pigeons", ru: "Голуби" }], answer: 0 },
          { id: "tas-mus-find", type: "find",
            title: { uz: "Motamsaro ona", en: "The Mourning Mother", ru: "Скорбящая мать" },
            prompt: { uz: "Maydondagi \"Motamsaro ona\" yodgorligini toping.", en: "Find the Mourning Mother memorial on the square.", ru: "Найдите на площади памятник «Скорбящая мать»." } }
        ]
      }),
      place({
        id: "plov-center", emoji: "🍛", colors: ["#e8a33a", "#6e3a0c"], lat: 41.3423, lng: 69.2872, minutes: 60,
        interests: ["food"],
        name: { uz: "Markaziy Osiyo palov markazi", en: "Central Asian Plov Centre", ru: "Центр плова" },
        tip: { uz: "Tushlikkacha boring — kechga qozonlar bo'shab qoladi.", en: "Go before lunch ends — the kazans are empty by late afternoon.", ru: "Приходите до конца обеда — к вечеру казаны пустеют." },
        story: { uz: "Palov — o'zbek dasturxonining shohi. Bu yerda u yuzlab kishiga mo'ljallangan qozonlarda pishiriladi.", en: "Plov is the king of the Uzbek table. Here it is cooked in kazans that feed hundreds.", ru: "Плов — король узбекского дастархана. Здесь его готовят в казанах на сотни человек." },
        quests: [
          { id: "tas-plov-taste", type: "taste",
            title: { uz: "Toshkent palovi", en: "Tashkent plov", ru: "Ташкентский плов" },
            prompt: { uz: "Bir lagan palov buyurtma qiling va ko'k choy bilan iching.", en: "Order a plate of plov and pair it with green tea.", ru: "Закажите тарелку плова и запейте зелёным чаем." } },
          { id: "tas-plov-quiz", type: "quiz",
            title: { uz: "Oshpaz siri", en: "Cook's secret", ru: "Секрет повара" },
            prompt: { uz: "An'anaviy palov qanday idishda pishiriladi?", en: "What vessel is traditional plov cooked in?", ru: "В какой посуде готовят традиционный плов?" },
            options: [{ uz: "Tandir", en: "Tandir", ru: "Тандыр" }, { uz: "Qozon", en: "Kazan (qozon)", ru: "Казан" }, { uz: "Samovar", en: "Samovar", ru: "Самовар" }], answer: 1 }
        ]
      }),
      place({
        id: "tv-tower", emoji: "📡", colors: ["#7c3aed", "#1f0f45"], lat: 41.3453, lng: 69.2848, minutes: 60,
        interests: ["modern"],
        name: { uz: "Toshkent teleminorasi", en: "Tashkent TV Tower", ru: "Ташкентская телебашня" },
        tip: { uz: "Kun botishiga yaqin boring. Pasportingizni oling.", en: "Go close to sunset and bring your passport.", ru: "Приходите ближе к закату и возьмите паспорт." },
        story: { uz: "Markaziy Osiyodagi eng baland inshootlardan biri. Kuzatuv maydonchasidan butun shahar ko'rinadi.", en: "One of the tallest structures in Central Asia. The observation deck shows the whole city.", ru: "Одно из самых высоких сооружений Центральной Азии. Со смотровой площадки виден весь город." },
        quests: [
          { id: "tas-tower-quiz", type: "quiz",
            title: { uz: "Qanchalik baland?", en: "How tall?", ru: "Какая высота?" },
            prompt: { uz: "Teleminoraning balandligi qancha?", en: "How tall is the TV tower?", ru: "Какова высота телебашни?" },
            options: [{ uz: "175 m", en: "175 m", ru: "175 м" }, { uz: "275 m", en: "275 m", ru: "275 м" }, { uz: "375 m", en: "375 m", ru: "375 м" }], answer: 2 },
          { id: "tas-tower-photo", type: "photo",
            title: { uz: "Shahar tepadan", en: "City from above", ru: "Город сверху" },
            prompt: { uz: "Kuzatuv maydonchasidan panorama suratga oling.", en: "Take a panorama from the observation deck.", ru: "Снимите панораму со смотровой площадки." } }
        ]
      })
    ],
    dailies: [
      { id: "tas-d-rahmat", title: { uz: "Uch marta \"Rahmat\"", en: "Three \"Rahmat\"s", ru: "Три «Рахмат»" }, prompt: { uz: "Bugun uch kishiga o'zbekcha \"rahmat\" deng.", en: "Say \"rahmat\" (thank you) in Uzbek to three people today.", ru: "Скажите «рахмат» (спасибо) трём людям сегодня." } },
      { id: "tas-d-choyxona", title: { uz: "Choyxona tanaffusi", en: "Choyxona break", ru: "Перерыв в чайхане" }, prompt: { uz: "Choyxonada bir choynak ko'k choy iching.", en: "Share a pot of green tea in a choyxona.", ru: "Выпейте чайник зелёного чая в чайхане." } },
      { id: "tas-d-metro", title: { uz: "Metro sayohati", en: "Metro hop", ru: "Прогулка по метро" }, prompt: { uz: "Metroda uch xil bekatni ko'rib chiqing.", en: "Visit three different metro stations and compare their designs.", ru: "Посетите три разные станции метро и сравните их оформление." } },
      { id: "tas-d-doppi", title: { uz: "Do'ppi ovchisi", en: "Doppi hunter", ru: "Охотник за тюбетейкой" }, prompt: { uz: "Do'ppi sotiladigan rastani toping va naqshlarini o'rganing.", en: "Find a doppi (skullcap) stall and learn what the patterns mean.", ru: "Найдите прилавок с тюбетейками и узнайте значение узоров." } },
      { id: "tas-d-count", title: { uz: "Beshgacha sanang", en: "Count to five", ru: "Считаем до пяти" }, prompt: { uz: "O'zbekcha beshgacha sanashni o'rganing: bir, ikki, uch, to'rt, besh.", en: "Learn to count to five in Uzbek: bir, ikki, uch, to'rt, besh.", ru: "Научитесь считать до пяти по-узбекски: бир, икки, уч, тўрт, беш." } }
    ]
  },
  {
    id: "samarkand",
    short: "SAM",
    name: { uz: "Samarqand", en: "Samarkand", ru: "Самарканд" },
    title: { uz: "Samarqand sirlari", en: "Secrets of Samarkand", ru: "Тайны Самарканда" },
    tagline: {
      uz: "Qadimiy shaharni oddiy turist emas, kashfiyotchi sifatida ko'ring.",
      en: "See the ancient city as an explorer, not an ordinary tourist.",
      ru: "Откройте древний город как исследователь, а не как обычный турист."
    },
    image: "../assets/registan-hero.jpg",
    reward: {
      name: { uz: "Samarqand kashfiyotchisi", en: "Samarkand Explorer", ru: "Исследователь Самарканда" },
      prize: { uz: "Cheklangan Samarqand medali va postcard", en: "Limited Samarkand medal and postcard", ru: "Лимитированная медаль Самарканда и открытка" }
    },
    places: [
      place({
        id: "registan", emoji: "🕌", colors: ["#1fa3b5", "#0b3346"], lat: 39.6547, lng: 66.9758, minutes: 90,
        interests: ["history", "architecture"],
        name: { uz: "Registon", en: "Registan", ru: "Регистан" },
        tip: { uz: "Kechqurun qaytib keling — yoritilgan Registon sehrli.", en: "Come back after dark — the lit-up square is magical.", ru: "Вернитесь вечером — подсвеченная площадь волшебна." },
        story: { uz: "Registon bir vaqtlar shaharning yuragi edi. Bu yerda savdogarlar, olimlar va sayohatchilar uchrashgan.", en: "Registan was once the heart of the city, where merchants, scholars and travellers met.", ru: "Регистан когда-то был сердцем города, где встречались купцы, учёные и путешественники." },
        quests: [
          { id: "sam-reg-quiz", type: "quiz",
            title: { uz: "Sherdor siri", en: "Secret of Sher-Dor", ru: "Тайна Шердора" },
            prompt: { uz: "Sherdor madrasasi peshtoqida qaysi hayvon tasvirlangan?", en: "Which animal is pictured on the portal of Sher-Dor Madrasa?", ru: "Какое животное изображено на портале медресе Шердор?" },
            options: [{ uz: "Sher", en: "A lion (sher)", ru: "Лев (шер)" }, { uz: "Burgut", en: "An eagle", ru: "Орёл" }, { uz: "Ot", en: "A horse", ru: "Конь" }], answer: 0 },
          { id: "sam-reg-photo", type: "photo",
            title: { uz: "Uch madrasa", en: "Three madrasas", ru: "Три медресе" },
            prompt: { uz: "Uchala madrasani bitta kadrga oling.", en: "Capture all three madrasas in one frame.", ru: "Поймайте все три медресе в один кадр." } }
        ]
      }),
      place({
        id: "gur-emir", emoji: "💠", colors: ["#2bb3a3", "#0c3b3a"], lat: 39.6484, lng: 66.9691, minutes: 40,
        interests: ["history", "architecture"],
        name: { uz: "Go'ri Amir maqbarasi", en: "Gur-e-Amir Mausoleum", ru: "Мавзолей Гур-Эмир" },
        tip: { uz: "Registondan piyoda 10 daqiqa.", en: "A 10-minute walk from Registan.", ru: "10 минут пешком от Регистана." },
        story: { uz: "Temuriylar sulolasining maqbarasi. Uning qovurg'ali gumbazi keyinchalik Hindistondagi me'morlarga ilhom bergan.", en: "The Timurid family mausoleum. Its ribbed dome later inspired architects in India.", ru: "Усыпальница Темуридов. Её ребристый купол позже вдохновил зодчих Индии." },
        quests: [
          { id: "sam-gur-quiz", type: "quiz",
            title: { uz: "Kim dafn etilgan?", en: "Who rests here?", ru: "Кто здесь покоится?" },
            prompt: { uz: "Go'ri Amir kimning maqbarasi sifatida mashhur?", en: "Whose tomb made Gur-e-Amir famous?", ru: "Чьей гробницей знаменит Гур-Эмир?" },
            options: [{ uz: "Amir Temur", en: "Amir Timur", ru: "Амир Темур" }, { uz: "Alisher Navoiy", en: "Alisher Navoi", ru: "Алишер Навои" }, { uz: "Ibn Sino", en: "Ibn Sina", ru: "Ибн Сина" }], answer: 0 },
          { id: "sam-gur-find", type: "find",
            title: { uz: "Nefrit qabr toshi", en: "The jade tombstone", ru: "Нефритовое надгробие" },
            prompt: { uz: "Ichkarida Temurning to'q yashil nefrit qabr toshini toping.", en: "Inside, find Timur's dark-green jade tombstone.", ru: "Найдите внутри тёмно-зелёное нефритовое надгробие Темура." } }
        ]
      }),
      place({
        id: "bibixonim", emoji: "🏯", colors: ["#3f7fd6", "#12264a"], lat: 39.6607, lng: 66.9794, minutes: 40,
        interests: ["architecture", "history"],
        name: { uz: "Bibixonim masjidi", en: "Bibi-Khanym Mosque", ru: "Мечеть Биби-Ханым" },
        tip: { uz: "Siyob bozori shundoq yonida — ikkalasini birga rejalashtiring.", en: "Siab Bazaar is right next door — plan them together.", ru: "Сиабский базар рядом — планируйте их вместе." },
        story: { uz: "Bu masjid Samarqandning kuchi va buyuk orzusini eslatadi.", en: "This mosque recalls Samarkand's strength and great ambition.", ru: "Эта мечеть напоминает о силе и великой мечте Самарканда." },
        quests: [
          { id: "sam-bib-find", type: "find",
            title: { uz: "Marmar lavh", en: "The marble stand", ru: "Мраморная подставка" },
            prompt: { uz: "Hovlidagi ulkan marmar Qur'on lavhini toping.", en: "Find the giant marble Qur'an stand in the courtyard.", ru: "Найдите во дворе огромную мраморную подставку для Корана." } },
          { id: "sam-bib-photo", type: "photo",
            title: { uz: "Ulkan peshtoq", en: "The giant portal", ru: "Огромный портал" },
            prompt: { uz: "Peshtoqni pastdan yuqoriga qarab suratga oling.", en: "Shoot the portal looking up from below.", ru: "Снимите портал снизу вверх." } }
        ]
      }),
      place({
        id: "siyob", emoji: "🥖", colors: ["#e0823a", "#5c2a10"], lat: 39.6620, lng: 66.9812, minutes: 45,
        interests: ["food", "culture"],
        name: { uz: "Siyob bozori", en: "Siab Bazaar", ru: "Сиабский базар" },
        tip: { uz: "Quruq mevalarni sotib olishdan oldin tatib ko'ring.", en: "Taste dried fruit before you buy — vendors expect it.", ru: "Пробуйте сухофрукты перед покупкой — это нормально." },
        story: { uz: "Siyob bozori sayohatni ta'm va insoniy suhbat bilan to'ldiradi.", en: "Siab Bazaar fills the journey with flavour and conversation.", ru: "Сиабский базар наполняет путешествие вкусом и разговорами." },
        quests: [
          { id: "sam-siy-taste", type: "taste",
            title: { uz: "Samarqand noni", en: "Samarkand non", ru: "Самаркандская лепёшка" },
            prompt: { uz: "Mashhur Samarqand nonini sotib oling va tatib ko'ring.", en: "Buy and taste the famous Samarkand bread.", ru: "Купите и попробуйте знаменитую самаркандскую лепёшку." } },
          { id: "sam-siy-talk", type: "talk",
            title: { uz: "Savdolashing", en: "Friendly bargain", ru: "Поторгуйтесь" },
            prompt: { uz: "Quruq meva uchun do'stona savdolashing va \"Rahmat!\" deng.", en: "Bargain kindly for dried fruit and finish with \"Rahmat!\"", ru: "Дружелюбно поторгуйтесь за сухофрукты и скажите «Рахмат!»" } }
        ]
      }),
      place({
        id: "shohi-zinda", emoji: "🔷", colors: ["#1f6fd1", "#0a1f45"], lat: 39.6627, lng: 66.9878, minutes: 60,
        interests: ["history", "architecture"],
        name: { uz: "Shohi Zinda", en: "Shah-i-Zinda", ru: "Шахи-Зинда" },
        tip: { uz: "Ertalab boring — yorug'lik va jimlik eng go'zal payti.", en: "Go early — the light and the quiet are at their best.", ru: "Приходите рано — свет и тишина лучше всего." },
        story: { uz: "Shohi Zinda yo'lagi — asrlar davomida saqlangan ranglar muzeyi.", en: "The Shah-i-Zinda passage is a museum of colour kept for centuries.", ru: "Коридор Шахи-Зинда — музей цвета, сохранённый на века." },
        quests: [
          { id: "sam-shz-quiz", type: "quiz",
            title: { uz: "Nom ma'nosi", en: "Meaning of the name", ru: "Значение названия" },
            prompt: { uz: "\"Shohi Zinda\" nimani anglatadi?", en: "What does \"Shah-i-Zinda\" mean?", ru: "Что означает «Шахи-Зинда»?" },
            options: [{ uz: "Tirik shoh", en: "The Living King", ru: "Живой царь" }, { uz: "Ko'k shahar", en: "The Blue City", ru: "Синий город" }, { uz: "Oltin darvoza", en: "The Golden Gate", ru: "Золотые ворота" }], answer: 0 },
          { id: "sam-shz-photo", type: "photo",
            title: { uz: "Ko'k yo'lak", en: "Blue passage", ru: "Синий коридор" },
            prompt: { uz: "Maqbaralar yo'lagini ichkaridan suratga oling.", en: "Photograph the avenue of mausoleums from inside.", ru: "Сфотографируйте аллею мавзолеев изнутри." } }
        ]
      }),
      place({
        id: "ulugbek", emoji: "🔭", colors: ["#5b4bd6", "#17123f"], lat: 39.6747, lng: 67.0056, minutes: 40,
        interests: ["history", "hidden"],
        name: { uz: "Ulug'bek rasadxonasi", en: "Ulugh Beg Observatory", ru: "Обсерватория Улугбека" },
        tip: { uz: "Shahar markazidan taksida 10 daqiqa.", en: "About 10 minutes by taxi from the centre.", ru: "Около 10 минут на такси от центра." },
        story: { uz: "Ulug'bek osmonni kuzatib, ilm uchun yangi yo'l ochgan.", en: "Ulugh Beg observed the sky and opened a new path for science.", ru: "Улугбек наблюдал за небом и открыл новый путь для науки." },
        quests: [
          { id: "sam-ulu-quiz", type: "quiz",
            title: { uz: "Yulduz asbobi", en: "Star instrument", ru: "Звёздный инструмент" },
            prompt: { uz: "Rasadxonadan bugungacha nima saqlanib qolgan?", en: "What part of the observatory survives today?", ru: "Что сохранилось от обсерватории до наших дней?" },
            options: [{ uz: "Ulkan teleskop", en: "A giant telescope", ru: "Гигантский телескоп" }, { uz: "Yer ostidagi ulkan sekstant yoyi", en: "The underground arc of a giant sextant", ru: "Подземная дуга гигантского секстанта" }, { uz: "Soat minorasi", en: "A clock tower", ru: "Часовая башня" }], answer: 1 }
        ]
      }),
      place({
        id: "konigil", emoji: "📜", colors: ["#b08a4a", "#3d2b10"], lat: 39.6680, lng: 67.0560, minutes: 60,
        interests: ["culture", "hidden"],
        name: { uz: "Konigil qog'oz ustaxonasi", en: "Konigil Paper Workshop", ru: "Бумажная мастерская Конигил" },
        tip: { uz: "Ustalar qog'oz tayyorlashni jonli ko'rsatadi — so'rang.", en: "The masters demonstrate papermaking live — just ask.", ru: "Мастера показывают изготовление бумаги вживую — просто попросите." },
        story: { uz: "Bu yerda qadimiy qog'oz tayyorlash usuli hali ham tirik.", en: "The ancient method of making paper is still alive here.", ru: "Здесь до сих пор жив древний способ изготовления бумаги." },
        quests: [
          { id: "sam-kon-quiz", type: "quiz",
            title: { uz: "Qog'oz siri", en: "Paper secret", ru: "Секрет бумаги" },
            prompt: { uz: "Samarqand qog'ozi nimadan tayyorlanadi?", en: "What is Samarkand paper made from?", ru: "Из чего делают самаркандскую бумагу?" },
            options: [{ uz: "Paxta chigiti", en: "Cotton seeds", ru: "Хлопковые семена" }, { uz: "Tut daraxti po'stlog'i", en: "Mulberry tree bark", ru: "Кора тутового дерева" }, { uz: "Qamish", en: "Reeds", ru: "Тростник" }], answer: 1 },
          { id: "sam-kon-photo", type: "photo",
            title: { uz: "Suv tegirmoni", en: "Water mill", ru: "Водяная мельница" },
            prompt: { uz: "Qog'oz ezadigan suv tegirmonini suratga oling.", en: "Photograph the water mill that pounds the paper pulp.", ru: "Сфотографируйте водяную мельницу, которая толчёт бумажную массу." } }
        ]
      })
    ],
    dailies: [
      { id: "sam-d-rahmat", title: { uz: "Uch marta \"Rahmat\"", en: "Three \"Rahmat\"s", ru: "Три «Рахмат»" }, prompt: { uz: "Bugun uch kishiga o'zbekcha \"rahmat\" deng.", en: "Say \"rahmat\" (thank you) in Uzbek to three people today.", ru: "Скажите «рахмат» (спасибо) трём людям сегодня." } },
      { id: "sam-d-night", title: { uz: "Tungi Registon", en: "Registan by night", ru: "Ночной Регистан" }, prompt: { uz: "Kechqurun Registonning yoritilishini tomosha qiling.", en: "Come back after dark to see Registan lit up.", ru: "Вернитесь вечером и посмотрите на подсвеченный Регистан." } },
      { id: "sam-d-tea", title: { uz: "Choyxona tanaffusi", en: "Choyxona break", ru: "Перерыв в чайхане" }, prompt: { uz: "Choyxonada bir choynak ko'k choy iching.", en: "Share a pot of green tea in a choyxona.", ru: "Выпейте чайник зелёного чая в чайхане." } },
      { id: "sam-d-craft", title: { uz: "Hunarmand bilan suhbat", en: "Meet a craftsperson", ru: "Встреча с мастером" }, prompt: { uz: "Kulol, zardo'z yoki gilamdo'z bilan gaplashing.", en: "Chat with a potter, embroiderer or carpet weaver.", ru: "Поговорите с гончаром, золотошвеем или ковроделом." } },
      { id: "sam-d-count", title: { uz: "Beshgacha sanang", en: "Count to five", ru: "Считаем до пяти" }, prompt: { uz: "O'zbekcha beshgacha sanashni o'rganing: bir, ikki, uch, to'rt, besh.", en: "Learn to count to five in Uzbek: bir, ikki, uch, to'rt, besh.", ru: "Научитесь считать до пяти по-узбекски: бир, икки, уч, тўрт, беш." } }
    ]
  }
];

export const BADGES = [
  { id: "first-quest", icon: "✨", name: { uz: "Birinchi qadam", en: "First Step", ru: "Первый шаг" }, desc: { uz: "Birinchi kvestni bajaring", en: "Complete your first quest", ru: "Выполните первый квест" } },
  { id: "first-place", icon: "🏅", name: { uz: "Birinchi sarguzasht", en: "First Adventure", ru: "Первое приключение" }, desc: { uz: "Bitta joyni to'liq yakunlang", en: "Finish every quest at one place", ru: "Завершите все квесты в одном месте" } },
  { id: "tashkent", icon: "🏙️", name: { uz: "Poytaxt bilimdoni", en: "Capital Insider", ru: "Знаток столицы" }, desc: { uz: "Toshkentni to'liq zabt eting", en: "Conquer all of Tashkent", ru: "Покорите весь Ташкент" } },
  { id: "samarkand", icon: "🕌", name: { uz: "Samarqand sirdoshi", en: "Keeper of Samarkand", ru: "Хранитель Самарканда" }, desc: { uz: "Samarqandni to'liq zabt eting", en: "Conquer all of Samarkand", ru: "Покорите весь Самарканд" } },
  { id: "silk-road", icon: "🐫", name: { uz: "Ipak yo'li sayyohi", en: "Silk Road Voyager", ru: "Путник Шёлкового пути" }, desc: { uz: "Ikkala shaharni zabt eting", en: "Conquer both cities", ru: "Покорите оба города" } },
  { id: "foodie", icon: "🍛", name: { uz: "Dasturxon ustasi", en: "Dastarkhan Master", ru: "Мастер дастархана" }, desc: { uz: "Barcha ta'm kvestlarini bajaring", en: "Complete every taste quest", ru: "Выполните все вкусовые квесты" } },
  { id: "scholar", icon: "🎓", name: { uz: "Ulug'bek shogirdi", en: "Ulugh Beg's Student", ru: "Ученик Улугбека" }, desc: { uz: "6 ta viktorinaga to'g'ri javob bering", en: "Answer 6 quizzes correctly", ru: "Ответьте верно на 6 викторин" } },
  { id: "photographer", icon: "📸", name: { uz: "Kadr ovchisi", en: "Frame Hunter", ru: "Охотник за кадрами" }, desc: { uz: "5 ta foto kvestni bajaring", en: "Complete 5 photo quests", ru: "Выполните 5 фотоквестов" } },
  { id: "unplugged", icon: "🌙", name: { uz: "Hozir va shu yerda", en: "Present Moment", ru: "Здесь и сейчас" }, desc: { uz: "Raqamli detoksni bajaring", en: "Finish a digital detox", ru: "Завершите цифровой детокс" } }
];

export const LEVELS = [
  { xp: 0, title: { uz: "Sayyoh", en: "Wanderer", ru: "Странник" } },
  { xp: 150, title: { uz: "Yo'lovchi", en: "Traveller", ru: "Путешественник" } },
  { xp: 400, title: { uz: "Izquvar", en: "Pathfinder", ru: "Следопыт" } },
  { xp: 750, title: { uz: "Karvon a'zosi", en: "Caravaneer", ru: "Караванщик" } },
  { xp: 1200, title: { uz: "Karvonboshi", en: "Caravan Leader", ru: "Караван-баши" } },
  { xp: 1800, title: { uz: "Ipak yo'li ritsari", en: "Silk Road Knight", ru: "Рыцарь Шёлкового пути" } },
  { xp: 2600, title: { uz: "Afsonaviy kashfiyotchi", en: "Legendary Explorer", ru: "Легендарный исследователь" } }
];
