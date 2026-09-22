import 'dotenv/config'

import { createPrisma } from '../src/db'

const prisma = createPrisma(
  process.env.DATABASE_URL ??
    'postgresql://superuser:superpassword@localhost:54329/opora?schema=public',
)

type CardSeed = {
  code: string
  title: string
  summary: string
  category:
    | 'grounding'
    | 'movement'
    | 'starting'
    | 'rest'
    | 'pleasant'
    | 'connection'
    | 'attention'
    | 'reflection'
  tags: string[]
  estimatedMinutes: number
  effort: 'low' | 'medium'
  contexts: string[]
  requirements: string[]
  exclusions: string[]
  steps: { text: string; seconds?: number }[]
  easierVariant: string
  stopGuidance?: string
}

const SOURCE_NOTE =
  'Составлено по редакционному плану владельца (задание §21). Клиническая проверка не проводилась; карточка не является медицинской рекомендацией.'

const cards: CardSeed[] = [
  // --- Ориентация и короткая пауза (grounding) -------------------------------
  {
    code: 'P01',
    title: 'Один предмет рядом',
    summary: 'Выбери нейтральный предмет и ненадолго задержи на нём внимание.',
    category: 'grounding',
    tags: ['пауза', 'внимание'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Оглянись и выбери любой нейтральный предмет рядом с собой.' },
      { text: 'Рассмотри его цвет, форму и материал — без спешки.' },
      { text: 'Когда внимание уходит, просто верни его к предмету.' },
    ],
    easierVariant: 'Заметить один признак предмета — например, только цвет.',
    stopGuidance: 'Если трудно сосредоточиться — достаточно просто посмотреть.',
  },
  {
    code: 'P02',
    title: 'Три спокойных ориентира',
    summary: 'Найди три предмета, на которых взгляду удобно остановиться.',
    category: 'grounding',
    tags: ['пауза', 'внимание'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'standing', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Медленно осмотрись вокруг.' },
      { text: 'Найди первый предмет, на котором взгляд отдыхает.' },
      { text: 'Повтори ещё с двумя предметами.' },
    ],
    easierVariant: 'Найти один такой предмет вместо трёх.',
  },
  {
    code: 'P03',
    title: 'Опора под тобой',
    summary: 'Заметь точки соприкосновения тела со стулом и полом.',
    category: 'grounding',
    tags: ['тело', 'пауза'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Не меняя позу, обрати внимание на стопы.' },
      { text: 'Заметь, где стул касается спины и бёдер.' },
      { text: 'Побудь с этим ощущением несколько секунд.' },
    ],
    easierVariant: 'Просто выбрать более удобное положение тела.',
    stopGuidance: 'Через дискомфорт позу менять не нужно.',
  },
  {
    code: 'P04',
    title: 'Вернуться в комнату',
    summary: 'Назови про себя, где ты и что вокруг.',
    category: 'grounding',
    tags: ['ориентация'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'outside', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Скажи про себя, в какой комнате или месте ты находишься.' },
      { text: 'Заметь один предмет вокруг.' },
    ],
    easierVariant: 'Отметить место и один предмет.',
  },
  {
    code: 'P05',
    title: 'Минута без следующей задачи',
    summary: 'Ненадолго отложи решение следующего дела.',
    category: 'grounding',
    tags: ['пауза', 'границы'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Разреши себе не решать сейчас следующее дело.' },
      { text: 'Выбери удобное положение.' },
      { text: 'Побудь в паузе до минуты.', seconds: 60 },
    ],
    easierVariant: 'Пауза длиной 20 секунд.',
  },
  {
    code: 'P06',
    title: 'Заметить обычный звук',
    summary: 'Обрати внимание на нейтральный звук вокруг.',
    category: 'grounding',
    tags: ['пауза', 'звук'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Прислушайся: какой звук есть рядом — тихий и нейтральный?' },
      { text: 'Побудь с этим звуком несколько секунд.' },
    ],
    easierVariant: 'Посмотреть на неподвижный предмет вместо звука.',
    stopGuidance: 'Резкие звуки использовать не нужно — только нейтральные.',
  },
  // --- Доступное движение (movement) ------------------------------------------
  {
    code: 'P07',
    title: 'Сменить положение',
    summary: 'Выбери более удобное положение тела.',
    category: 'movement',
    tags: ['тело'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Заметь, как тело расположено сейчас.' },
      { text: 'Выбери положение чуть удобнее — можно встать.' },
    ],
    easierVariant: 'Поправить положение, оставаясь сидя.',
  },
  {
    code: 'P08',
    title: 'Несколько шагов дома',
    summary: 'Коротко пройдись в безопасном пространстве.',
    category: 'movement',
    tags: ['движение', 'дом'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'standing'],
    requirements: [],
    exclusions: ['seated'],
    steps: [
      { text: 'Встань, если это доступно.' },
      { text: 'Пройдись в комфортном темпе столько, сколько удобно.' },
    ],
    easierVariant: 'Доступное движение сидя: стопы, плечи, кисти.',
    stopGuidance: 'Остановись при любом дискомфорте.',
  },
  {
    code: 'P09',
    title: 'Мягкое движение плеч',
    summary: 'Свободное движение плечами в комфортном диапазоне.',
    category: 'movement',
    tags: ['тело', 'пауза'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'standing'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Позволь плечам двигаться свободно, без усилия.' },
      { text: 'Несколько медленных движений в удобной амплитуде.' },
    ],
    easierVariant: 'Только сменить положение рук.',
    stopGuidance: 'Через боль и напряжение двигаться нельзя.',
  },
  {
    code: 'P10',
    title: 'Пауза для кистей',
    summary: 'Отпусти устройство и удобно расположи руки.',
    category: 'movement',
    tags: ['тело', 'телефон'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Положи телефон или отложи его.' },
      { text: 'Встряхни или мягко разомни кисти.' },
      { text: 'Оставь руки в удобном положении на полминуты.', seconds: 30 },
    ],
    easierVariant: 'Просто ослабить хват и удерживать телефон свободнее.',
  },
  {
    code: 'P11',
    title: 'Небольшой выход',
    summary: 'Короткая прогулка, если место и состояние позволяют.',
    category: 'movement',
    tags: ['движение', 'улица'],
    estimatedMinutes: 10,
    effort: 'medium',
    contexts: ['outside'],
    requirements: [],
    exclusions: ['seated'],
    steps: [
      { text: 'Выбери знакомый безопасный маршрут.' },
      { text: 'Прогуляйся в своём темпе — длительность по самочувствию.' },
    ],
    easierVariant: 'Посмотреть в окно или пройтись по дому.',
    stopGuidance: 'Вернись, когда почувствуешь усталость.',
  },
  {
    code: 'P12',
    title: 'Свой приятный способ двигаться',
    summary: 'Выбери знакомое движение без нормативов.',
    category: 'movement',
    tags: ['движение', 'приятное'],
    estimatedMinutes: 5,
    effort: 'medium',
    contexts: ['home', 'outside'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Вспомни движение, которое раньше было приятным.' },
      { text: 'Сделай его немного — без скорости и рекордов.' },
    ],
    easierVariant: 'Одно небольшое движение.',
  },
  // --- Начать дело (starting) ---------------------------------------------------
  {
    code: 'P13',
    title: 'Только первый шаг',
    summary: 'Назови одно физически выполнимое начало дела.',
    category: 'starting',
    tags: ['начало', 'дела'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выбери дело, которое сейчас важно.' },
      { text: 'Сформулируй первый шаг так, чтобы его можно было сделать физически.' },
      { text: 'Например: «открыть тетрадь», «включить kettle», «написать первую строку».' },
    ],
    easierVariant: 'Только сформулировать шаг, не делая его.',
  },
  {
    code: 'P14',
    title: 'Подготовить место',
    summary: 'Освободи небольшой участок для одного дела.',
    category: 'starting',
    tags: ['начало', 'порядок'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'workplace'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выбери поверхность для одного дела.' },
      { text: 'Убери с неё лишнее.' },
    ],
    easierVariant: 'Убрать один предмет.',
  },
  {
    code: 'P15',
    title: 'Открыть нужное',
    summary: 'Открой документ или инструмент — без требования продолжать.',
    category: 'starting',
    tags: ['начало', 'дела'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Найди документ, книгу или инструмент для дела.' },
      { text: 'Открой и оставь перед собой.' },
    ],
    easierVariant: 'Найти нужный файл или предмет, не открывая.',
  },
  {
    code: 'P16',
    title: 'Две минуты начала',
    summary: 'Попробуй выбранный шаг две минуты.',
    category: 'starting',
    tags: ['начало', 'таймер'],
    estimatedMinutes: 2,
    effort: 'medium',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Запусти таймер на две минуты.', seconds: 120 },
      { text: 'Делай выбранный шаг.' },
      { text: 'Когда время выйдет — реши, продолжать или остановиться.' },
    ],
    easierVariant: 'Таймер на 30 секунд.',
    stopGuidance: 'Остановиться после таймера — нормальный результат.',
  },
  {
    code: 'P17',
    title: 'Сократить список',
    summary: 'Выбери одно важное сейчас, остальное — в отдельный список.',
    category: 'starting',
    tags: ['дела', 'приоритеты'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выпиши всё, что кажется нужным.' },
      { text: 'Отметь одно, что важно сейчас.' },
      { text: 'Остальное перенеси в отдельный список «позже».' },
    ],
    easierVariant: 'Вычеркнуть одну необязательную задачу.',
  },
  {
    code: 'P18',
    title: 'Достаточно на сегодня',
    summary: 'Определи небольшой приемлемый результат и точку остановки.',
    category: 'starting',
    tags: ['границы', 'дела'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Спроси себя: какой результат на сегодня будет достаточным?' },
      { text: 'Запиши точку, где сегодня остановишься.' },
    ],
    easierVariant: 'Назвать только точку остановки.',
  },
  // --- Отдых и вечер (rest) -----------------------------------------------------
  {
    code: 'P19',
    title: 'Закрыть рабочий день',
    summary: 'Отметь завершённое и запиши один шаг на завтра.',
    category: 'rest',
    tags: ['вечер', 'работа'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'workplace', 'evening'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Назови про себя одно завершённое сегодня.' },
      { text: 'Запиши один следующий шаг на завтра.' },
      { text: 'Закрой рабочие окна и вкладки, если день закончился.' },
    ],
    easierVariant: 'Закрыть одно рабочее окно.',
  },
  {
    code: 'P20',
    title: 'Мысль на завтра',
    summary: 'Кратко запиши мысль, к которой вернёшься позже.',
    category: 'rest',
    tags: ['вечер', 'запись'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'evening', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Заметить мысль, которая крутится.' },
      { text: 'Записать её одной фразой — «вернусь завтра».' },
    ],
    easierVariant: 'Записать одно слово.',
  },
  {
    code: 'P21',
    title: 'Подготовить спокойное место',
    summary: 'Уменьши один раздражающий фактор вокруг.',
    category: 'rest',
    tags: ['вечер', 'среда'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'evening'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Оглянись: что мешает спокойствию — свет, шум, беспорядок?' },
      { text: 'Уменьши один фактор, если это доступно.' },
    ],
    easierVariant: 'Поправить один предмет.',
  },
  {
    code: 'P22',
    title: 'Отдых без плана улучшения',
    summary: 'Выбери знакомый спокойный отдых на несколько минут.',
    category: 'rest',
    tags: ['отдых'],
    estimatedMinutes: 10,
    effort: 'low',
    contexts: ['home', 'evening', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Вспомни свой спокойный способ отдыхать.' },
      { text: 'Проведи так несколько минут — без цели «восстановиться».' },
    ],
    easierVariant: 'Минутная пауза без занятия.',
  },
  {
    code: 'P23',
    title: 'Небольшой вечерний ритуал',
    summary: 'Выбери одно повторяемое приятное действие перед отдыхом.',
    category: 'rest',
    tags: ['вечер', 'ритуал'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'evening'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выбери простое приятное действие: чай, тёплый свет, растяжка.' },
      { text: 'Сделай его не спеша.' },
    ],
    easierVariant: 'Только подготовить его.',
  },
  {
    code: 'P24',
    title: 'Что можно оставить',
    summary: 'Назови необязательное дело, которое сегодня можно не делать.',
    category: 'rest',
    tags: ['границы', 'вечер'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'evening', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Посмотри на планы на остаток дня.' },
      { text: 'Выбери одно необязательное — и оставь его.' },
    ],
    easierVariant: 'Выбрать из готовых примеров: уборка, лишняя задача, лишняя проверка новостей.',
  },
  // --- Приятное и осмысленное (pleasant) ----------------------------------------
  {
    code: 'P25',
    title: 'Маленькое приятное',
    summary: 'Выбери знакомое короткое занятие без ожидания радости.',
    category: 'pleasant',
    tags: ['приятное'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Вспомни 2–3 коротких приятных занятия.' },
      { text: 'Выбери одно и сделай немного.' },
    ],
    easierVariant: 'Только выбрать и записать на потом.',
  },
  {
    code: 'P26',
    title: 'Один любимый фрагмент',
    summary: 'Музыка, текст или изображение по своему выбору.',
    category: 'pleasant',
    tags: ['приятное', 'музыка'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'outside', 'sound'],
    requirements: [],
    exclusions: ['no-sound'],
    steps: [
      { text: 'Выбери любимый фрагмент — трек, стих, картинку.' },
      { text: 'Проведи с ним пару минут внимательно.' },
    ],
    easierVariant: 'Короткий фрагмент без звука.',
  },
  {
    code: 'P27',
    title: 'Сделать что-то руками',
    summary: 'Небольшой бытовой или творческий шаг.',
    category: 'pleasant',
    tags: ['руки', 'творчество'],
    estimatedMinutes: 10,
    effort: 'medium',
    contexts: ['home'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выбери простое занятие руками: заварить, починить, порисовать.' },
      { text: 'Сделай небольшой кусочек.' },
    ],
    easierVariant: 'Подготовить материалы.',
  },
  {
    code: 'P28',
    title: 'Посмотреть на живое',
    summary: 'Растение, дерево за окном или доступное наблюдение.',
    category: 'pleasant',
    tags: ['природа', 'приятное'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'outside', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Найди живое рядом: растение, дерево, небо.' },
      { text: 'Посмотри несколько секунд без спешки.' },
    ],
    easierVariant: 'Выбрать изображение природы.',
  },
  {
    code: 'P29',
    title: 'Что для меня важно',
    summary: 'Назови одну важную область и малый шаг к ней.',
    category: 'pleasant',
    tags: ['смысл', 'рефлексия'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Спроси: что сейчас по-настоящему важно?' },
      { text: 'Назови одну область.' },
      { text: 'Предложи себе маленький шаг к ней.' },
    ],
    easierVariant: 'Только назвать область.',
  },
  {
    code: 'P30',
    title: 'Вернуть старое интересное',
    summary: 'Вспомни занятие, которое раньше нравилось.',
    category: 'pleasant',
    tags: ['интересы'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Вспомни занятие, которое раньше приносило интерес.' },
      { text: 'Попробуй его малую часть.' },
    ],
    easierVariant: 'Сохранить идею на потом.',
  },
  // --- Контакт и границы (connection) ---------------------------------------------
  {
    code: 'P31',
    title: 'Короткое сообщение',
    summary: 'Напиши безопасному знакомому без ожидания ответа.',
    category: 'connection',
    tags: ['люди', 'общение'],
    estimatedMinutes: 3,
    effort: 'medium',
    contexts: ['home', 'outside', 'sitting'],
    requirements: [],
    exclusions: ['no-social'],
    steps: [
      { text: 'Выбери человека, которому написать безопасно.' },
      { text: 'Отправь короткое сообщение — без требования ответить сразу.' },
    ],
    easierVariant: 'Черновик сообщения без отправки.',
    stopGuidance: 'Если никто не подходит — пропусти карточку.',
  },
  {
    code: 'P32',
    title: 'Попросить о малом',
    summary: 'Сформулируй конкретную небольшую просьбу.',
    category: 'connection',
    tags: ['люди', 'просьбы'],
    estimatedMinutes: 3,
    effort: 'medium',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: ['no-social'],
    steps: [
      { text: 'Определи, какая помощь нужна — конкретно.' },
      { text: 'Сформулируй просьбу одной фразой подходящему человеку.' },
    ],
    easierVariant: 'Только определить, какая помощь нужна.',
  },
  {
    code: 'P33',
    title: 'Поддерживающая фраза',
    summary: 'Выбери фразу, которую комфортно сказать себе.',
    category: 'connection',
    tags: ['поддержка', 'самолюбие'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'sitting', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Выбери фразу поддержки, которая не спорит с тобой.' },
      { text: 'Повтори её один раз спокойно.' },
    ],
    easierVariant: 'Нейтрально описать происходящее вместо фразы.',
    stopGuidance: 'Не нужно заставлять себя верить фразе.',
  },
  {
    code: 'P34',
    title: 'Разрешить себе отказ',
    summary: 'Подготовь спокойную формулировку отказа.',
    category: 'connection',
    tags: ['границы', 'общение'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Вспомни необязательное, на которое не хочется соглашаться.' },
      { text: 'Составь спокойный отказ одной фразой.' },
    ],
    easierVariant: 'Сохранить заготовку отказа.',
  },
  {
    code: 'P35',
    title: 'Вспомнить доступную опору',
    summary: 'Человек, место, действие или ресурс, к которым можно обратиться.',
    category: 'connection',
    tags: ['поддержка', 'опоры'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Назови свои опоры: люди, места, действия, ресурсы.' },
      { text: 'Выбери одну, которая сейчас доступнее остальных.' },
    ],
    easierVariant: 'Выбрать один ресурс из готового списка.',
  },
  {
    code: 'P36',
    title: 'Небольшой совместный момент',
    summary: 'Предложи безопасному человеку короткое совместное занятие.',
    category: 'connection',
    tags: ['люди', 'общение'],
    estimatedMinutes: 5,
    effort: 'medium',
    contexts: ['home', 'outside'],
    requirements: [],
    exclusions: ['no-social'],
    steps: [
      { text: 'Выбери короткое совместное занятие: чай, прогулка, серия.' },
      { text: 'Предложи его подходящему человеку.' },
    ],
    easierVariant: 'Выбрать занятие без отправки приглашения.',
  },
  // --- Внимание и телефон (attention) ----------------------------------------------
  {
    code: 'P37',
    title: 'Зачем я открыл телефон',
    summary: 'Заметь намерение перед следующим действием.',
    category: 'attention',
    tags: ['телефон', 'скроллинг'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'outside', 'workplace'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Остановись на секунду после разблокировки.' },
      { text: 'Спроси: зачем я открыл телефон сейчас?' },
    ],
    easierVariant: 'Выбрать ответ «пока не знаю».',
  },
  {
    code: 'P38',
    title: 'Одна вкладка',
    summary: 'Оставь перед собой только нужный экран.',
    category: 'attention',
    tags: ['фокус', 'телефон'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Закрой лишние вкладки и окна.' },
      { text: 'Оставь одну, которая нужна текущему делу.' },
    ],
    easierVariant: 'Просто выбрать главное окно.',
  },
  {
    code: 'P39',
    title: 'Телефон на паузу',
    summary: 'Ненадолго положи устройство в удобное место.',
    category: 'attention',
    tags: ['телефон', 'пауза'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'workplace'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Положи телефон экраном вниз или рядом.' },
      { text: 'Побудь без него 30 секунд.', seconds: 30 },
    ],
    easierVariant: 'Перевернуть экран на 30 секунд.',
  },
  {
    code: 'P40',
    title: 'Осознанное продолжение',
    summary: 'Реши, что именно смотреть и когда закончить.',
    category: 'attention',
    tags: ['скроллинг', 'намерение'],
    estimatedMinutes: 1,
    effort: 'low',
    contexts: ['home', 'outside'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Назови, что хочешь посмотреть.' },
      { text: 'Назови момент, когда закончишь.' },
    ],
    easierVariant: 'Выбрать только цель просмотра.',
  },
  {
    code: 'P41',
    title: 'Перерыв без ленты',
    summary: 'Замени привычный скроллинг короткой альтернативой.',
    category: 'attention',
    tags: ['скроллинг', 'перерыв'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'workplace'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Заметив тягу открыть ленту, выбери альтернативу: вода, окно, пауза.' },
      { text: 'Проведи перерыв с ней.' },
    ],
    easierVariant: 'Один нейтральный взгляд вокруг.',
  },
  {
    code: 'P42',
    title: 'Упростить один сигнал',
    summary: 'Проверь одно ненужное уведомление в настройках.',
    category: 'attention',
    tags: ['телефон', 'уведомления'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Заметь уведомление, которое чаще всего отвлекает.' },
      { text: 'Проверь в настройках устройства, можно ли его отключить.' },
    ],
    easierVariant: 'Записать, какое уведомление мешает.',
  },
  // --- Мысли и рефлексия (reflection) ------------------------------------------------
  {
    code: 'P43',
    title: 'Назвать происходящее',
    summary: 'Коротко опиши состояние без оценки характера.',
    category: 'reflection',
    tags: ['рефлексия', 'состояние'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'workplace', 'sitting', 'no-sound'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Спроси: что со мной сейчас происходит?' },
      { text: 'Опиши это нейтрально, как наблюдатель.' },
    ],
    easierVariant: 'Выбрать два слова из списка: усталость, тревога, пустота, спокойствие.',
  },
  {
    code: 'P44',
    title: 'Мысль и факт',
    summary: 'Запиши мысль и отдельно то, что точно известно.',
    category: 'reflection',
    tags: ['рефлексия', 'мысли'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Запиши мысль, которая занимает.' },
      { text: 'Рядом запиши только факты, которые точно известны.' },
      { text: 'Не спорь с собой — просто раздели.' },
    ],
    easierVariant: 'Отметить про мысль: «это мысль».',
  },
  {
    code: 'P45',
    title: 'Что в моей зоне влияния',
    summary: 'Раздели ситуацию на доступный шаг и остальное.',
    category: 'reflection',
    tags: ['рефлексия', 'контроль'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Опиши ситуацию одной фразой.' },
      { text: 'Выпиши: что в ней доступно тебе.' },
      { text: 'Отдельно: что сейчас не контролируется.' },
    ],
    easierVariant: 'Выбрать один доступный шаг.',
  },
  {
    code: 'P46',
    title: 'Что сегодня поддержало',
    summary: 'Отметь один поддержавший момент, если он был.',
    category: 'reflection',
    tags: ['рефлексия', 'поддержка'],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: ['home', 'evening', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Пройдись по дню: что дало немного сил или тепла?' },
      { text: 'Отметь один момент.' },
    ],
    easierVariant: 'Ответ «сегодня не заметил» — тоже честный ответ.',
  },
  {
    code: 'P47',
    title: 'Что можно упростить',
    summary: 'Уменьши одно требование к следующему дню.',
    category: 'reflection',
    tags: ['рефлексия', 'границы'],
    estimatedMinutes: 3,
    effort: 'low',
    contexts: ['home', 'evening', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Посмотри на планы завтра.' },
      { text: 'Найди одно требование, которое можно смягчить.' },
    ],
    easierVariant: 'Убрать один необязательный пункт.',
  },
  {
    code: 'P48',
    title: 'Моя личная инструкция',
    summary: 'Сохрани 2–3 действия, к которым удобно вернуться.',
    category: 'reflection',
    tags: ['избранное', 'рефлексия'],
    estimatedMinutes: 5,
    effort: 'low',
    contexts: ['home', 'sitting'],
    requirements: [],
    exclusions: [],
    steps: [
      { text: 'Просмотри, что помогало в последнее время.' },
      { text: 'Выбери 2–3 действия.' },
      { text: 'Сохрани их в избранное — это твоя личная инструкция.' },
    ],
    easierVariant: 'Сохранить одно избранное.',
  },
]

