// All city, place, quest, story and reward content. Shared by the web app and the Node backend.
// Every city is a story campaign: each place is one chapter with a set of quests.

const tr = (uz, en, ru) => ({ uz, en, ru });

export const XP = { placeComplete: 50, cityComplete: 300, daily: 75, detox: 60 };
export const DETOX_MINUTES = 20;
export const COUPON_DAYS = 30;

export const RARITY = {
  common: { xp: 30, color: "#9aa4b2", name: tr("Oddiy", "Common", "Обычный") },
  rare: { xp: 50, color: "#3b9dff", name: tr("Noyob", "Rare", "Редкий") },
  epic: { xp: 80, color: "#a855f7", name: tr("Epik", "Epic", "Эпический") },
  legendary: { xp: 150, color: "#f7c948", name: tr("Afsonaviy", "Legendary", "Легендарный") }
};

export const QUEST_TYPES = {
  checkin: { icon: "📍", rarity: "common", label: tr("Yetib keling", "Check in", "Чек-ин") },
  quiz: { icon: "❓", rarity: "common", label: tr("Viktorina", "Quiz", "Викторина") },
  talk: { icon: "💬", rarity: "common", label: tr("Suhbat", "Talk", "Общение") },
  photo: { icon: "📸", rarity: "rare", label: tr("Foto nuqta", "Photo spot", "Фото-точка") },
  taste: { icon: "🍽️", rarity: "rare", label: tr("Ta'm", "Taste", "Вкус") },
  find: { icon: "🔎", rarity: "rare", label: tr("Topish", "Find", "Найти") },
  riddle: { icon: "🧩", rarity: "rare", label: tr("Topishmoq", "Riddle", "Загадка") },
  timeline: { icon: "⏳", rarity: "rare", label: tr("Vaqt chizig'i", "Timeline", "Хронология") },
  hunt: { icon: "🧭", rarity: "epic", label: tr("Xazina ovi", "Treasure hunt", "Охота за сокровищем") },
  meet: { icon: "🤝", rarity: "epic", label: tr("Uchrashuv", "Meet a local", "Встреча") }
};

export const INTERESTS = [
  { id: "history", icon: "📜", name: tr("Tarix", "History", "История") },
  { id: "architecture", icon: "🕌", name: tr("Me'morchilik", "Architecture", "Архитектура") },
  { id: "food", icon: "🍛", name: tr("Taomlar", "Food", "Еда") },
  { id: "culture", icon: "🧵", name: tr("Madaniyat va hunarmandchilik", "Culture & crafts", "Культура и ремёсла") },
  { id: "modern", icon: "🏙️", name: tr("Zamonaviy shahar", "Modern city", "Современный город") },
  { id: "hidden", icon: "💎", name: tr("Yashirin joylar", "Hidden gems", "Скрытые жемчужины") }
];

const checkin = (id, name) => ({
  id, type: "checkin",
  title: tr("Yetib keldim", "I've arrived", "Я на месте"),
  prompt: tr(`${name.uz}ga yetib keling va atrofni ko'zdan kechiring.`, `Get to ${name.en} and take a first look around.`, `Доберитесь до места «${name.ru}» и осмотритесь.`)
});

const place = (data) => ({ ...data, quests: [checkin(`${data.id}-checkin`, data.name), ...data.quests] });

