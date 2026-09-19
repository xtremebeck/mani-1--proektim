// Offline fallback for Hamroh: keyword intents answered from local content.
// Used when there is no network or the server has no Claude credentials.

const TIPS = {
  food: {
    tashkent: {
      uz: "Toshkentda albatta palov (tushlikkacha — kechga qolsa tugaydi), Chorsudagi tandir somsa, lag'mon va norin tatib ko'ring. Ko'k choy — har bir taomning hamrohi.",
      en: "In Tashkent try plov (it's a lunch dish — kazans run out by afternoon), tandir somsa at Chorsu, lagman and norin. Green tea goes with everything.",
      ru: "В Ташкенте обязательно попробуйте плов (это обеденное блюдо — к вечеру казаны пустеют), тандырную самсу на Чорсу, лагман и нарын. Зелёный чай — ко всему."
    },
    samarkand: {
      uz: "Samarqandda mashhur Samarqand noni, Samarqand palovi (qatlam-qatlam, aralashtirilmaydi) va shashlik tatib ko'ring. Siyob bozorida quruq mevalarni sinab ko'ring.",
      en: "In Samarkand try the famous Samarkand bread, Samarkand-style plov (layered, not mixed) and shashlik. Sample dried fruit at Siab Bazaar.",
      ru: "В Самарканде попробуйте знаменитую самаркандскую лепёшку, самаркандский плов (слоями, не перемешивают) и шашлык. На Сиабском базаре — сухофрукты."
    }
  },
  transport: {
    tashkent: {
      uz: "Toshkent metrosi arzon va chiroyli — bekatlarning o'zi muzey. Taksi uchun Yandex Go ilovasidan foydalaning. Samarqandga Afrosiyob tezyurar poyezdi taxminan 2 soatda yetkazadi.",
      en: "The Tashkent metro is cheap and beautiful — the stations are museums. For taxis use the Yandex Go app. The Afrosiyob fast train reaches Samarkand in about 2 hours.",
      ru: "Ташкентское метро дешёвое и красивое — станции как музеи. Такси — через приложение Yandex Go. Скоростной поезд «Афросиаб» довезёт до Самарканда примерно за 2 часа."
    },
    samarkand: {
      uz: "Samarqand markazi piyoda yurish uchun qulay: Registon — Bibixonim — Siyob — Shohi Zinda bir yo'lda. Rasadxona va Konigilga Yandex Go taksida boring.",
      en: "Central Samarkand is walkable: Registan → Bibi-Khanym → Siab → Shah-i-Zinda sit on one line. Take a Yandex Go taxi to the Observatory and Konigil.",
      ru: "Центр Самарканда удобно обходить пешком: Регистан → Биби-Ханым → Сиаб → Шахи-Зинда на одной линии. До обсерватории и Конигила — такси Yandex Go."
    }
  },
  money: {
    uz: "Valyuta — so'm. Katta do'kon va restoranlarda karta ishlaydi, bozor va taksida naqd pul qulayroq. Bankomatlar shahar markazida ko'p.",
    en: "The currency is the so'm. Cards work in larger shops and restaurants; bazaars and street food prefer cash. ATMs are common in city centres.",
    ru: "Валюта — сум. Карты принимают в крупных магазинах и ресторанах, на базаре и в такси удобнее наличные. Банкоматов в центре много."
  },
  etiquette: {
    uz: "Masjid va maqbaralarga kirishda yelka va tizzalarni yoping, ayollar ro'mol olishi tavsiya etiladi. Non hurmat qilinadi — uni teskari qo'ymang. Odamlarni suratga olishdan oldin ruxsat so'rang.",
    en: "Cover shoulders and knees at mosques and mausoleums; women may want a scarf. Bread is respected — never place it upside down. Ask before photographing people.",
    ru: "В мечетях и мавзолеях закрывайте плечи и колени, женщинам стоит взять платок. Хлеб уважают — не кладите его вверх дном. Спрашивайте разрешения, прежде чем фотографировать людей."
  },
  hello: {
    uz: "Va alaykum assalom! Keyingi nuqta, joy tarixi, taom yoki transport haqida so'rashingiz mumkin.",
    en: "Salom! You can ask me about your next stop, a place's story, food or getting around.",
    ru: "Салам! Спросите меня о следующей точке, истории места, еде или транспорте."
  },
  fallback: {
    uz: "Buni aniq bilmayman, lekin keyingi nuqta, joy tarixi, taom, transport, pul yoki odob-axloq haqida yordam bera olaman.",
    en: "I'm not sure about that one, but I can help with your next stop, a place's story, food, transport, money or etiquette.",
    ru: "Точно не знаю, но могу помочь со следующей точкой, историей места, едой, транспортом, деньгами или этикетом."
  },
  done: {
    uz: "Siz bu shahardagi barcha sarguzashtlarni yakunladingiz! Profil bo'limida mukofotingizni oling.",
    en: "You've finished every adventure in this city! Claim your reward in your Profile.",
    ru: "Вы прошли все приключения в этом городе! Заберите награду в Профиле."
  }
};

const INTENTS = [
  ["next", /next|where|keyingi|qayer|qaerda|следующ|где|куда/i],
  ["story", /story|history|tarix|hikoya|истори|расскаж/i],
  ["food", /food|eat|hungry|plov|palov|ovqat|taom|yeyish|non\b|еда|есть|поесть|плов|кушать|попробовать/i],
  ["transport", /transport|taxi|metro|train|get around|bus|taksi|poyezd|avtobus|borsam|такси|метро|поезд|добрат|автобус/i],
  ["money", /money|cash|card|atm|pul|karta|naqd|so'm|деньг|карт|налич|банкомат|сум/i],
  ["etiquette", /etiquette|dress|wear|mosque|custom|kiyim|odob|masjid|одежд|этикет|мечет|обыча/i],
  ["hello", /^(hi|hello|hey|salom|assalom|привет|здравств|салам)/i]
];

const formatDistance = (meters) => (meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`);

export function localGuideReply({ message, lang, city, next, last, distance }) {
  const pick = (value) => value?.[lang] ?? value?.en;
  const intent = INTENTS.find(([, pattern]) => pattern.test(message))?.[0] ?? "fallback";
  if (intent === "next") {
    if (!next) return pick(TIPS.done);
    const away = distance != null ? ` (${formatDistance(distance)})` : "";
    return `${pick(next.name)}${away}. ${pick(next.tip)}`;
  }
  if (intent === "story") {
    const stop = next ?? last;
    return stop ? `${pick(stop.name)}: ${pick(stop.story)}` : pick(TIPS.fallback);
  }
  if (intent === "food" || intent === "transport") return pick(TIPS[intent][city.id]);
  return pick(TIPS[intent]);
}