type ProgramSeed = {
  code: string
  title: string
  goal: string
  audience: string
  days: {
    dayNumber: number
    intro: string
    practiceCode?: string
    customStep?: { kind: string; title: string; description: string }
    question?: string
    alternative?: string
  }[]
}

const programs: ProgramSeed[] = [
  {
    code: 'start-small',
    title: 'Начать с малого',
    goal: 'Познакомиться с посильными действиями за 7 дней без обязательной нормы.',
    audience: 'Тем, кому трудно начинать и хочется мягкого входа.',
    days: [
      { dayNumber: 1, intro: 'Начнём с самого простого — заметить один предмет рядом.', practiceCode: 'P01', question: 'Какой размер шага сегодня подходит?' },
      { dayNumber: 2, intro: 'Сегодня определим первый шаг одного дела.', practiceCode: 'P13', question: 'Что помогло сделать шаг меньше?' },
      { dayNumber: 3, intro: 'Немного приятного — без ожидания радости.', practiceCode: 'P25', question: 'Хотелось бы повторить?' },
      { dayNumber: 4, intro: 'Найдём удобное движение для тела.', practiceCode: 'P07', question: 'Какой вариант движения был доступен?' },
      { dayNumber: 5, intro: 'Освободим немного места в дне.', practiceCode: 'P24', question: 'Что освободилось после этого?' },
      { dayNumber: 6, intro: 'Заметь, что уже поддерживает тебя.', practiceCode: 'P35', question: 'К чему удобно вернуться?' },
      { dayNumber: 7, intro: 'Соберём личный набор из того, что подошло.', practiceCode: 'P48', question: 'Что осталось с тобой после недели?' },
    ],
  },
  {
    code: 'less-overload',
    title: 'Меньше перегрузки',
    goal: 'Сократить лишние требования и паузы в течение 7 дней.',
    audience: 'Тем, кто чувствует, что задач и стимулов слишком много.',
    days: [
      { dayNumber: 1, intro: 'Сначала — назвать состояние как есть.', practiceCode: 'P43', question: 'Как звучит состояние сегодня?' },
      { dayNumber: 2, intro: 'Короткая пауза без следующей задачи.', practiceCode: 'P05' },
      { dayNumber: 3, intro: 'Уменьшим список дел.', practiceCode: 'P17' },
      { dayNumber: 4, intro: 'Подготовим спокойную границу.', practiceCode: 'P34' },
      { dayNumber: 5, intro: 'Уберём один раздражитель вокруг.', practiceCode: 'P21' },
      { dayNumber: 6, intro: 'Отделим доступное влияние от остального.', practiceCode: 'P45' },
      { dayNumber: 7, intro: 'Упростим следующую неделю.', practiceCode: 'P47', question: 'Что упростить в первую очередь?' },
    ],
  },
  {
    code: 'return-motion',
    title: 'Возвращаю движение',
    goal: 'Вернуть доступную повседневную активность без интенсивности.',
    audience: 'Тем, кто хочет мягко вернуть движение в жизнь.',
    days: [
      { dayNumber: 1, intro: 'Начнём со смены положения.', practiceCode: 'P07' },
      { dayNumber: 2, intro: 'Дадим рукам паузу от устройства.', practiceCode: 'P10' },
      { dayNumber: 3, intro: 'Немного перемещения — дома.', practiceCode: 'P08' },
      { dayNumber: 4, intro: 'Мягко подвигаем плечами.', practiceCode: 'P09' },
      { dayNumber: 5, intro: 'Свой вариант приятного движения.', practiceCode: 'P12' },
      { dayNumber: 6, intro: 'Короткий выход — или домашняя альтернатива.', practiceCode: 'P11', alternative: 'P08' },
      { dayNumber: 7, intro: 'Повтори наиболее посильное действие и сохрани его как опору.', customStep: { kind: 'repeat-and-save', title: 'Повтор и сохранение', description: 'Выбери действие недели, которое было посильным, и сохрани его в избранное или как опору дня.' } },
    ],
  },
  {
    code: 'calmer-evenings',
    title: 'Спокойнее к вечеру',
    goal: 'Подготовить условия для отдыха вечером в течение 7 дней.',
    audience: 'Тем, кому трудно завершать день и замедляться.',
    days: [
      { dayNumber: 1, intro: 'Заверши рабочий день осознанно.', practiceCode: 'P19' },
      { dayNumber: 2, intro: 'Оставь мысль на завтра.', practiceCode: 'P20' },
      { dayNumber: 3, intro: 'Подготовь спокойное место.', practiceCode: 'P21' },
      { dayNumber: 4, intro: 'Выбери отдых без цели.', practiceCode: 'P22' },
      { dayNumber: 5, intro: 'Откажись от лишнего.', practiceCode: 'P24' },
      { dayNumber: 6, intro: 'Собери небольшой ритуал.', practiceCode: 'P23' },
      { dayNumber: 7, intro: 'Сохрани свой вечерний набор из 1–2 действий.', customStep: { kind: 'save-evening-set', title: 'Вечерний набор', description: 'Выбери 1–2 вечерних действия этой недели и сохрани их как опоры вечера.' } },
    ],
  },
  {
    code: 'soft-focus',
    title: 'Мягкий фокус',
    goal: 'Научиться начинать дела и работать короткими интервалами.',
    audience: 'Тем, кому трудно входить в задачи.',
    days: [
      { dayNumber: 1, intro: 'Первый шаг одного дела.', practiceCode: 'P13' },
      { dayNumber: 2, intro: 'Подготовим место.', practiceCode: 'P14' },
      { dayNumber: 3, intro: 'Откроем нужное — без продолжения.', practiceCode: 'P15' },
      { dayNumber: 4, intro: 'Две минуты начала.', practiceCode: 'P16' },
      { dayNumber: 5, intro: 'Один рабочий контекст.', practiceCode: 'P38' },
      { dayNumber: 6, intro: 'Короткая фокус-сессия по выбору — без обязательного увеличения времени.', customStep: { kind: 'focus-session', title: 'Фокус-сессия', description: 'Запусти фокус-сессию на удобное время: 5, 10 или 15 минут. Увеличивать длительность не обязательно.' } },
      { dayNumber: 7, intro: 'Определи достаточный результат и точку остановки.', practiceCode: 'P18' },
    ],
  },
  {
    code: 'more-pleasant',
    title: 'Больше приятного',
    goal: 'Вернуть небольшие приятные занятия в неделю.',
    audience: 'Тем, у кого приятного стало мало.',
    days: [
      { dayNumber: 1, intro: 'Выбери маленькое приятное.', practiceCode: 'P25' },
      { dayNumber: 2, intro: 'Один любимый фрагмент.', practiceCode: 'P26' },
      { dayNumber: 3, intro: 'Посмотри на живое.', practiceCode: 'P28' },
      { dayNumber: 4, intro: 'Небольшой шаг руками.', practiceCode: 'P27' },
      { dayNumber: 5, intro: 'Попробуй старое интересное.', practiceCode: 'P30' },
      { dayNumber: 6, intro: 'Совместный момент — или своя альтернатива.', practiceCode: 'P36', alternative: 'P25' },
      { dayNumber: 7, intro: 'Сохрани то, что хочется повторить — без требования почувствовать радость.', customStep: { kind: 'save-favorites', title: 'Сохранить приятное', description: 'Отметь занятия недели, которые хочешь повторить, и сохрани их в избранное.' } },
    ],
  },
  {
    code: 'scroll-pause',
    title: 'Пауза в скроллинге',
    goal: 'Наблюдать за автоматическим открытием телефона и выбирать альтернативы.',
    audience: 'Тем, кто замечает много автоматического скроллинга.',
    days: [
      { dayNumber: 1, intro: 'Заметить намерение открыть телефон.', practiceCode: 'P37' },
      { dayNumber: 2, intro: 'Выбрать цель просмотра заранее.', practiceCode: 'P40' },
      { dayNumber: 3, intro: 'Короткая пауза с телефоном в стороне.', practiceCode: 'P39' },
      { dayNumber: 4, intro: 'Попробовать альтернативу ленте.', practiceCode: 'P41' },
      { dayNumber: 5, intro: 'Заметить мешающий сигнал.', practiceCode: 'P42' },
      { dayNumber: 6, intro: 'Один нужный экран вместо многих.', practiceCode: 'P38' },
      { dayNumber: 7, intro: 'Составь собственное правило — без жёсткого запрета.', customStep: { kind: 'own-rule', title: 'Своё правило', description: 'Сформулируй одно мягкое правило про телефон и скроллинг на следующую неделю. Например: «перед лентой — один вдох и вопрос зачем».' } },
    ],
  },
  {
    code: 'own-rhythm',
    title: 'Свой устойчивый ритм',
    goal: 'Собрать устойчивый личный ритм из понравившихся опор за 14 дней.',
    audience: 'Тем, кто уже пробовал шаги и хочет закрепить своё.',
    days: [
      { dayNumber: 1, intro: 'Короткая отметка состояния и выбор одного направления.', customStep: { kind: 'checkin', title: 'Отметка состояния', description: 'Сделай короткую отметку: настроение, энергия, напряжение. Выбери одно направление на ближайшие дни.' } },
      { dayNumber: 2, intro: 'Посильный первый шаг.', practiceCode: 'P13' },
      { dayNumber: 3, intro: 'Доступное движение.', practiceCode: 'P07' },
      { dayNumber: 4, intro: 'Приятное занятие.', practiceCode: 'P25' },
      { dayNumber: 5, intro: 'Завершение дня.', practiceCode: 'P19' },
      { dayNumber: 6, intro: 'Личная опора.', practiceCode: 'P35' },
      { dayNumber: 7, intro: 'Обзор недели: что было удобно, что стоит убрать.', customStep: { kind: 'review', title: 'Обзор недели', description: 'Посмотри статистику недели и отметь: что было посильно, что хочется оставить.' } },
      { dayNumber: 8, intro: 'Создай одну опору в плане дня.', customStep: { kind: 'create-routine', title: 'Опора дня', description: 'Создай одну личную опору в плане дня — из каталога или свою короткую.' } },
      { dayNumber: 9, intro: 'Попробуй её облегчённый вариант.', customStep: { kind: 'try-easier', title: 'Облегчённая версия', description: 'Выполни опору в облегчённом варианте — так тоже считается.' } },
      { dayNumber: 10, intro: 'Уменьшим нагрузку.', practiceCode: 'P17' },
      { dayNumber: 11, intro: 'Повтори личное избранное.', customStep: { kind: 'repeat-favorite', title: 'Избранное', description: 'Выбери практику из избранного и повтори её.' } },
      { dayNumber: 12, intro: 'Упрости завтра.', practiceCode: 'P47' },
      { dayNumber: 13, intro: 'Собери личную инструкцию.', practiceCode: 'P48' },
      { dayNumber: 14, intro: 'Итог: выбери, что оставить — без обязательной новой программы.', customStep: { kind: 'finish', title: 'Итог программы', description: 'Подведи итог: что попробовано, что сохранено, что хочешь оставить с собой.' } },
    ],
  },
]