export const CITIES = [
  {
    id: "tashkent",
    short: "TAS",
    name: tr("Toshkent", "Tashkent", "Ташкент"),
    title: tr("Poytaxt ritmi", "Rhythm of the Capital", "Ритм столицы"),
    tagline: tr("Eski shahar gumbazlaridan kosmik metro bekatlarigacha.", "From old-town domes to cosmic metro stations.", "От куполов старого города до космических станций метро."),
    image: "../assets/tashkent-hero.svg",
    story: {
      title: tr("Ipak yo'li chopari", "The Silk Road Courier", "Курьер Шёлкового пути"),
      icon: "✉️",
      intro: tr(
        "Hazrati Imom kutubxonasida muhrlangan eski maktub topildi: \"Shaharning eng yuqorisiga yetgan kishiga\". Maktubni butun Toshkent bo'ylab olib boring — har bir joy konvertga muhr qo'shadi — va uni teleminorada topshiring.",
        "An old sealed letter was found in the Khast Imam library, addressed \"To whoever reaches the top of the city\". Carry it across Tashkent — every place adds a seal to the envelope — and deliver it at the TV Tower.",
        "В библиотеке Хазрати Имам нашли старое запечатанное письмо с надписью «Тому, кто достигнет вершины города». Пронесите его через весь Ташкент — каждое место добавит печать на конверт — и доставьте на телебашню."
      ),
      piece: tr("muhr", "seal", "печать"),
      finale: tr("Maktub yetkazildi! Ichida shunday yozilgan: \"Bu shaharni yurib chiqqan kishi uni haqiqatan taniydi.\"", "Letter delivered! Inside it says: \"Whoever walks this city truly knows it.\"", "Письмо доставлено! Внутри написано: «Кто прошёл этот город пешком — тот знает его по-настоящему»."),
      giftStamp: "courier"
    },
    reward: {
      name: tr("Toshkent kashfiyotchisi", "Tashkent Explorer", "Исследователь Ташкента"),
      prize: tr("Cheklangan medal, postcard va choyxonada bepul choy", "Limited medal, postcard and a free tea at a partner choyxona", "Лимитированная медаль, открытка и бесплатный чай в чайхане-партнёре")
    },
    places: [
      place({
        id: "hazrati-imam", emoji: "🕌", colors: ["#1f8a8a", "#0b3d4a"], lat: 41.3385, lng: 69.2404, minutes: 50,
        interests: ["history", "architecture"],
        name: tr("Hazrati Imom majmuasi", "Khast Imam Complex", "Комплекс Хазрати Имам"),
        chapter: tr("Muhrlangan maktub", "The Sealed Letter", "Запечатанное письмо"),
        clue: tr("Hammasi eski shahardagi ikki minora ostidan boshlanadi.", "It all begins beneath two minarets in the old city.", "Всё начинается под двумя минаретами старого города."),
        tip: tr("Ikki minora orasidagi darvozadan kiring. Yelka va tizzalarni yoping.", "Enter through the gate between the two minarets. Cover shoulders and knees.", "Войдите через ворота между минаретами. Закройте плечи и колени."),
        story: tr("Toshkentning ma'naviy markazi. Kutubxonada dunyodagi eng qadimgi Qur'on nusxalaridan biri saqlanadi.", "Tashkent's spiritual centre. Its library keeps one of the oldest Qur'an manuscripts in the world.", "Духовный центр Ташкента. В библиотеке хранится один из древнейших списков Корана в мире."),
        card: { icon: "📖", rarity: "rare", name: tr("Usmon Qur'oni", "The Uthman Qur'an", "Коран Усмана"), fact: tr("Dunyodagi eng qadimgi Qur'on qo'lyozmalaridan biri.", "One of the oldest Qur'an manuscripts in the world.", "Одна из древнейших рукописей Корана в мире.") },
        quests: [
          { id: "tas-imam-quiz", type: "quiz",
            title: tr("Qadimiy qo'lyozma", "The ancient manuscript", "Древняя рукопись"),
            prompt: tr("Muyi Muborak kutubxonasida qaysi mashhur qo'lyozma saqlanadi?", "Which famous manuscript is kept in the Muyi Muborak library?", "Какая знаменитая рукопись хранится в библиотеке Муйи Мубарак?"),
            options: [tr("Usmon Qur'oni", "The Uthman Qur'an", "Коран Усмана"), tr("Boburnoma", "The Baburnama", "Бабур-наме"), tr("Avesto", "The Avesta", "Авеста")], answer: 0 },
          { id: "tas-imam-photo", type: "photo",
            title: tr("Ikki minora", "Twin minarets", "Два минарета"),
            prompt: tr("Hovli o'rtasida turing va ikkala minorani bitta kadrga sig'diring.", "Stand in the middle of the courtyard and fit both minarets into one shot.", "Встаньте в центре двора и поместите оба минарета в один кадр.") }
        ]
      }),
      place({
        id: "chorsu", emoji: "🛍️", colors: ["#e0823a", "#6b2d17"], lat: 41.3267, lng: 69.2361, minutes: 60,
        interests: ["food", "culture"],
        name: tr("Chorsu bozori", "Chorsu Bazaar", "Базар Чорсу"),
        chapter: tr("Ziravorchining siri", "The Spice Seller's Secret", "Секрет торговца специями"),
        clue: tr("Maktubdagi birinchi muhr — ulkan ko'k gumbaz ostidagi bozor rasmi. Minoralardan janubga yuring.", "The first seal on the envelope shows a bazaar under a giant blue dome. Walk south from the minarets.", "Первая печать на конверте — базар под огромным синим куполом. Идите на юг от минаретов."),
        tip: tr("Ertalab boring — non va somsa eng issiq payti.", "Go in the morning, when the bread and somsa are hottest.", "Приходите утром — лепёшки и самса самые горячие."),
        story: tr("Ipak yo'li zamonidan beri savdo qaynaydigan chorraha. Ulkan ko'k gumbaz ostida ziravorlar, non va suhbat.", "A crossroads of trade since Silk Road times. Spices, bread and conversation under a giant blue dome.", "Перекрёсток торговли со времён Шёлкового пути. Специи, хлеб и разговоры под огромным синим куполом."),
        card: { icon: "🥟", rarity: "common", name: tr("Tandir somsa", "Tandir Somsa", "Тандырная самса"), fact: tr("Somsa loy tandirning qizigan devoriga yopishtirib pishiriladi.", "Somsa is baked on the hot inner wall of a clay tandir oven.", "Самсу пекут на раскалённой стенке глиняного тандыра.") },
        quests: [
          { id: "tas-chorsu-riddle", type: "riddle",
            title: tr("Gumbaz rangi", "Colour of the dome", "Цвет купола"),
            prompt: tr("Bozorning ulkan gumbazi qanday rangda? Bir so'z bilan yozing.", "What colour is the bazaar's giant dome? Type one word.", "Какого цвета огромный купол базара? Напишите одно слово."),
            answers: ["blue", "turquoise", "green", "ko'k", "kok", "moviy", "feruza", "yashil", "синий", "голубой", "бирюзовый", "зелёный", "зеленый"] },
          { id: "tas-chorsu-meet", type: "meet",
            title: tr("Ziravorchi Ravshan aka", "Ravshan the spice seller", "Торговец специями Равшан"),
            person: { emoji: "🧔", name: tr("Ravshan aka", "Ravshan aka", "Равшан ака"), where: tr("Gumbaz ostidagi ziravorlar qatori", "The spice row under the dome", "Ряд специй под куполом") },
            prompt: tr("Ravshan akani toping va \"Maktubni olib kelyapman\" deng. U sizga maxfiy so'zni aytadi.", "Find Ravshan aka and say \"I'm carrying the letter\". He will tell you a secret word.", "Найдите Равшана ака и скажите «Я несу письмо». Он скажет вам секретное слово."),
            code: "zira",
            reveal: tr("\"Zira! To'g'ri. Endi tepalikka chiqing — bozor ustida talabalar uyi bor, uning ulkan peshtoqi sizni kutmoqda.\"", "\"Zira! Correct. Now climb the hill — above the bazaar stands a house of students, and its huge portal is waiting for you.\"", "«Зира! Верно. Теперь поднимитесь на холм — над базаром стоит дом студентов, и его огромный портал ждёт вас».") },
          { id: "tas-chorsu-taste", type: "taste",
            title: tr("Issiq somsa", "Hot somsa", "Горячая самса"),
            prompt: tr("Tandirdan yangi uzilgan somsa yoki non tatib ko'ring.", "Taste a somsa or a bread fresh out of the tandir oven.", "Попробуйте самсу или лепёшку прямо из тандыра.") },
          { id: "tas-chorsu-photo", type: "photo",
            title: tr("Ziravorlar kamalagi", "Spice rainbow", "Радуга специй"),
            prompt: tr("Kamida beshta rangli ziravor uyumini bitta kadrga oling.", "Capture at least five colourful piles of spice in one frame.", "Поймайте в кадр хотя бы пять разноцветных горок специй.") }
        ]
      }),
      place({
        id: "kukeldash", emoji: "🏛️", colors: ["#c9a24a", "#4a3410"], lat: 41.3253, lng: 69.2388, minutes: 30,
        interests: ["history", "architecture"],
        name: tr("Ko'kaldosh madrasasi", "Kukeldash Madrasa", "Медресе Кукельдаш"),
        chapter: tr("Talabalar uyi", "The House of Students", "Дом студентов"),
        clue: tr("Ravshan aka aytgandek: bozor ustidagi tepalikda ulkan peshtoqli talabalar uyi.", "Just as Ravshan said: a house of students with a huge portal on the hill above the bazaar.", "Как сказал Равшан: дом студентов с огромным порталом на холме над базаром."),
        tip: tr("Chorsu bozoridan chiqib, tepalikka ko'tariling.", "Walk up the hill right next to Chorsu Bazaar.", "Поднимитесь на холм рядом с базаром Чорсу."),
        story: tr("Toshkentning eng katta madrasalaridan biri. Uning peshtoqi asrlar davomida shahar belgisi bo'lib kelgan.", "One of Tashkent's largest madrasas. Its portal has been a city landmark for centuries.", "Одно из крупнейших медресе Ташкента. Его портал веками служит символом города."),
        card: { icon: "🏛️", rarity: "common", name: tr("Madrasa peshtoqi", "Madrasa Portal", "Портал медресе"), fact: tr("Ko'kaldosh madrasasi XVI asrda qurilgan.", "Kukeldash Madrasa was built in the 16th century.", "Медресе Кукельдаш построено в XVI веке.") },
        quests: [
          { id: "tas-kuk-quiz", type: "quiz",
            title: tr("Qaysi asr?", "Which century?", "Какой век?"),
            prompt: tr("Ko'kaldosh madrasasi qaysi asrda qurilgan?", "In which century was Kukeldash Madrasa built?", "В каком веке построено медресе Кукельдаш?"),
            options: [tr("XII asr", "12th century", "XII век"), tr("XVI asr", "16th century", "XVI век"), tr("XIX asr", "19th century", "XIX век")], answer: 1 },
          { id: "tas-kuk-find", type: "find",
            title: tr("Hujralar hovlisi", "The courtyard", "Внутренний двор"),
            prompt: tr("Ichki hovlini toping — talabalar yashagan hujralarni ko'ring.", "Find the inner courtyard and spot the small cells where students once lived.", "Найдите внутренний двор и кельи, где когда-то жили студенты.") }
        ]
      }),
      place({
        id: "kosmonavtlar", emoji: "🚇", colors: ["#3b5bdb", "#101a4a"], lat: 41.3052, lng: 69.2752, minutes: 25,
        interests: ["modern", "hidden"],
        name: tr("Kosmonavtlar metro bekati", "Kosmonavtlar Metro Station", "Станция «Космонавтлар»"),
        chapter: tr("Yer ostidagi koinot", "Space Underground", "Космос под землёй"),
        clue: tr("Keyingi muhrda raketa bor. Yer ostiga tushing va O'zbekiston liniyasida kosmosga uching.", "The next seal shows a rocket. Go underground and ride the Uzbekistan line into space.", "На следующей печати — ракета. Спуститесь под землю и отправляйтесь в космос по Узбекистанской линии."),
        tip: tr("Chorsu bekatidan O'zbekiston liniyasida bir necha bekat yuring.", "Ride a few stops along the Uzbekistan line from Chorsu station.", "Проедьте несколько станций по Узбекистанской линии от «Чорсу»."),
        story: tr("Toshkent metrosi — Markaziy Osiyodagi birinchi metro. Bu bekat kosmonavtlarga bag'ishlangan.", "The Tashkent Metro was the first in Central Asia. This station is dedicated to cosmonauts.", "Ташкентское метро — первое в Центральной Азии. Эта станция посвящена космонавтам."),
        card: { icon: "🚀", rarity: "rare", name: tr("Kosmik medalyon", "Cosmonaut Medallion", "Космический медальон"), fact: tr("Toshkent metrosi 1977-yilda ochilgan — Markaziy Osiyoda birinchi.", "The Tashkent Metro opened in 1977 — the first in Central Asia.", "Ташкентское метро открылось в 1977 году — первое в Центральной Азии.") },
        quests: [
          { id: "tas-metro-quiz", type: "quiz",
            title: tr("Metro tarixi", "Metro history", "История метро"),
            prompt: tr("Toshkent metrosi qaysi yili ochilgan?", "In which year did the Tashkent Metro open?", "В каком году открылось Ташкентское метро?"),
            options: [tr("1966", "1966", "1966"), tr("1977", "1977", "1977"), tr("1991", "1991", "1991")], answer: 1 },
          { id: "tas-metro-photo", type: "photo",
            title: tr("Kosmik medalyon", "Cosmic medallion", "Космический медальон"),
            prompt: tr("Devordagi kosmonavt portretlaridan birini to'g'ridan-to'g'ri, markazda suratga oling.", "Photograph one of the cosmonaut portraits on the wall, straight on and centred.", "Сфотографируйте один из портретов космонавтов на стене — ровно и по центру.") }
        ]
      }),
      place({
        id: "amir-timur", emoji: "🐎", colors: ["#2f9e6e", "#0d3b2a"], lat: 41.3111, lng: 69.2797, minutes: 45,
        interests: ["history", "modern"],
        name: tr("Amir Temur xiyoboni", "Amir Timur Square", "Сквер Амира Темура"),
        chapter: tr("Sohibqiron nigohi", "The Conqueror's Gaze", "Взгляд завоевателя"),
        clue: tr("Metrodan chiqing va shahar markazidagi otliq haykalni qidiring.", "Come up from the metro and look for the horseman at the centre of the city.", "Поднимитесь из метро и ищите всадника в самом центре города."),
        tip: tr("Ko'k gumbazli Temuriylar tarixi muzeyiga ham kiring.", "Pop into the blue-domed Museum of Timurid History too.", "Загляните и в музей истории Темуридов с голубым куполом."),
        story: tr("Shahar markazi. Sohibqiron haykali va Temuriylar tarixi davlat muzeyi shu yerda.", "The heart of the city, home to Timur's statue and the State Museum of Timurid History.", "Сердце города: памятник Темуру и Государственный музей истории Темуридов."),
        card: { icon: "🐎", rarity: "epic", name: tr("Amir Temur", "Amir Timur", "Амир Темур"), fact: tr("XIV asrda Temuriylar saltanatiga asos solgan.", "Founded the Timurid Empire in the 14th century.", "Основал империю Темуридов в XIV веке.") },
        quests: [
          { id: "tas-timur-hunt", type: "hunt", lat: 41.3111, lng: 69.2797, radius: 90,
            title: tr("Markazni toping", "Find the centre", "Найдите центр"),
            prompt: tr("Xiyobonning aynan markaziga — otliq haykal yoniga boring. Telefon \"issiq-sovuq\" deb yo'l ko'rsatadi.", "Walk to the exact centre of the square, next to the horseman. Your phone will say warmer or colder.", "Дойдите до самого центра сквера, к всаднику. Телефон подскажет: теплее или холоднее.") },
          { id: "tas-timur-quiz", type: "quiz",
            title: tr("Ko'k gumbaz", "The blue dome", "Голубой купол"),
            prompt: tr("Temuriylar tarixi muzeyi qaysi yili ochilgan?", "In which year did the Museum of Timurid History open?", "В каком году открылся музей истории Темуридов?"),
            options: [tr("1970", "1970", "1970"), tr("1996", "1996", "1996"), tr("2011", "2011", "2011")], answer: 1 },
          { id: "tas-timur-photo", type: "photo",
            title: tr("Sohibqiron bilan selfi", "Selfie with the conqueror", "Селфи с завоевателем"),
            prompt: tr("Otliq haykal orqa fonda bo'lgan selfi oling.", "Take a selfie with the equestrian statue behind you.", "Сделайте селфи на фоне конной статуи.") }
        ]
      }),
      place({
        id: "mustaqillik", emoji: "🕊️", colors: ["#8b8fa8", "#262a3f"], lat: 41.3143, lng: 69.2723, minutes: 40,
        interests: ["modern", "culture"],
        name: tr("Mustaqillik maydoni", "Independence Square", "Площадь Независимости"),
        chapter: tr("Laylaklar arkasi", "The Arch of Storks", "Арка аистов"),
        clue: tr("G'arbga, favvoralar tomonga yuring — tepasida qushlar o'tirgan oq arkani qidiring.", "Head west towards the fountains and look for a white arch with birds on top.", "Идите на запад к фонтанам и ищите белую арку с птицами наверху."),
        tip: tr("Kechqurun favvoralar yonida sayr qilish ayniqsa yoqimli.", "The fountains make it lovely for an evening walk.", "Вечером здесь особенно приятно гулять у фонтанов."),
        story: tr("Mamlakatning bosh maydoni: Ezgu intilishlar arkasi, favvoralar va soyali xiyobonlar.", "The country's main square: the Arch of Good and Noble Aspirations, fountains and shady alleys.", "Главная площадь страны: арка Добрых и благородных устремлений, фонтаны и тенистые аллеи."),
        card: { icon: "🕊️", rarity: "rare", name: tr("Laylak", "The Stork", "Аист"), fact: tr("Ezgu intilishlar arkasi tepasida laylaklar turadi.", "Storks crown the Arch of Good and Noble Aspirations.", "Аисты венчают арку Добрых и благородных устремлений.") },
        quests: [
          { id: "tas-arch-quiz", type: "quiz",
            title: tr("Arka qushlari", "Birds of the arch", "Птицы арки"),
            prompt: tr("Ezgu intilishlar arkasi tepasida qaysi qushlar tasvirlangan?", "Which birds sit on top of the Arch of Good and Noble Aspirations?", "Какие птицы изображены на вершине арки Добрых устремлений?"),
            options: [tr("Laylaklar", "Storks", "Аисты"), tr("Burgutlar", "Eagles", "Орлы"), tr("Kaptarlar", "Pigeons", "Голуби")], answer: 0 },
          { id: "tas-mus-water", type: "photo",
            title: tr("Suv raqsi", "Dancing water", "Танцующая вода"),
            prompt: tr("Favvoralarni oqib turgan paytda suratga oling — suv tomchilari havoda muzlab qolsin.", "Photograph the fountains mid-splash — freeze the water drops in the air.", "Сфотографируйте фонтаны в движении — поймайте капли воды в воздухе.") },
          { id: "tas-mus-find", type: "find",
            title: tr("Motamsaro ona", "The Mourning Mother", "Скорбящая мать"),
            prompt: tr("Maydondagi \"Motamsaro ona\" yodgorligini toping va bir daqiqa sukut saqlang.", "Find the Mourning Mother memorial and pause for a moment of silence.", "Найдите памятник «Скорбящая мать» и почтите минутой молчания.") }
        ]
      }),
      place({
        id: "plov-center", emoji: "🍛", colors: ["#e8a33a", "#6e3a0c"], lat: 41.3423, lng: 69.2872, minutes: 60,
        interests: ["food"],
        name: tr("Markaziy Osiyo palov markazi", "Central Asian Plov Centre", "Центр плова"),
        chapter: tr("Oshpazning qozoni", "The Master's Kazan", "Казан мастера"),
        clue: tr("Choparlar ham ovqatlanishi kerak. Shimolga, ulkan qozonlardan bug' ko'tariladigan joyga boring.", "Even couriers need lunch. Head north to where steam rises from giant kazans.", "Даже курьерам нужен обед. Идите на север, туда, где над огромными казанами поднимается пар."),
        tip: tr("Tushlikkacha boring — kechga qozonlar bo'shab qoladi.", "Go before lunch ends — the kazans are empty by late afternoon.", "Приходите до конца обеда — к вечеру казаны пустеют."),
        story: tr("Palov — o'zbek dasturxonining shohi. Bu yerda u yuzlab kishiga mo'ljallangan qozonlarda pishiriladi.", "Plov is the king of the Uzbek table. Here it is cooked in kazans that feed hundreds.", "Плов — король узбекского дастархана. Здесь его готовят в казанах на сотни человек."),
        card: { icon: "🍛", rarity: "rare", name: tr("Oshpaz qozoni", "Master's Kazan", "Казан мастера"), fact: tr("An'anaviy palov katta cho'yan qozonda pishiriladi.", "Traditional plov is cooked in a big cast-iron kazan.", "Традиционный плов готовят в большом чугунном казане.") },
        quests: [
          { id: "tas-plov-meet", type: "meet",
            title: tr("Oshpaz Botir aka", "Botir the plov master", "Мастер плова Ботир"),
            person: { emoji: "👨‍🍳", name: tr("Botir aka", "Botir aka", "Ботир ака"), where: tr("Eng katta qozon yonida", "Next to the biggest kazan", "У самого большого казана") },
            prompt: tr("Oshpazdan so'rang: \"Palovning siri nima?\" U sizga maxfiy so'zni va oxirgi yo'nalishni aytadi.", "Ask the plov master: \"What is the secret of plov?\" He will tell you a secret word and your final direction.", "Спросите мастера: «В чём секрет плова?» Он скажет секретное слово и последнее направление."),
            code: "qozon",
            reveal: tr("\"Qozon! Sirning yarmi — qozonda, yarmi — sabrda. Maktubingiz esa shaharning eng baland nuqtasini kutmoqda. Shu yerdan ko'rinib turgan minoraga boring.\"", "\"Qozon! Half the secret is the kazan, half is patience. And your letter is waiting for the highest point in the city — the tower you can see from here.\"", "«Қозон! Половина секрета — в казане, половина — в терпении. А ваше письмо ждёт самую высокую точку города — башню, которую видно отсюда».") },
          { id: "tas-plov-taste", type: "taste",
            title: tr("Toshkent palovi", "Tashkent plov", "Ташкентский плов"),
            prompt: tr("Bir lagan palov buyurtma qiling va ko'k choy bilan iching.", "Order a plate of plov and pair it with green tea.", "Закажите тарелку плова и запейте зелёным чаем.") },
          { id: "tas-plov-riddle", type: "riddle",
            title: tr("Palovning ikkinchi nomi", "Plov's other name", "Второе имя плова"),
            prompt: tr("O'zbeklar palovni yana qanday atashadi? Uch harfli so'z.", "What else do Uzbeks call plov? A three-letter word.", "Как ещё узбеки называют плов? Слово из трёх букв."),
            answers: ["osh", "ош", "oš"] }
        ]
      }),
      place({
        id: "tv-tower", emoji: "📡", colors: ["#7c3aed", "#1f0f45"], lat: 41.3453, lng: 69.2848, minutes: 60,
        interests: ["modern"],
        name: tr("Toshkent teleminorasi", "Tashkent TV Tower", "Ташкентская телебашня"),
        chapter: tr("Shahar tepasida", "The Top of the City", "Вершина города"),
        clue: tr("Botir aka aytgandek: shaharning eng baland nuqtasi — maktubning manzili.", "Just as Botir said: the highest point of the city is the letter's destination.", "Как сказал Ботир: самая высокая точка города — адрес письма."),
        tip: tr("Kun botishiga yaqin boring. Pasportingizni oling.", "Go close to sunset and bring your passport.", "Приходите ближе к закату и возьмите паспорт."),
        story: tr("Markaziy Osiyodagi eng baland inshootlardan biri. Kuzatuv maydonchasidan butun shahar ko'rinadi.", "One of the tallest structures in Central Asia. The observation deck shows the whole city.", "Одно из самых высоких сооружений Центральной Азии. Со смотровой площадки виден весь город."),
        card: { icon: "✉️", rarity: "legendary", name: tr("Muhrlangan maktub", "The Sealed Letter", "Запечатанное письмо"), fact: tr("375 metr balandlikda yetkazilgan maktub.", "A letter delivered at 375 metres above the city.", "Письмо, доставленное на высоте 375 метров.") },
        quests: [
          { id: "tas-tower-timeline", type: "timeline", rarity: "epic",
            title: tr("Choparning yo'li", "The courier's route through time", "Путь курьера во времени"),
            prompt: tr("Toshkent diqqatga sazovor joylarini qurilgan vaqti bo'yicha tartiblang — eng eskisidan boshlab.", "Put these Tashkent landmarks in order of when they were built — oldest first.", "Расставьте достопримечательности Ташкента по времени постройки — от самой старой."),
            items: [tr("Temuriylar tarixi muzeyi", "Museum of Timurid History", "Музей истории Темуридов"), tr("Ko'kaldosh madrasasi", "Kukeldash Madrasa", "Медресе Кукельдаш"), tr("Teleminora", "TV Tower", "Телебашня"), tr("Toshkent metrosi", "Tashkent Metro", "Ташкентское метро")],
            order: [1, 3, 2, 0] },
          { id: "tas-tower-riddle", type: "riddle",
            title: tr("Qanchalik baland?", "How high?", "Какая высота?"),
            prompt: tr("Teleminoraning balandligi necha metr? Faqat raqam yozing.", "How many metres tall is the TV Tower? Type the number.", "Сколько метров высота телебашни? Напишите число."),
            answers: ["375"] },
          { id: "tas-tower-photo", type: "photo", rarity: "legendary",
            title: tr("Maktub yetkazildi", "Letter delivered", "Письмо доставлено"),
            prompt: tr("Kuzatuv maydonchasidan butun shahar panoramasini suratga oling — bu choparning so'nggi muhri.", "Take a panorama of the whole city from the observation deck — the courier's final seal.", "Снимите панораму всего города со смотровой площадки — последняя печать курьера.") }
        ]
      })
    ],
    dailies: [
      { id: "tas-d-rahmat", title: tr("Uch marta \"Rahmat\"", "Three \"Rahmat\"s", "Три «Рахмат»"), prompt: tr("Bugun uch kishiga o'zbekcha \"rahmat\" deng.", "Say \"rahmat\" (thank you) in Uzbek to three people today.", "Скажите «рахмат» (спасибо) трём людям сегодня.") },
      { id: "tas-d-choyxona", title: tr("Choyxona tanaffusi", "Choyxona break", "Перерыв в чайхане"), prompt: tr("Choyxonada bir choynak ko'k choy iching.", "Share a pot of green tea in a choyxona.", "Выпейте чайник зелёного чая в чайхане.") },
      { id: "tas-d-metro", title: tr("Metro sayohati", "Metro hop", "Прогулка по метро"), prompt: tr("Metroda uch xil bekatni ko'rib chiqing.", "Visit three different metro stations and compare their designs.", "Посетите три разные станции метро и сравните их оформление.") },
      { id: "tas-d-water", title: tr("Ankhor bo'yida", "By the Ankhor canal", "У канала Анхор"), prompt: tr("Anhor kanali bo'yida sayr qiling va oqayotgan suvni suratga oling.", "Walk along the Ankhor canal and photograph the flowing water.", "Прогуляйтесь вдоль канала Анхор и сфотографируйте бегущую воду.") },
      { id: "tas-d-count", title: tr("Beshgacha sanang", "Count to five", "Считаем до пяти"), prompt: tr("O'zbekcha beshgacha sanashni o'rganing: bir, ikki, uch, to'rt, besh.", "Learn to count to five in Uzbek: bir, ikki, uch, to'rt, besh.", "Научитесь считать до пяти по-узбекски: бир, икки, уч, тўрт, беш.") }
    ]
  },
  {
    id: "samarkand",
    short: "SAM",
    name: tr("Samarqand", "Samarkand", "Самарканд"),
    title: tr("Samarqand sirlari", "Secrets of Samarkand", "Тайны Самарканда"),
    tagline: tr("Qadimiy shaharni oddiy turist emas, kashfiyotchi sifatida ko'ring.", "See the ancient city as an explorer, not an ordinary tourist.", "Откройте древний город как исследователь, а не как обычный турист."),
    image: "../assets/registan-hero.jpg",
    story: {
      title: tr("Yo'qolgan yulduz xaritasi", "The Lost Star Map", "Потерянная звёздная карта"),
      icon: "🌌",
      intro: tr(
        "Rivoyatlarga ko'ra, Ulug'bek yulduzlar katalogining bir sahifasini yetti bo'lakka bo'lib, Samarqand bo'ylab yashirgan. Har bir bo'lakni toping va xaritani rasadxonaga qaytaring.",
        "Legend says Ulugh Beg tore one page of his star catalogue into seven pieces and hid them across Samarkand. Find every piece and bring the map back to the Observatory.",
        "Легенда гласит: Улугбек разорвал одну страницу своего звёздного каталога на семь частей и спрятал их по всему Самарканду. Найдите все части и верните карту в обсерваторию."
      ),
      piece: tr("xarita bo'lagi", "map piece", "фрагмент карты"),
      finale: tr("Xarita tiklandi! Yetti bo'lak birlashdi va osmondagi yulduzlar yana o'z joyiga qaytdi.", "The map is whole again! Seven pieces join, and the stars return to their places in the sky.", "Карта снова цела! Семь фрагментов соединились, и звёзды вернулись на свои места на небе."),
      giftStamp: "star-keeper"
    },
    reward: {
      name: tr("Samarqand kashfiyotchisi", "Samarkand Explorer", "Исследователь Самарканда"),
      prize: tr("Cheklangan Samarqand medali va postcard", "Limited Samarkand medal and postcard", "Лимитированная медаль Самарканда и открытка")
    },
    places: [
      place({
        id: "registan", emoji: "🕌", colors: ["#1fa3b5", "#0b3346"], lat: 39.6547, lng: 66.9758, minutes: 90,
        interests: ["history", "architecture"],
        name: tr("Registon", "Registan", "Регистан"),
        chapter: tr("Olimlar maydoni", "The Square of Scholars", "Площадь учёных"),
        clue: tr("Shahar yuragidan boshlang: bitta maydonga qaragan uchta madrasa.", "Start at the heart of the city: three madrasas facing one square.", "Начните с сердца города: три медресе, обращённые к одной площади."),
        tip: tr("Kechqurun qaytib keling — yoritilgan Registon sehrli.", "Come back after dark — the lit-up square is magical.", "Вернитесь вечером — подсвеченная площадь волшебна."),
        story: tr("Ulug'bek o'z nomidagi madrasada yulduzlarni o'rgatgan. Birinchi bo'lak talabalar osmonni o'rgangan joyda kutmoqda.", "Ulugh Beg once taught the stars in the madrasa that bears his name. The first piece waits where students learned the sky.", "Улугбек преподавал астрономию в медресе своего имени. Первый фрагмент ждёт там, где студенты изучали небо."),
        card: { icon: "🕌", rarity: "rare", name: tr("Ulug'bek madrasasi", "Ulugh Beg Madrasa", "Медресе Улугбека"), fact: tr("Registondagi eng qadimgi madrasa — 1417–1420-yillarda qurilgan.", "The oldest madrasa on Registan, built in 1417–1420.", "Старейшее медресе Регистана, построено в 1417–1420 годах.") },
        quests: [
          { id: "sam-reg-hunt", type: "hunt", lat: 39.6547, lng: 66.9758, radius: 90,
            title: tr("Maydon markazi", "Centre of the square", "Центр площади"),
            prompt: tr("Uchala madrasa o'rtasidagi markaziy nuqtani toping. Telefon \"issiq-sovuq\" deb yo'l ko'rsatadi.", "Find the central point between all three madrasas. Your phone will say warmer or colder.", "Найдите центральную точку между тремя медресе. Телефон подскажет: теплее или холоднее.") },
          { id: "sam-reg-timeline", type: "timeline",
            title: tr("Uch madrasa", "Three madrasas", "Три медресе"),
            prompt: tr("Madrasalarni qurilgan vaqti bo'yicha tartiblang — eng eskisidan boshlab.", "Put the madrasas in the order they were built — oldest first.", "Расставьте медресе по времени постройки — от самого старого."),
            items: [tr("Sherdor", "Sher-Dor", "Шердор"), tr("Tillakori", "Tilya-Kori", "Тилля-Кари"), tr("Ulug'bek", "Ulugh Beg", "Улугбек")],
            order: [2, 0, 1] },
          { id: "sam-reg-quiz", type: "quiz",
            title: tr("Sherdor siri", "Secret of Sher-Dor", "Тайна Шердора"),
            prompt: tr("Sherdor madrasasi peshtoqida qaysi hayvon tasvirlangan?", "Which animal is pictured on the portal of Sher-Dor Madrasa?", "Какое животное изображено на портале медресе Шердор?"),
            options: [tr("Sher", "A lion (sher)", "Лев (шер)"), tr("Burgut", "An eagle", "Орёл"), tr("Ot", "A horse", "Конь")], answer: 0 },
          { id: "sam-reg-photo", type: "photo",
            title: tr("Uch madrasa bitta kadrda", "Three in one frame", "Три в одном кадре"),
            prompt: tr("Maydon chetidan uchala madrasani bitta kadrga oling.", "From the edge of the square, capture all three madrasas in one frame.", "С края площади поймайте все три медресе в один кадр.") }
        ]
      }),
      place({
        id: "gur-emir", emoji: "💠", colors: ["#2bb3a3", "#0c3b3a"], lat: 39.6484, lng: 66.9691, minutes: 40,
        interests: ["history", "architecture"],
        name: tr("Go'ri Amir maqbarasi", "Gur-e-Amir Mausoleum", "Мавзолей Гур-Эмир"),
        chapter: tr("Bobo gumbazi", "The Grandfather's Dome", "Купол деда"),
        clue: tr("Maydondan janubi-g'arbga yuring — bobo va nabira yotgan qovurg'ali feruza gumbazga.", "Walk south-west from the square to a ribbed turquoise dome where a grandfather and grandson rest.", "Идите на юго-запад от площади к ребристому бирюзовому куполу, где покоятся дед и внук."),
        tip: tr("Registondan piyoda 10 daqiqa.", "A 10-minute walk from Registan.", "10 минут пешком от Регистана."),
        story: tr("Ulug'bek bobosi Amir Temur yonida dafn etilgan. Ikkinchi bo'lak qovurg'ali feruza gumbaz ostida.", "Ulugh Beg rests beside his grandfather, Amir Timur. The second piece lies under the ribbed turquoise dome.", "Улугбек покоится рядом со своим дедом Амиром Темуром. Второй фрагмент — под ребристым бирюзовым куполом."),
        card: { icon: "💚", rarity: "epic", name: tr("Temurning nefriti", "Timur's Jade", "Нефрит Темура"), fact: tr("Amir Temur qabri to'q yashil nefrit tosh bilan qoplangan.", "Amir Timur's tomb is covered by a dark-green jade stone.", "Гробница Амира Темура покрыта тёмно-зелёным нефритом.") },
        quests: [
          { id: "sam-gur-quiz", type: "quiz",
            title: tr("Kim dafn etilgan?", "Who rests here?", "Кто здесь покоится?"),
            prompt: tr("Go'ri Amir kimning maqbarasi sifatida mashhur?", "Whose tomb made Gur-e-Amir famous?", "Чьей гробницей знаменит Гур-Эмир?"),
            options: [tr("Amir Temur", "Amir Timur", "Амир Темур"), tr("Alisher Navoiy", "Alisher Navoi", "Алишер Навои"), tr("Ibn Sino", "Ibn Sina", "Ибн Сина")], answer: 0 },
          { id: "sam-gur-riddle", type: "riddle",
            title: tr("Yashil tosh", "The green stone", "Зелёный камень"),
            prompt: tr("Temurning qabr toshi qaysi yashil toshdan? Bir so'z.", "Timur's tombstone is made of which green stone? One word.", "Из какого зелёного камня надгробие Темура? Одно слово."),
            answers: ["jade", "nephrite", "nefrit", "нефрит", "jadeite"] },
          { id: "sam-gur-photo", type: "photo",
            title: tr("Qovurg'ali gumbaz", "The ribbed dome", "Ребристый купол"),
            prompt: tr("Gumbazni darvoza orqali, ramkaga olingan holda suratga oling.", "Photograph the dome framed through the entrance gate.", "Сфотографируйте купол в рамке входных ворот.") }
        ]
      }),
      place({
        id: "bibixonim", emoji: "🏯", colors: ["#3f7fd6", "#12264a"], lat: 39.6607, lng: 66.9794, minutes: 40,
        interests: ["architecture", "history"],
        name: tr("Bibixonim masjidi", "Bibi-Khanym Mosque", "Мечеть Биби-Ханым"),
        chapter: tr("Malika masjidi", "The Queen's Mosque", "Мечеть царицы"),
        clue: tr("Piyodalar ko'chasi bo'ylab shimoli-sharqqa — malika nomi bilan atalgan ulkan peshtoqqa boring.", "Follow the pedestrian street north-east to a giant portal named after a queen.", "Идите по пешеходной улице на северо-восток к огромному порталу, названному в честь царицы."),
        tip: tr("Siyob bozori shundoq yonida — ikkalasini birga rejalashtiring.", "Siab Bazaar is right next door — plan them together.", "Сиабский базар рядом — планируйте их вместе."),
        story: tr("Bu masjid Temurning xotini Bibixonim nomi bilan ataladi va Samarqandning buyuk orzusini eslatadi.", "Named after Timur's wife, Bibi-Khanym, this mosque recalls Samarkand's great ambition.", "Мечеть носит имя жены Темура, Биби-Ханым, и напоминает о великой мечте Самарканда."),
        card: { icon: "👑", rarity: "rare", name: tr("Bibixonim", "Bibi-Khanym", "Биби-Ханым"), fact: tr("Masjid Amir Temurning xotini nomi bilan atalgan.", "The mosque is named after Amir Timur's wife.", "Мечеть названа в честь жены Амира Темура.") },
        quests: [
          { id: "sam-bib-find", type: "find",
            title: tr("Marmar lavh", "The marble stand", "Мраморная подставка"),
            prompt: tr("Hovlidagi ulkan marmar Qur'on lavhini toping.", "Find the giant marble Qur'an stand in the courtyard.", "Найдите во дворе огромную мраморную подставку для Корана.") },
          { id: "sam-bib-photo", type: "photo",
            title: tr("Osmonga qarab", "Looking up", "Взгляд вверх"),
            prompt: tr("Peshtoq ostida turing va uni pastdan yuqoriga qarab suratga oling.", "Stand under the portal and shoot it looking straight up.", "Встаньте под порталом и снимите его, глядя прямо вверх.") }
        ]
      }),
      place({
        id: "siyob", emoji: "🥖", colors: ["#e0823a", "#5c2a10"], lat: 39.6620, lng: 66.9812, minutes: 45,
        interests: ["food", "culture"],
        name: tr("Siyob bozori", "Siab Bazaar", "Сиабский базар"),
        chapter: tr("Novvoyning siri", "The Baker's Secret", "Секрет пекаря"),
        clue: tr("Shundoq qo'shni eshikdan — yangi uzilgan non hidiga ergashing.", "Right next door — follow the smell of fresh bread.", "Совсем рядом — идите на запах свежего хлеба."),
        tip: tr("Quruq mevalarni sotib olishdan oldin tatib ko'ring.", "Taste dried fruit before you buy — vendors expect it.", "Пробуйте сухофрукты перед покупкой — это нормально."),
        story: tr("Siyob bozori sayohatni ta'm va insoniy suhbat bilan to'ldiradi. Novvoylar bu yerda asrlar davomida sirlarni saqlab kelgan.", "Siab Bazaar fills the journey with flavour and conversation. Bakers here have kept secrets for centuries.", "Сиабский базар наполняет путешествие вкусом и разговорами. Здешние пекари веками хранят секреты."),
        card: { icon: "🥖", rarity: "common", name: tr("Samarqand noni", "Samarkand Non", "Самаркандская лепёшка"), fact: tr("Samarqand noni butun O'zbekistonda mashhur.", "Samarkand bread is famous across Uzbekistan.", "Самаркандская лепёшка знаменита на весь Узбекистан.") },
        quests: [
          { id: "sam-siy-meet", type: "meet",
            title: tr("Novvoy Dilnoza opa", "Dilnoza the baker", "Пекарь Дилноза"),
            person: { emoji: "👩‍🍳", name: tr("Dilnoza opa", "Dilnoza opa", "Дилноза опа"), where: tr("Bozordagi non qatori", "The bread row of the bazaar", "Хлебный ряд базара") },
            prompt: tr("Non qatoridan Dilnoza opani toping va \"Ulug'bekning xaritasini izlayapman\" deng. U sizga maxfiy so'zni aytadi.", "Find Dilnoza opa in the bread row and say \"I'm looking for Ulugh Beg's map\". She will tell you a secret word.", "Найдите Дилнозу опа в хлебном ряду и скажите «Я ищу карту Улугбека». Она скажет секретное слово."),
            code: "yulduz",
            reveal: tr("\"Yulduz! Bobom aytardi: xaritaning bo'lagi tirik shoh ko'chasida. Yo'lni kesib o'ting va ko'k maqbaralar zinasidan chiqing.\"", "\"Yulduz — star! My grandfather used to say a piece of the map is in the street of the Living King. Cross the road and climb the steps between the blue tombs.\"", "«Юлдуз — звезда! Дед говорил: фрагмент карты — на улице Живого царя. Перейдите дорогу и поднимитесь по ступеням между синими гробницами».") },
          { id: "sam-siy-taste", type: "taste",
            title: tr("Samarqand noni", "Samarkand non", "Самаркандская лепёшка"),
            prompt: tr("Mashhur Samarqand nonini sotib oling va issig'ida tatib ko'ring.", "Buy the famous Samarkand bread and taste it warm.", "Купите знаменитую самаркандскую лепёшку и попробуйте её тёплой.") },
          { id: "sam-siy-riddle", type: "riddle",
            title: tr("Nonning nomi", "Name of the bread", "Имя хлеба"),
            prompt: tr("O'zbek tilida non qanday ataladi? Uch harf.", "What is bread called in Uzbek? Three letters.", "Как по-узбекски называется хлеб? Три буквы."),
            answers: ["non", "нон"] },
          { id: "sam-siy-talk", type: "talk",
            title: tr("Savdolashing", "Friendly bargain", "Поторгуйтесь"),
            prompt: tr("Quruq meva uchun do'stona savdolashing va \"Rahmat!\" deng.", "Bargain kindly for dried fruit and finish with \"Rahmat!\"", "Дружелюбно поторгуйтесь за сухофрукты и скажите «Рахмат!»") }
        ]
      }),
      place({
        id: "shohi-zinda", emoji: "🔷", colors: ["#1f6fd1", "#0a1f45"], lat: 39.6627, lng: 66.9878, minutes: 60,
        interests: ["history", "architecture"],
        name: tr("Shohi Zinda", "Shah-i-Zinda", "Шахи-Зинда"),
        chapter: tr("Tirik shoh ko'chasi", "Street of the Living King", "Улица Живого царя"),
        clue: tr("Dilnoza opa aytgandek: yo'lni kesib o'ting va ko'k maqbaralar zinasidan chiqing.", "Just as Dilnoza said: cross the road and climb the steps between the blue tombs.", "Как сказала Дилноза: перейдите дорогу и поднимитесь по ступеням между синими гробницами."),
        tip: tr("Ertalab boring — yorug'lik va jimlik eng go'zal payti.", "Go early — the light and the quiet are at their best.", "Приходите рано — свет и тишина лучше всего."),
        story: tr("Shohi Zinda yo'lagi — asrlar davomida saqlangan ranglar muzeyi.", "The Shah-i-Zinda passage is a museum of colour kept for centuries.", "Коридор Шахи-Зинда — музей цвета, сохранённый на века."),
        card: { icon: "🔷", rarity: "rare", name: tr("Ko'k koshin", "Blue Tile", "Синяя изразца"), fact: tr("Shohi Zinda — \"Tirik shoh\" degani.", "Shah-i-Zinda means \"The Living King\".", "Шахи-Зинда означает «Живой царь».") },
        quests: [
          { id: "sam-shz-riddle", type: "riddle",
            title: tr("Nom siri", "Secret of the name", "Тайна названия"),
            prompt: tr("\"Shohi Zinda\" — \"Tirik ...\". Yetishmayotgan so'zni yozing.", "\"Shah-i-Zinda\" means \"The Living ...\". Type the missing word.", "«Шахи-Зинда» — это «Живой ...». Напишите пропущенное слово."),
            answers: ["king", "shoh", "shah", "царь", "шах", "king."] },
          { id: "sam-shz-photo", type: "photo",
            title: tr("Ko'k yo'lak", "Blue passage", "Синий коридор"),
            prompt: tr("Zinaning tepasidan maqbaralar yo'lagini pastga qarab suratga oling.", "From the top of the steps, photograph the avenue of tombs looking down.", "С верха лестницы сфотографируйте аллею мавзолеев, глядя вниз.") },
          { id: "sam-shz-find", type: "find",
            title: tr("Uch xil ko'k", "Three shades of blue", "Три оттенка синего"),
            prompt: tr("Bitta devorda ko'k rangning kamida uch xil tusini toping.", "Find at least three different shades of blue on a single wall.", "Найдите хотя бы три оттенка синего на одной стене.") }
        ]
      }),
      place({
        id: "konigil", emoji: "📜", colors: ["#b08a4a", "#3d2b10"], lat: 39.6680, lng: 67.0560, minutes: 60,
        interests: ["culture", "hidden"],
        name: tr("Konigil qog'oz ustaxonasi", "Konigil Paper Workshop", "Бумажная мастерская Конигил"),
        chapter: tr("Qog'oz ustalari", "The Paper Makers", "Мастера бумаги"),
        clue: tr("Yulduz xaritasiga asrlar yashaydigan qog'oz kerak. Shahardan sharqqa, suv bo'yidagi qishloqqa boring.", "A star map needs paper that lasts for centuries. Ride east out of the city to a village by the water.", "Звёздной карте нужна бумага, которая живёт веками. Отправляйтесь на восток, в деревню у воды."),
        tip: tr("Ustalar qog'oz tayyorlashni jonli ko'rsatadi — so'rang.", "The masters demonstrate papermaking live — just ask.", "Мастера показывают изготовление бумаги вживую — просто попросите."),
        story: tr("Bu yerda qadimiy qog'oz tayyorlash usuli hali ham tirik — suv tegirmoni tut po'stlog'ini ezadi.", "The ancient papermaking method is still alive here — a water mill pounds mulberry bark.", "Здесь до сих пор жив древний способ изготовления бумаги — водяная мельница толчёт кору шелковицы."),
        card: { icon: "📜", rarity: "epic", name: tr("Tut qog'ozi", "Mulberry Paper", "Шелковичная бумага"), fact: tr("Samarqand qog'ozi tut daraxti po'stlog'idan tayyorlanadi.", "Samarkand paper is made from mulberry bark.", "Самаркандскую бумагу делают из коры шелковицы.") },
        quests: [
          { id: "sam-kon-water", type: "photo",
            title: tr("Suv g'ildiragi", "The water wheel", "Водяное колесо"),
            prompt: tr("Aylanayotgan suv g'ildiragini suratga oling — suv sachrashi ko'rinsin.", "Photograph the turning water wheel — make the splashing water visible.", "Сфотографируйте вращающееся водяное колесо — чтобы были видны брызги воды.") },
          { id: "sam-kon-meet", type: "meet",
            title: tr("Qog'ozchi usta", "The paper master", "Мастер бумаги"),
            person: { emoji: "👴", name: tr("Usta Zarif", "Usta Zarif", "Уста Зариф"), where: tr("Ustaxona hovlisi, tegirmon yonida", "The workshop courtyard, by the mill", "Двор мастерской, у мельницы") },
            prompt: tr("Ustadan xarita uchun bir varaq qog'oz so'rang. U sizga maxfiy so'zni va oxirgi yo'lni aytadi.", "Ask the master for a sheet of paper for the map. He will tell you a secret word and the final way.", "Попросите мастера лист бумаги для карты. Он скажет секретное слово и последний путь."),
            code: "qog'oz",
            reveal: tr("\"Qog'oz! Mana varaq. Endi shahar tomon qayting — yulduzlar uchun yerga qazilgan ulkan yoyli tepalikka.\"", "\"Qog'oz — paper! Here is your sheet. Now head back towards the city, to the hill where a giant arc was dug into the earth for the stars.\"", "«Қоғоз — бумага! Вот ваш лист. Теперь возвращайтесь к городу, к холму, где для звёзд в землю врыта огромная дуга».") },
          { id: "sam-kon-quiz", type: "quiz",
            title: tr("Qog'oz siri", "Paper secret", "Секрет бумаги"),
            prompt: tr("Samarqand qog'ozi nimadan tayyorlanadi?", "What is Samarkand paper made from?", "Из чего делают самаркандскую бумагу?"),
            options: [tr("Paxta chigiti", "Cotton seeds", "Хлопковые семена"), tr("Tut daraxti po'stlog'i", "Mulberry tree bark", "Кора тутового дерева"), tr("Qamish", "Reeds", "Тростник")], answer: 1 }
        ]
      }),
      place({
        id: "ulugbek", emoji: "🔭", colors: ["#5b4bd6", "#17123f"], lat: 39.6747, lng: 67.0056, minutes: 50,
        interests: ["history", "hidden"],
        name: tr("Ulug'bek rasadxonasi", "Ulugh Beg Observatory", "Обсерватория Улугбека"),
        chapter: tr("Yulduzlarga qaytish", "Return to the Stars", "Возвращение к звёздам"),
        clue: tr("Usta Zarif aytgandek: yulduzlar uchun yerga qazilgan ulkan yoyli tepalik.", "Just as Usta Zarif said: the hill where a giant arc was dug into the earth for the stars.", "Как сказал Уста Зариф: холм, где для звёзд в землю врыта огромная дуга."),
        tip: tr("Shahar markazidan taksida 10 daqiqa.", "About 10 minutes by taxi from the centre.", "Около 10 минут на такси от центра."),
        story: tr("Ulug'bek osmonni kuzatib, ilm uchun yangi yo'l ochgan. Oxirgi bo'lak — va xarita yana butun.", "Ulugh Beg observed the sky and opened a new path for science. One last piece — and the map is whole.", "Улугбек наблюдал за небом и открыл новый путь для науки. Последний фрагмент — и карта снова цела."),
        card: { icon: "🌌", rarity: "legendary", name: tr("Yulduz xaritasi", "The Star Map", "Звёздная карта"), fact: tr("Ulug'bek katalogi mingdan ortiq yulduzni o'z ichiga olgan.", "Ulugh Beg's catalogue listed more than a thousand stars.", "Каталог Улугбека включал более тысячи звёзд.") },
        quests: [
          { id: "sam-ulu-hunt", type: "hunt", lat: 39.6747, lng: 67.0056, radius: 100,
            title: tr("Yer ostidagi yoy", "The underground arc", "Подземная дуга"),
            prompt: tr("Sekstant yoyiga olib boradigan kirish joyini toping. Telefon \"issiq-sovuq\" deb yo'l ko'rsatadi.", "Find the entrance to the sextant's arc. Your phone will say warmer or colder.", "Найдите вход к дуге секстанта. Телефон подскажет: теплее или холоднее.") },
          { id: "sam-ulu-quiz", type: "quiz",
            title: tr("Yulduz asbobi", "Star instrument", "Звёздный инструмент"),
            prompt: tr("Rasadxonadan bugungacha nima saqlanib qolgan?", "What part of the observatory survives today?", "Что сохранилось от обсерватории до наших дней?"),
            options: [tr("Ulkan teleskop", "A giant telescope", "Гигантский телескоп"), tr("Yer ostidagi ulkan sekstant yoyi", "The underground arc of a giant sextant", "Подземная дуга гигантского секстанта"), tr("Soat minorasi", "A clock tower", "Часовая башня")], answer: 1 },
          { id: "sam-ulu-photo", type: "photo", rarity: "legendary",
            title: tr("Xarita tiklandi", "The map is whole", "Карта цела"),
            prompt: tr("Sekstant yoyini yuqoridan suratga oling — bu yulduz xaritasining so'nggi bo'lagi.", "Photograph the sextant's arc from above — the final piece of the star map.", "Сфотографируйте дугу секстанта сверху — последний фрагмент звёздной карты.") }
        ]
      })
    ],
    dailies: [
      { id: "sam-d-rahmat", title: tr("Uch marta \"Rahmat\"", "Three \"Rahmat\"s", "Три «Рахмат»"), prompt: tr("Bugun uch kishiga o'zbekcha \"rahmat\" deng.", "Say \"rahmat\" (thank you) in Uzbek to three people today.", "Скажите «рахмат» (спасибо) трём людям сегодня.") },
      { id: "sam-d-night", title: tr("Tungi Registon", "Registan by night", "Ночной Регистан"), prompt: tr("Kechqurun Registonning yoritilishini tomosha qiling.", "Come back after dark to see Registan lit up.", "Вернитесь вечером и посмотрите на подсвеченный Регистан.") },
      { id: "sam-d-tea", title: tr("Choyxona tanaffusi", "Choyxona break", "Перерыв в чайхане"), prompt: tr("Choyxonada bir choynak ko'k choy iching.", "Share a pot of green tea in a choyxona.", "Выпейте чайник зелёного чая в чайхане.") },
      { id: "sam-d-craft", title: tr("Hunarmand bilan suhbat", "Meet a craftsperson", "Встреча с мастером"), prompt: tr("Kulol, zardo'z yoki gilamdo'z bilan gaplashing.", "Chat with a potter, embroiderer or carpet weaver.", "Поговорите с гончаром, золотошвеем или ковроделом.") },
      { id: "sam-d-count", title: tr("Beshgacha sanang", "Count to five", "Считаем до пяти"), prompt: tr("O'zbekcha beshgacha sanashni o'rganing: bir, ikki, uch, to'rt, besh.", "Learn to count to five in Uzbek: bir, ikki, uch, to'rt, besh.", "Научитесь считать до пяти по-узбекски: бир, икки, уч, тўрт, беш.") }
    ]
  }
];

// Partner offers. These are SAMPLE partners for the demo — replace with real signed partners.
export const OFFERS = [
  { id: "tas-bakery", cityId: "tashkent", icon: "🥟", kind: "cafe", unlock: { place: "chorsu" },
    partner: tr("Tandir Burchagi (demo)", "Tandir Corner (demo)", "Тандыр Уголок (демо)"),
    deal: tr("2 ta somsa — 1 ta narxida", "2 somsa for the price of 1", "2 самсы по цене одной"),
    where: tr("Chorsu bozori yonida", "Near Chorsu Bazaar", "Рядом с базаром Чорсу") },
  { id: "tas-tea", cityId: "tashkent", icon: "☕", kind: "cafe", unlock: { level: 2 },
    partner: tr("Bahor choyxonasi (demo)", "Choyxona Bahor (demo)", "Чайхана Бахор (демо)"),
    deal: tr("Istalgan taom bilan bir choynak ko'k choy bepul", "A free pot of green tea with any meal", "Бесплатный чайник зелёного чая к любому блюду"),
    where: tr("Toshkent markazi", "Central Tashkent", "Центр Ташкента") },
  { id: "tas-restaurant", cityId: "tashkent", icon: "🍛", kind: "restaurant", unlock: { place: "plov-center" },
    partner: tr("Navbahor oshxonasi (demo)", "Oshxona Navbahor (demo)", "Ошхона Навбахор (демо)"),
    deal: tr("Palovga 15% chegirma", "15% off your plov", "Скидка 15% на плов"),
    where: tr("Teleminora yaqinida", "Near the TV Tower", "Рядом с телебашней") },
  { id: "tas-shop", cityId: "tashkent", icon: "🧵", kind: "shop", unlock: { city: "tashkent" },
    partner: tr("Atlas va Adras do'koni (demo)", "Atlas & Adras Textiles (demo)", "Атлас и Адрас (демо)"),
    deal: tr("Ipak ro'mollarga 10% chegirma", "10% off silk scarves", "Скидка 10% на шёлковые платки"),
    where: tr("Amir Temur xiyoboni yonida", "Near Amir Timur Square", "Рядом со сквером Амира Темура") },
  { id: "sam-cafe", cityId: "samarkand", icon: "☕", kind: "cafe", unlock: { place: "registan" },
    partner: tr("Yulduz kafesi (demo)", "Café Yulduz (demo)", "Кафе Юлдуз (демо)"),
    deal: tr("Qahva bilan shirinlik bepul", "A free dessert with any coffee", "Бесплатный десерт к любому кофе"),
    where: tr("Registon yonida", "Near Registan", "Рядом с Регистаном") },
  { id: "sam-bakery", cityId: "samarkand", icon: "🥖", kind: "cafe", unlock: { place: "siyob" },
    partner: tr("Non uyi (demo)", "Non Uyi Bakery (demo)", "Пекарня Нон Уйи (демо)"),
    deal: tr("Har bir xariddan so'ng bitta non sovg'a", "A free non with any purchase", "Лепёшка в подарок к любой покупке"),
    where: tr("Siyob bozori", "Siab Bazaar", "Сиабский базар") },
  { id: "sam-shop", cityId: "samarkand", icon: "📜", kind: "shop", unlock: { place: "konigil" },
    partner: tr("Qog'oz va ipak do'koni (demo)", "Paper & Silk Shop (demo)", "Бумага и шёлк (демо)"),
    deal: tr("Qo'lda yasalgan qog'ozga 15% chegirma", "15% off handmade paper", "Скидка 15% на бумагу ручной работы"),
    where: tr("Konigil", "Konigil", "Конигил") },
  { id: "sam-restaurant", cityId: "samarkand", icon: "🍽️", kind: "restaurant", unlock: { city: "samarkand" },
    partner: tr("Samarqand oshxonasi (demo)", "Samarqand Oshxonasi (demo)", "Самарканд Ошхонаси (демо)"),
    deal: tr("Ikki kishilik kechki ovqatga 20% chegirma", "20% off dinner for two", "Скидка 20% на ужин для двоих"),
    where: tr("Samarqand markazi", "Central Samarkand", "Центр Самарканда") }
];