async function seedPractices() {
  for (const card of cards) {
    const practice = await prisma.practice.upsert({
      where: { code: card.code },
      create: { code: card.code },
      update: {},
    })
    const existing = await prisma.practiceVersion.findFirst({
      where: { practiceId: practice.id, version: 1 },
    })
    if (existing) continue
    await prisma.practiceVersion.create({
      data: {
        practiceId: practice.id,
        version: 1,
        title: card.title,
        summary: card.summary,
        category: card.category,
        tags: card.tags,
        estimatedMinutes: card.estimatedMinutes,
        effort: card.effort,
        contexts: card.contexts,
        requirements: card.requirements,
        exclusions: card.exclusions,
        steps: card.steps,
        easierVariant: card.easierVariant,
        alternativeCodes: [],
        stopGuidance: card.stopGuidance ?? null,
        sourceNotes: SOURCE_NOTE,
        // Owner-directed editorial plan (spec §21); each card's source note
        // records that no clinical review happened. Publishing is the owner's
        // documented decision at seed time.
        reviewStatus: 'published',
        publishedAt: new Date(),
      },
    })
  }
}

async function seedPrograms() {
  for (const program of programs) {
    const row = await prisma.program.upsert({
      where: { code: program.code },
      create: { code: program.code },
      update: {},
    })
    const existing = await prisma.programVersion.findFirst({
      where: { programId: row.id, version: 1 },
    })
    if (existing) continue
    const created = await prisma.programVersion.create({
      data: {
        programId: row.id,
        version: 1,
        title: program.title,
        goal: program.goal,
        audience: program.audience,
        daysCount: program.days.length,
        status: 'published',
        publishedAt: new Date(),
      },
    })
    for (const day of program.days) {
      await prisma.programDay.create({
        data: {
          programVersionId: created.id,
          dayNumber: day.dayNumber,
          intro: day.intro,
          practiceCode: day.practiceCode ?? null,
          alternativePracticeCode: day.alternative ?? null,
          customStep: day.customStep ?? undefined,
          question: day.question ?? null,
        },
      })
    }
  }
}

async function seedSupportResources() {
  // Honest default: no verified hotlines are published by the app without the
  // owner's review. One draft row documents the RU emergency number for the
  // owner to verify and publish from the admin surface when it exists.
  const existing = await prisma.supportResource.findFirst({
    where: { country: 'RU' },
  })
  if (!existing) {
    await prisma.supportResource.create({
      data: {
        country: 'RU',
        title: 'Единый номер экстренных служб',
        orgUrl: 'https://ru.wikipedia.org/wiki/112',
        contacts: [{ label: 'Телефон', value: '112' }],
        hours: 'Круглосуточно',
        status: 'draft',
      },
    })
  }
}

async function main() {
  await seedPractices()
  await seedPrograms()
  await seedSupportResources()
  console.log(
    `seed-content: ${cards.length} cards, ${programs.length} programs ensured`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