// Special stamps given as gifts for how and when you travel.
export const GIFT_STAMPS = [
  { id: "early-bird", icon: "🌅", name: tr("Erta turuvchi", "Early Bird", "Ранняя пташка"), desc: tr("Kvestni soat 9 dan oldin bajaring", "Complete a quest before 9 am", "Выполните квест до 9 утра") },
  { id: "golden-hour", icon: "🌇", name: tr("Oltin soat", "Golden Hour", "Золотой час"), desc: tr("Kvestni kun botishi paytida bajaring (17–20)", "Complete a quest at sunset (5–8 pm)", "Выполните квест на закате (17–20)") },
  { id: "night-owl", icon: "🦉", name: tr("Tungi boyo'g'li", "Night Owl", "Ночная сова"), desc: tr("Kvestni soat 20 dan keyin bajaring", "Complete a quest after 8 pm", "Выполните квест после 20:00") },
  { id: "local-friend", icon: "🤝", name: tr("Mahalliy do'st", "Local Friend", "Местный друг"), desc: tr("Mahalliy odam bilan uchrashing", "Meet a local and get their secret word", "Встретьтесь с местным и узнайте секретное слово") },
  { id: "treasure-hunter", icon: "🧭", name: tr("Xazina ovchisi", "Treasure Hunter", "Охотник за сокровищами"), desc: tr("Xazina ovini yakunlang", "Finish a treasure hunt", "Завершите охоту за сокровищем") },
  { id: "first-deal", icon: "🎟️", name: tr("Birinchi sovg'a", "First Deal", "Первая скидка"), desc: tr("Birinchi kuponingizni oching", "Unlock your first coupon", "Откройте первый купон") },
  { id: "courier", icon: "✉️", name: tr("Chopar", "The Courier", "Курьер"), desc: tr("Toshkent hikoyasini yakunlang", "Finish the Tashkent story", "Завершите историю Ташкента") },
  { id: "star-keeper", icon: "🌌", name: tr("Yulduz qo'riqchisi", "Star Keeper", "Хранитель звёзд"), desc: tr("Samarqand hikoyasini yakunlang", "Finish the Samarkand story", "Завершите историю Самарканда") }
];

export const BADGES = [
  { id: "first-quest", icon: "✨", name: tr("Birinchi qadam", "First Step", "Первый шаг"), desc: tr("Birinchi kvestni bajaring", "Complete your first quest", "Выполните первый квест") },
  { id: "first-place", icon: "🏅", name: tr("Birinchi bob", "First Chapter", "Первая глава"), desc: tr("Bitta joyni to'liq yakunlang", "Finish every quest at one place", "Завершите все квесты в одном месте") },
  { id: "tashkent", icon: "🏙️", name: tr("Poytaxt bilimdoni", "Capital Insider", "Знаток столицы"), desc: tr("Toshkentni to'liq zabt eting", "Conquer all of Tashkent", "Покорите весь Ташкент") },
  { id: "samarkand", icon: "🕌", name: tr("Samarqand sirdoshi", "Keeper of Samarkand", "Хранитель Самарканда"), desc: tr("Samarqandni to'liq zabt eting", "Conquer all of Samarkand", "Покорите весь Самарканд") },
  { id: "silk-road", icon: "🐫", name: tr("Ipak yo'li sayyohi", "Silk Road Voyager", "Путник Шёлкового пути"), desc: tr("Ikkala shaharni zabt eting", "Conquer both cities", "Покорите оба города") },
  { id: "foodie", icon: "🍛", name: tr("Dasturxon ustasi", "Dastarkhan Master", "Мастер дастархана"), desc: tr("Barcha ta'm kvestlarini bajaring", "Complete every taste quest", "Выполните все вкусовые квесты") },
  { id: "scholar", icon: "🎓", name: tr("Ulug'bek shogirdi", "Ulugh Beg's Student", "Ученик Улугбека"), desc: tr("6 ta viktorina yoki topishmoqni yeching", "Solve 6 quizzes or riddles", "Решите 6 викторин или загадок") },
  { id: "photographer", icon: "📸", name: tr("Kadr ovchisi", "Frame Hunter", "Охотник за кадрами"), desc: tr("5 ta foto nuqtani suratga oling", "Shoot 5 photo spots", "Снимите 5 фото-точек") },
  { id: "unplugged", icon: "🌙", name: tr("Hozir va shu yerda", "Present Moment", "Здесь и сейчас"), desc: tr("Raqamli detoksni bajaring", "Finish a digital detox", "Завершите цифровой детокс") }
];

export const LEVELS = [
  { xp: 0, title: tr("Sayyoh", "Wanderer", "Странник") },
  { xp: 200, title: tr("Yo'lovchi", "Traveller", "Путешественник") },
  { xp: 550, title: tr("Izquvar", "Pathfinder", "Следопыт") },
  { xp: 1000, title: tr("Karvon a'zosi", "Caravaneer", "Караванщик") },
  { xp: 1600, title: tr("Karvonboshi", "Caravan Leader", "Караван-баши") },
  { xp: 2400, title: tr("Ipak yo'li ritsari", "Silk Road Knight", "Рыцарь Шёлкового пути") },
  { xp: 3400, title: tr("Afsonaviy kashfiyotchi", "Legendary Explorer", "Легендарный исследователь") }
];
