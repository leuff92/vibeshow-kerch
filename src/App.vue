<script setup lang="ts">
import { ArrowRight, ChevronRight, Star } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import CookieConsent from './components/CookieConsent.vue'
import NewYearOffers from './components/NewYearOffers.vue'
import YandexReviewCard from './components/YandexReviewCard.vue'
import BubbleShowFeature from './components/BubbleShowFeature.vue'
import { trackContactClick, trackGoal, trackPage } from './analytics'
import { formatHolidayPrice, holidayBookingId, holidayIndex, holidayProgramPage, holidayPrograms, residenceDate, residenceSessions } from './holidayPrograms'
import type { HolidayProgram } from './holidayPrograms'
import {
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
  INSTAGRAM_ARCHIVE_URL,
  INSTAGRAM_LEGAL_WARNING,
  SHOW_INSTAGRAM_LINK,
} from './siteConfig'

type ProgramCategory = 'all' | 'party' | 'show' | 'quest' | 'seasonal' | 'extras' | 'guide'
type PageView =
  | 'home'
  | 'catalog'
  | 'newYear'
  | 'holidayProgram'
  | 'contacts'
  | 'gallery'
  | 'reviews'
  | 'cookiePolicy'
  | 'privacyPolicy'
  | 'personalDataConsent'
type NavItem = 'home' | 'catalog' | 'newYear' | 'gallery' | 'reviews' | 'contacts' | 'booking' | 'legal'

interface Program {
  id: string
  title: string
  price: number | null
  category: Exclude<ProgramCategory, 'all'>
  link: string
  description?: string
  linkLabel?: string
}

interface ParentInfoItem {
  label: string
  text: string
}

interface ParentInfoSlide {
  title: string
  image: string
  imageAlt: string
  lead: string
  note?: string
  items: ParentInfoItem[]
}

interface PhotoWallItem {
  src: string
  alt: string
  variant: 'large' | 'wide' | 'tall' | 'small'
}

interface ServiceGroup {
  title: string
  text: string
}

interface SeoMeta {
  title: string
  description: string
  canonical: string
  image?: string
}

const rubles = new Intl.NumberFormat('ru-RU')
const yandexReviewsStats = { ratingValue: 5, ratingCount: 32, reviewCount: 28 }
const yandexRatingLabel = yandexReviewsStats.ratingValue.toLocaleString('ru-RU', { minimumFractionDigits: 1 })
const yandexReviewCountLabel = `${yandexReviewsStats.ratingCount} оценки · ${yandexReviewsStats.reviewCount} отзывов`
const siteUrl = 'https://vibeshow-kerch.ru'
const homeDescription =
  'Вайб шоу — организация детских праздников в Керчи. Аниматоры, шоу-программы, дни рождения, мастер-классы и бронирование праздника. Ул. Ленина, 19.'
const ogImage = `${siteUrl}/hero-cover-laser-20260505.jpg`

const heroImage = {
  fallback: '/hero-cover-laser-20260505.jpg',
  mobileAvifSrcset: '/hero-cover-laser-20260505-360.avif 360w, /hero-cover-laser-20260505-480.avif 480w',
  mobileWebpSrcset: '/hero-cover-laser-20260505-360.webp 360w, /hero-cover-laser-20260505-480.webp 480w',
  desktopAvifSrcset:
    '/hero-cover-laser-20260505-640.avif 640w, /hero-cover-laser-20260505-720.avif 720w, /hero-cover-laser-20260505-960.avif 960w',
  desktopWebpSrcset:
    '/hero-cover-laser-20260505-640.webp 640w, /hero-cover-laser-20260505-720.webp 720w, /hero-cover-laser-20260505-960.webp 960w',
  mobileSizes: 'calc(100vw - 16px)',
  desktopSizes: '(max-width: 1180px) calc(100vw - 64px), 44vw',
}

const brand = {
  name: 'Вайб шоу',
  fullName: 'Вайб шоу | Детские праздники в Керчи',
  tagline: 'Организация детских праздников в Керчи: аниматоры, шоу-программы и дни рождения',
  vkUrl: 'https://vk.com/vibe.show',
  catalogUrl: 'https://vk.com/market-191575734?screen=group',
  chatUrl: 'https://vk.com/im?sel=-191575734',
  maxUrl: 'https://max.ru/join/VxAxtUboCkZL2k7lGyzQ3xnE8swAafUrp9jcE1JTGlY',
  yandexMapsUrl:
    'https://yandex.ru/maps/org/vibe_show/50264158432/?ll=36.467220%2C45.356223&z=18',
  yandexRouteUrl: 'https://yandex.ru/maps/?rtext=~45.356223%2C36.467220&rtt=auto',
  yandexReviewsUrl:
    'https://yandex.ru/maps/org/vayb_shou/50264158432/reviews/',
  yandexMapEmbedUrl:
    'https://yandex.ru/map-widget/v1/?ll=36.467220%2C45.356223&mode=search&oid=50264158432&ol=biz&z=18',
  phone: CONTACT_PHONE,
  phoneHref: CONTACT_PHONE_HREF,
  address: 'Республика Крым, г. Керчь, ул. Ленина, 19',
  shortAddress: 'Керчь, Ленина 19',
  city: 'Керчь',
  workHours: 'Работает с 10:00 до 22:00',
  since: 2014,
  members: 1391,
  programCount: 29,
  postCount: 603,
  photoCount: 735,
  clipCount: 69,
  serviceCount: 3,
  updatedAt: '25 апреля 2026',
  description: homeDescription,
  hallNote: 'Наш зал находится на территории ресторана с обслуживанием и кухней. На выездах тоже работаем, программу подбираем индивидуально под локацию и возраст детей.',
}

const reasons = [
  {
    title: 'Не детсадовский формат',
    text: 'Подходит для детей и подростков, которые уже переросли базовые анимационные сценарии и хотят ощущение настоящей вечеринки.',
  },
  {
    title: 'Свой зал и выезды',
    text: 'Наш зал находится на территории ресторана с обслуживанием и кухней. На выездах тоже работаем, программу подбираем индивидуально под локацию.',
  },
  {
    title: 'Индивидуальная подготовка',
    text: 'Бронируем индивидуальный праздник за месяц. Нужно время для тщательной подготовки, адаптации сценария и согласования тайминга.',
  },
  {
    title: 'Дополнительно к празднику',
    text: 'Можно добавить мастер-классы, фотографа, пиньяту и фотозону, чтобы создать праздник с учетом ваших пожеланий.',
  },
]

const serviceGroups: ServiceGroup[] = [
  {
    title: 'Детские дни рождения',
    text: 'Сценарии для именинника, гостей и родителей: программа, тайминг, ведущие и праздничная атмосфера.',
  },
  {
    title: 'Аниматоры',
    text: 'Ведущие помогают вовлечь детей, провести игры, конкурсы и тематическую программу в зале или на выезде.',
  },
  {
    title: 'Шоу-программы',
    text: 'Яркие форматы с эффектами, реквизитом и активным участием детей.',
  },
  {
    title: 'Мастер-классы',
    text: 'Творческие и интерактивные занятия, которые можно добавить к празднику или провести отдельным форматом.',
  },
  {
    title: 'Тематические вечеринки',
    text: 'Квесты, челленджи, любимые персонажи и современные темы для детей разного возраста.',
  },
  {
    title: 'Выпускные и праздники для детей',
    text: 'Программы для классов, групп, семейных мероприятий и выездных детских событий в Керчи.',
  },
]

const parentInfoSlides: ParentInfoSlide[] = [
  {
    title: 'Бронь даты',
    image: '/images/parent-info/step-1.jpg',
    imageAlt: 'Ведущие Вайб шоу перед праздником',
    lead: 'Начните с выбора программы и брони даты, и мы сразу же сможем начать подготовку к вашему долгожданному празднику.',
    items: [
      {
        label: 'Выбор программы',
        text: 'Посмотрите с именинником темы вечеринок и тарифы (длительность программы). Определитесь с форматом: нужен ли мастер-класс, фотограф, быть может, хотите добавить свою фишечку.',
      },
      {
        label: 'Данные для брони',
        text: 'Напишите в личные сообщения дату, возраст ребенка, место проведения, выбранную тему или программу и примерное количество детей.',
      },
      {
        label: 'Предоплата',
        text: 'Для закрепления даты вносится бронь 2 000 ₽ по номеру телефона. Остаток оплачивается в день праздника.',
      },
      {
        label: 'Подтверждение',
        text: 'Вносим вас в расписание после внесения брони. Пришлите скрин чека и номер телефона для связи.',
      },
    ],
  },
  {
    title: 'Условия нашего зала',
    image: '/images/parent-info/step-2.jpg',
    imageAlt: 'Праздничный торт в зале Вайб шоу',
    lead: 'Площадка находится на территории ресторана, поэтому по еде и обслуживанию есть простые правила.',
    items: [
      {
        label: 'Заказ меню',
        text: 'За 2 дня до праздника нужно сделать заказ по меню ресторана «Диванъ» по адресу Ленина 19, с 10:00 до 22:00.',
      },
      {
        label: 'Где заказать',
        text: 'Заказ можно оформить у администратора или бармена. Если остаются вопросы по меню, их лучше сразу уточнить у администратора ресторана.',
      },
      {
        label: 'Минималка',
        text: 'Минимального заказа по меню нет. Аренда зала уже входит в стоимость выбранной праздничной программы.',
      },
      {
        label: 'Торт',
        text: 'Торт можно привезти свой. Также можно взять свечи и фейерверки для торта, если они подходят для помещения.',
      },
    ],
  },
  {
    title: 'Правила площадки',
    image: '/images/parent-info/step-3.jpg',
    imageAlt: 'Дети на празднике в зале Вайб шоу',
    lead: 'Эти условия помогают провести праздник спокойно, без накладок по залу, посуде и времени.',
    items: [
      {
        label: 'Еда',
        text: 'На территорию ресторана нельзя приносить свою еду. Исключение - торт, свечи и разрешенные праздничные мелочи.',
      },
      {
        label: 'Если только торт',
        text: 'Если вечеринка без заказа еды, посуда и обслуживание официантами не предоставляются. Использованную посуду нужно убрать самостоятельно.',
      },
      {
        label: 'Родители',
        text: 'Родители могут заходить, смотреть и фотографировать. Обычно взрослые отдыхают за отдельным столом, исключение - малыши до 4 лет.',
      },
      {
        label: 'Обувь и порядок',
        text: 'Сменная обувь нужна, если на улице грязно или обувь меховая. Пол в зале - плитка. В зале ведется видеонаблюдение.',
      },
    ],
    note: 'При намеренной порче имущества взимается штраф, поэтому лучше заранее обсудить хлопушки, декор и спецэффекты.',
  },
  {
    title: 'Выездные мероприятия',
    image: '/images/parent-info/step-4.jpg',
    imageAlt: 'Праздничная фотозона с шарами',
    lead: 'На выезде мы подстраиваем программу под вашу площадку, но важно заранее проверить условия места.',
    items: [
      {
        label: 'Транспорт',
        text: 'Выезд в черте города - 1 000 ₽. За пределами города стоимость рассчитывается индивидуально по расстоянию и формату.',
      },
      {
        label: 'Площадка',
        text: 'Для праздника нужна розетка, столик для реквизита и посадочные места для детей. Если есть ограничения по шуму, сообщите заранее.',
      },
      {
        label: 'Игровые центры',
        text: 'Работа в игровых центрах обсуждается отдельно: там много отвлекающих факторов, поэтому оптимально планировать 1 час программы.',
      },
      {
        label: 'Еда и тайминг',
        text: 'Лучше, чтобы дети поели до приезда ведущих. На выездных программах дополнительного времени на еду обычно нет.',
      },
    ],
    note: 'Не все программы выезжают и не все заведения разрешают спецэффекты, поэтому нюансы лучше уточнить до брони.',
  },
  {
    title: 'Подготовка с ребенком',
    image: '/images/parent-info/step-5.jpg',
    imageAlt: 'Подготовка ребенка к тематической программе',
    lead: 'Чем точнее мы понимаем желания именинника, тем легче собрать праздник, который действительно попадет в настроение.',
    items: [
      {
        label: 'Интересы',
        text: 'Спросите, какая программа нравится больше всего и почему: персонажи, музыка, челленджи, квест, мастер-класс или шоу.',
      },
      {
        label: 'Формат',
        text: 'Уточните, как ребенок представляет праздник: больше танцев, игр, заданий, спокойных активностей или яркого шоу.',
      },
      {
        label: 'Компания',
        text: 'Подготовьте возраст детей, количество гостей и состав компании: мальчики, девочки или смешанная группа.',
      },
      {
        label: 'Пожелания',
        text: 'Сразу отметьте важные детали: любимая тема, торт, фотозона, фотограф, пиньята, мастер-класс или особые ограничения.',
      },
    ],
    note: 'Выбор программы вместе с именинником - половина успеха праздника.',
  },
  {
    title: 'Оплата и дополнительные вопросы',
    image: '/images/parent-info/step-6.jpg',
    imageAlt: 'Именинница танцует на празднике',
    lead: 'После брони даты и заказа меню можно считать праздник подтвержденным. Остальные вопросы лучше закрыть заранее.',
    items: [
      {
        label: 'Оплата в день',
        text: 'Остаток оплачивается наличными аниматорам или переводом на карту по номеру телефона +7 (978) 712-93-81.',
      },
      {
        label: 'Перенос даты',
        text: 'Если планы меняются, бронь не возвращается, но по согласованию можно перенести дату и время праздника.',
      },
      {
        label: 'Мастер-классы',
        text: 'Если выбран мастер-класс, вместо брони 2 000 ₽ оплачивается 100% стоимости мастер-класса по количеству детей.',
      },
      {
        label: 'Связь',
        text: 'Если остались вопросы по меню, залу, выезду или оплате, звоните или пишите по номеру +7 (978) 712-93-81.',
      },
    ],
  },
]

const photoWallItems: PhotoWallItem[] = [
  { src: '/images/photo-wall/wall-01.jpg', alt: 'Ведущие Вайб шоу в образах на празднике', variant: 'large' },
  { src: '/images/photo-wall/wall-03.jpg', alt: 'Аквагрим и подготовка к тематической вечеринке', variant: 'wide' },
  { src: '/images/photo-wall/wall-05.jpg', alt: 'Именинница на яркой фотозоне с шарами', variant: 'tall' },
  { src: '/images/photo-wall/wall-07.jpg', alt: 'Дети смеются во время программы', variant: 'wide' },
  { src: '/images/photo-wall/wall-10.jpg', alt: 'Именинница на фоне ярких шаров', variant: 'large' },
  { src: '/images/photo-wall/wall-02.jpg', alt: 'Дети участвуют в веселой программе', variant: 'small' },
  { src: '/images/photo-wall/wall-06.jpg', alt: 'Девочка танцует на детской вечеринке', variant: 'tall' },
  { src: '/images/photo-wall/wall-08.jpg', alt: 'Фирменная фотозона Vibe Show в зале', variant: 'small' },
  { src: '/images/photo-wall/wall-11.jpg', alt: 'Ведущие в костюмах на тематическом празднике', variant: 'tall' },
  { src: '/images/photo-wall/wall-09.jpg', alt: 'Неоновая деталь фотозоны Vibe Show', variant: 'small' },
  { src: '/images/photo-wall/wall-12.jpg', alt: 'Площадка ресторана для праздника', variant: 'wide' },
  { src: '/images/photo-wall/wall-15.jpg', alt: 'Яркий образ на фотозоне Вайб шоу', variant: 'tall' },
  { src: '/images/photo-wall/wall-04.jpg', alt: 'Ведущие улыбаются перед началом праздника', variant: 'small' },
  { src: '/images/photo-wall/wall-13.jpg', alt: 'Праздничная сервировка для гостей', variant: 'wide' },
  { src: '/images/photo-wall/wall-14.jpg', alt: 'Входная зона ресторана и площадки', variant: 'small' },
  { src: '/images/photo-wall/wall-16.jpg', alt: 'Интерьер ресторана для семейного праздника', variant: 'small' },
]

const programs: Program[] = [
  {
    id: '13698644',
    title: 'Руми- звезда сцены',
    price: 15000,
    category: 'party',
    link: 'https://vk.com/market/product/rumi-zvezda-stseny-191575734-13698644',
    description:
      'Сценическая вечеринка для детей, которые любят музыку, танцы и яркие выступления перед друзьями.',
  },
  {
    id: '13666256',
    title: 'Пиратские приключения',
    price: 13000,
    category: 'quest',
    link: 'https://vk.com/market/product/piratskie-priklyuchenia-191575734-13666256',
    description:
      'Квест с пиратской атмосферой, поиском сокровищ, заданиями и активными играми для команды гостей.',
  },
  {
    id: '13608471',
    title: 'Масленица',
    price: 15000,
    category: 'seasonal',
    link: 'https://vk.com/market/product/maslenitsa-191575734-13608471',
    description:
      'Сезонная программа с народными играми, конкурсами и веселым праздником для детской компании.',
  },
  {
    id: '13509112',
    title: 'Тарифы',
    price: 0,
    category: 'guide',
    link: 'https://vk.com/market/product/tarify-191575734-13509112',
    description:
      'Информационная карточка с форматами праздника, составом программ и вариантами бронирования.',
  },
  {
    id: '13336728',
    title: 'Новый год',
    price: 3500,
    category: 'seasonal',
    link: 'https://vk.com/market/product/novy-god-191575734-13336728',
    description:
      'Праздничная программа с зимними героями, играми, музыкой и новогодним настроением для детей.',
  },
  {
    id: '12259467',
    title: 'Цирковое шоу',
    price: 13000,
    category: 'show',
    link: 'https://vk.com/market/product/tsirkovoe-shou-191575734-12259467',
    description:
      'Яркий шоу-формат с цирковой атмосферой, реквизитом, активностями и вау-эффектами.',
  },
  {
    id: '11960711',
    title: 'Чиловая вечеринка',
    price: 3000,
    category: 'party',
    link: 'https://vk.com/market/product/chilovaya-vecherinka-191575734-11960711',
    description:
      'Легкий формат для подростков с музыкой, общением, играми и спокойной атмосферой тусовки.',
  },
  {
    id: '11960566',
    title: 'Лапка пати',
    price: 10000,
    category: 'party',
    link: 'https://vk.com/market/product/lapka-pati-191575734-11960566',
    description:
      'Милая тематическая программа с играми, танцами и заданиями для детей, которые любят животных.',
  },
  {
    id: '11849498',
    title: 'Мармеладное шоу',
    price: 5000,
    category: 'show',
    link: 'https://vk.com/market/product/marmeladnoe-shou-191575734-11849498',
    description:
      'Сладкий интерактивный формат с яркими заданиями, играми и праздничным настроением для детей.',
  },
  {
    id: '11249998',
    title: 'Хулиганская вечеринка',
    price: 13000,
    category: 'party',
    link: 'https://vk.com/market/product/khuliganskaya-vecherinka-191575734-11249998',
    description:
      'Динамичная вечеринка с дерзкими конкурсами, танцами и активностями для уверенной компании.',
  },
  {
    id: '10113203',
    title: 'Космическая вечеринка',
    price: 11000,
    category: 'party',
    link: 'https://vk.com/market/product/kosmicheskaya-vecherinka-191575734-10113203',
    description:
      'Космическое приключение с тематическими заданиями, играми и атмосферой межпланетного праздника.',
  },
  {
    id: '10103126',
    title: 'Бьюти бар',
    price: 5000,
    category: 'show',
    link: 'https://vk.com/market/product/byuti-bar-191575734-10103126',
    description:
      'Творческий формат с бьюти-активностями, блеском, образами и красивыми деталями праздника.',
  },
  {
    id: '10023865',
    title: 'Роблокс вечеринка',
    price: 11000,
    category: 'party',
    link: 'https://vk.com/market/product/roblox-vecherinka-191575734-10023865',
    description:
      'Игровая вечеринка по мотивам Roblox с заданиями, челленджами и активной командной атмосферой.',
  },
  {
    id: '9604363',
    title: 'Мем вечеринка',
    price: 13000,
    category: 'party',
    link: 'https://vk.com/market/product/mem-vecherinka-191575734-9604363',
    description:
      'Современный формат с мемами, трендами, смешными заданиями и конкурсами для подростков.',
  },
  {
    id: '9431265',
    title: 'Русалочка',
    price: 10000,
    category: 'party',
    link: 'https://vk.com/market/product/rusalochka-191575734-9431265',
    description:
      'Сказочная программа с морской атмосферой, играми и нежными образами для детского праздника.',
  },
  {
    id: '9388738',
    title: 'К-поп',
    price: 12000,
    category: 'party',
    link: 'https://vk.com/market/product/k-pop-191575734-9388738',
    description:
      'Танцевальная вечеринка для поклонников K-pop: музыка, движения, стиль и яркая сценическая подача.',
  },
  {
    id: '9388733',
    title: 'Квест-вечеринка «айфон»',
    price: 8000,
    category: 'quest',
    link: 'https://vk.com/market/product/kvest-vecherinka-ayfon-191575734-9388733',
    description:
      'Квест по мотивам телефона и приложений: задания, логика, командная игра и неожиданные этапы.',
  },
  {
    id: '9338920',
    title: 'Квест «Джуманджи»',
    price: 13000,
    category: 'quest',
    link: 'https://vk.com/market/product/kvest-dzhumandzhi-191575734-9338920',
    description:
      'Приключенческий квест с заданиями, испытаниями и атмосферой игры, в которую попадают гости.',
  },
  {
    id: '9332260',
    title: 'Барби',
    price: 8000,
    category: 'party',
    link: 'https://vk.com/market/product/barbi-191575734-9332260',
    description:
      'Стильная розовая вечеринка с играми, танцами, образами и праздничной фотогеничной атмосферой.',
  },
  {
    id: '9066793',
    title: 'Вечеринка Уэнсдей',
    price: 9000,
    category: 'party',
    link: 'https://vk.com/market/product/vecherinka-uensdey-191575734-9066793',
    description:
      'Стильная программа с загадками, заданиями и атмосферой любимой героини для необычного праздника.',
  },
  {
    id: '9042308',
    title: 'Урок химических наук',
    price: 12000,
    category: 'show',
    link: 'https://vk.com/market/product/urok-khimicheskikh-nauk-191575734-9042308',
    description:
      'Научное шоу с опытами, интерактивом и безопасными экспериментами, которые удивляют детей.',
  },
  {
    id: '8994995',
    title: 'Челенджи 2',
    price: 13000,
    category: 'quest',
    link: 'https://vk.com/market/product/chelendzhi-2-191575734-8994995',
    description:
      'Вторая подборка челленджей с командными заданиями, быстрыми конкурсами и активным темпом.',
  },
  {
    id: '8078551',
    title: 'Пижамная вечеринка',
    price: 10000,
    category: 'party',
    link: 'https://vk.com/market/product/pizhamnaya-vecherinka-191575734-8078551',
    description:
      'Уютный формат с играми, музыкой, разговорами и атмосферой домашней вечеринки для друзей.',
  },
  {
    id: '8073797',
    title: 'Гавайская вечеринка',
    price: 10000,
    category: 'party',
    link: 'https://vk.com/market/product/gavayskaya-vecherinka-191575734-8073797',
    description:
      'Летняя программа с тропическим настроением, танцами, конкурсами и яркими праздничными образами.',
  },
  {
    id: '8073792',
    title: 'Вечеринка холли',
    price: 5000,
    category: 'party',
    link: 'https://vk.com/market/product/vecherinka-kholli-191575734-8073792',
    description:
      'Красочный формат с фестивальной атмосферой, музыкой, играми и яркими эмоциями для компании.',
  },
  {
    id: '7695950',
    title: 'Дополнения',
    price: 500,
    category: 'extras',
    link: 'https://vk.com/market/product/dopolnenia-191575734-7695950',
    description:
      'Дополнительные опции к празднику: активности, детали оформления и форматы, которые усиливают программу.',
  },
  {
    id: '7485929',
    title: 'Челенджи 1',
    price: 13000,
    category: 'quest',
    link: 'https://vk.com/market/product/chelendzhi-1-191575734-7485929',
    description:
      'Подборка веселых челленджей, заданий и конкурсов для активной детской или подростковой компании.',
  },
  {
    id: '7365841',
    title: 'Неоновая вечеринка',
    price: 10000,
    category: 'party',
    link: 'https://vk.com/market/product/neonovaya-vecherinka-191575734-7365841',
    description:
      'Светящаяся вечеринка с музыкой, танцами, яркими образами и неоновой атмосферой.',
  },
  {
    id: '7365835',
    title: 'Я в тренде',
    price: 9000,
    category: 'party',
    link: 'https://vk.com/market/product/ya-v-trende-191575734-7365835',
    description:
      'Современная программа с трендами, музыкой, стильными заданиями и атмосферой популярной вечеринки.',
  },
  {
    id: 'bubble-show',
    title: 'Шоу мыльных пузырей',
    price: null,
    category: 'show',
    link: brand.chatUrl,
    linkLabel: 'Узнать о шоу',
    description: 'Сказочная фея, огромные мыльные пузыри и участие детей в шоу.',
  },
  {
    id: 'custom-party',
    title: 'Придумай сам свой праздник',
    price: null,
    category: 'party',
    link: '#booking',
    description:
      'Соберём индивидуальный сценарий под интересы, возраст и любимые темы именинника: от идеи до тайминга праздника.',
    linkLabel: 'Забронировать идею',
  },
]

const categoryMeta: Record<ProgramCategory, { label: string; hint: string }> = {
  all: {
    label: 'Все программы',
    hint: 'Все программы VK',
  },
  party: {
    label: 'Вечеринки',
    hint: 'Тематические форматы',
  },
  show: {
    label: 'Шоу',
    hint: 'Сценические и wow-форматы',
  },
  quest: {
    label: 'Квесты',
    hint: 'Активные сценарии и челленджи',
  },
  seasonal: {
    label: 'Сезонные',
    hint: 'Новый год и праздничные даты',
  },
  extras: {
    label: 'Дополнения',
    hint: 'Добавки к программе',
  },
  guide: {
    label: 'Тарифы',
    hint: 'Информационная карточка',
  },
}

const typeLabels: Record<Exclude<ProgramCategory, 'all'>, string> = {
  party: 'Тематическая вечеринка',
  show: 'Шоу или мастер-класс',
  quest: 'Квестовый формат',
  seasonal: 'Сезонная программа',
  extras: 'Дополнительная опция',
  guide: 'Карточка с тарифами',
}

const pagePaths: Record<Exclude<PageView, 'holidayProgram'>, string> = {
  home: '/',
  catalog: '/programs',
  newYear: holidayIndex.path,
  contacts: '/contacts',
  gallery: '/gallery',
  reviews: '/reviews',
  cookiePolicy: '/cookie-policy',
  privacyPolicy: '/privacy-policy',
  personalDataConsent: '/personal-data-consent',
}

const seoByPage: Record<Exclude<PageView, 'holidayProgram'>, SeoMeta> = {
  home: {
    title: 'Детские праздники в Керчи — Вайб шоу',
    description: homeDescription,
    canonical: `${siteUrl}/`,
  },
  catalog: {
    title: 'Программы детских праздников в Керчи — Вайб шоу',
    description:
      'Программы Вайб шоу для детских праздников в Керчи: аниматоры, квесты, шоу, мастер-классы и тематические дни рождения.',
    canonical: `${siteUrl}/programs`,
  },
  newYear: {
    title: holidayIndex.title,
    description: holidayIndex.description,
    canonical: `${siteUrl}${holidayIndex.path}`,
    image: `${siteUrl}${holidayIndex.image}`,
  },
  gallery: {
    title: 'Фото детских праздников в Керчи — Вайб шоу',
    description:
      'Галерея Вайб шоу: фото детских праздников, аниматоров, фотозон и шоу-программ в Керчи.',
    canonical: `${siteUrl}/gallery`,
  },
  reviews: {
    title: 'Отзывы о детских праздниках — Вайб шоу Керчь',
    description:
      'Отзывы о Вайб шоу в Керчи: ссылка на карточку Яндекс Карт, где можно посмотреть отзывы родителей о детских праздниках.',
    canonical: `${siteUrl}/reviews`,
  },
  contacts: {
    title: 'Контакты Вайб шоу — детские праздники в Керчи',
    description:
      'Контакты Вайб шоу в Керчи: Республика Крым, г. Керчь, ул. Ленина, 19. Телефон +7 978 712-93-81, VK и Яндекс Карты.',
    canonical: `${siteUrl}/contacts`,
  },
  cookiePolicy: {
    title: 'Политика cookie — Вайб шоу',
    description: 'Политика cookie Вайб шоу: категории cookie, настройки согласия и контакты оператора.',
    canonical: `${siteUrl}/cookie-policy`,
  },
  privacyPolicy: {
    title: 'Политика обработки персональных данных — Вайб шоу',
    description:
      'Политика обработки персональных данных Вайб шоу: какие данные обрабатываются, цели, сроки хранения и права пользователя.',
    canonical: `${siteUrl}/privacy-policy`,
  },
  personalDataConsent: {
    title: 'Согласие на обработку персональных данных — Вайб шоу',
    description:
      'Согласие на обработку персональных данных для заявок на детские праздники Вайб шоу в Керчи.',
    canonical: `${siteUrl}/personal-data-consent`,
  },
}

const breadcrumbLabels: Record<PageView, string> = {
  home: 'Главная',
  catalog: 'Программы',
  newYear: 'Новогодние утренники',
  holidayProgram: 'Новогодняя программа',
  gallery: 'Фото',
  reviews: 'Отзывы',
  contacts: 'Контакты',
  cookiePolicy: 'Политика cookie',
  privacyPolicy: 'Политика обработки персональных данных',
  personalDataConsent: 'Согласие на обработку персональных данных',
}

const navigationLinks = [
  { name: 'Главная', url: `${siteUrl}/` },
  { name: 'Программы', url: `${siteUrl}/programs` },
  { name: 'Новый год', url: `${siteUrl}${holidayIndex.path}` },
  { name: 'Фото', url: `${siteUrl}/gallery` },
  { name: 'Отзывы', url: `${siteUrl}/reviews` },
  { name: 'Контакты', url: `${siteUrl}/contacts` },
]

const reviews = [
  {
    author: 'Наталья Михеева',
    date: '26 октября 2026',
    rating: 5,
    summary: 'Команда помогла подобрать площадку и быстро подготовила день рождения с учётом бюджета и пожеланий семьи. Елена уделила внимание имениннице и вовлекла в игры всех детей.',
  },
  {
    author: 'Алена Е.',
    date: '10 сентября 2026',
    rating: 5,
    summary: 'На шоу мыльных пузырей понравились костюмы, музыка и интерактивы. В программу включились и дети, и взрослые, а на память остались яркие фотографии.',
  },
  {
    author: 'Кристина Стародубова',
    date: '9 сентября 2026',
    rating: 5,
    summary: 'Семья побывала на нескольких мероприятиях и отметила, что аниматоры каждый раз придумывают что-то новое. Дети охотно участвуют и ещё долго обсуждают праздник.',
  },
  {
    author: 'Лилия К.',
    date: '9 сентября 2026',
    rating: 5,
    summary: 'Автор рекомендует команду за внимательное отношение к детям и ответственную подготовку праздника. Детям мероприятие очень понравилось.',
  },
  {
    author: 'Анастасия Е.',
    date: '29 мая 2026',
    rating: 5,
    summary: 'После нескольких дней рождения семья снова обратилась к команде, уже за выпускным. Праздник понравился и детям, и взрослым.',
  },
]
const recentReviews = reviews.slice(0, 3)

const activeCategory = ref<ProgramCategory>('all')
const currentPage = ref<PageView>('home')
const currentHolidayProgram = ref<HolidayProgram>()
const activeNav = ref<NavItem>('home')
const homeDetailsReady = ref(false)
const currentParentInfoSlide = ref(0)
const leadSubmitting = ref(false)
const leadSuccess = ref('')
const leadError = ref('')
const currentTime = ref(Date.now())
const homeDetailEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
let homeDetailsTimer: number | undefined
let countdownTimer: number | undefined
let leadSuccessTimer: number | undefined

const catalogPrograms = programs.filter((program) => program.id !== 'custom-party')
const paidPrograms: Program[] = [
  ...programs.filter((program) => program.category !== 'guide'),
  ...holidayPrograms.map((program): Program => ({
    id: holidayBookingId(program.id),
    title: program.title,
    price: program.price,
    category: 'seasonal',
    link: holidayProgramPage(program).path,
  })),
]
const defaultProgram = paidPrograms.find((program) => program.category !== 'extras') ?? paidPrograms[0]
const featuredPrograms = programs.filter((program) =>
  ['13698644', '13666256', '12259467', '10113203'].includes(program.id),
)
const programImageOverrides: Partial<Record<string, string>> = {
  'bubble-show': '/images/programs/bubble-show',
  '8073797': '/images/programs/8073797-custom',
  '8073792': '/images/programs/8073792-custom',
}

const promoOffer = {
  programId: '12259467',
  title: 'Цирковое шоу',
  oldPrice: 13000 as number | null,
  price: 8000,
  deadline: new Date('2026-08-01T00:00:00+03:00').getTime(),
  deadlineLabel: '1 августа',
  monthLabel: 'июля',
  duration: '2 часа',
  place: 'в нашем зале',
  audience: 'для детей до 10 лет',
  gift: 'батут в подарок',
}

const form = ref({
  programId: defaultProgram.id,
  parentName: '',
  childName: '',
  childAge: '',
  childrenCount: '' as number | '',
  date: '',
  time: '',
  phone: '',
  notes: '',
  consentAccepted: false,
  website: '',
})

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date())
const selectedHoliday = computed(() => holidayPrograms.find((program) => holidayBookingId(program.id) === form.value.programId))
const isResidence = computed(() => selectedHoliday.value?.id === 'residence')
const weekdayTimes = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
const weekendTimes = ['11:00', '15:00', '18:00']

const selectedDateIsWeekend = computed(() => {
  if (!form.value.date) {
    return false
  }

  const day = new Date(`${form.value.date}T00:00:00`).getDay()

  return day === 0 || day === 6
})

const timeOptions = computed(() => {
  if (isResidence.value) {
    return residenceSessions
  }
  if (selectedHoliday.value) {
    return []
  }
  return selectedDateIsWeekend.value ? weekendTimes : weekdayTimes
})

const timeScheduleHint = computed(() => {
  if (!form.value.date) {
    return 'Будни: с 16:00 до 22:00 каждый час. Выходные: 11:00, 15:00 и 18:00.'
  }

  return selectedDateIsWeekend.value
    ? 'Выходной день: 11:00, 15:00 или 18:00.'
    : 'Будний день: с 16:00 до 22:00, интервал каждый час.'
})

watch(
  () => form.value.programId,
  (_id, previousId) => {
    const wasHoliday = holidayPrograms.some((program) => holidayBookingId(program.id) === previousId)
    if (isResidence.value) {
      form.value.date = residenceDate
    } else if (previousId === holidayBookingId('residence')) {
      form.value.date = ''
    }
    if (selectedHoliday.value || wasHoliday) {
      form.value.time = ''
    }
  },
)

watch(
  [() => form.value.date, timeOptions],
  () => {
    if (timeOptions.value.length && form.value.time && !timeOptions.value.includes(form.value.time)) {
      form.value.time = ''
    }
  },
)

const availableCategories = computed(() => {
  const entries: ProgramCategory[] = ['all', 'party', 'show', 'quest', 'seasonal', 'extras', 'guide']

  return entries.map((key) => {
    const count = key === 'all' ? catalogPrograms.length : catalogPrograms.filter((program) => program.category === key).length
    return {
      key,
      count,
      ...categoryMeta[key],
    }
  })
})

const filteredPrograms = computed(() => {
  return catalogPrograms.filter((program) => {
    const matchesCategory = activeCategory.value === 'all' || program.category === activeCategory.value

    return matchesCategory
  })
})

const selectedProgram = computed(
  () => paidPrograms.find((program) => program.id === form.value.programId) ?? defaultProgram,
)
const bookingProgramPrice = computed(() => selectedHoliday.value
  ? formatHolidayPrice(selectedHoliday.value)
  : formatPrice(programPrice(selectedProgram.value)))
const bookingContact = computed(() => selectedHoliday.value ?? brand)

const promoProgram = computed(() => programs.find((program) => program.id === promoOffer.programId))

const promoRemainingMs = computed(() => Math.max(0, promoOffer.deadline - currentTime.value))

const promoIsActive = computed(() => promoRemainingMs.value > 0)

const promoHasOldPrice = computed(() => promoOffer.oldPrice !== null && promoOffer.oldPrice > promoOffer.price)

const promoCountdown = computed(() => {
  const totalSeconds = Math.floor(promoRemainingMs.value / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    { value: String(days), label: 'дней' },
    { value: twoDigits(hours), label: 'часов' },
    { value: twoDigits(minutes), label: 'минут' },
    { value: twoDigits(seconds), label: 'секунд' },
  ]
})

const bookingMessage = computed(() => {
  const program = selectedProgram.value
  const promoLine =
    isPromoProgram(program) && promoIsActive.value
      ? `Акция ${promoOffer.monthLabel}: ${promoOffer.title} за ${formatPrice(promoOffer.price)}, ${
          promoOffer.duration
        }, ${promoOffer.place}, ${promoOffer.audience}, ${promoOffer.gift}. Действует до ${
          promoOffer.deadlineLabel
        }.`
      : ''
  const lines = [
    'Здравствуйте! Хочу забронировать праздник в Вайб шоу.',
    `Программа: ${program.title}`,
    `Стоимость: ${bookingProgramPrice.value}`,
    promoLine,
    selectedHoliday.value ? '' : 'Бронирование: 2 000 ₽',
    `Дата: ${fallbackText(formatDate(form.value.date))}`,
    `Время: ${fallbackText(form.value.time)}`,
    `Имя родителя: ${fallbackText(form.value.parentName)}`,
    `Имя ребёнка: ${fallbackText(form.value.childName)}`,
    `Возраст ребёнка: ${fallbackText(form.value.childAge)}`,
    `Количество детей: ${fallbackText(String(form.value.childrenCount))}`,
    `Телефон родителя: ${fallbackText(form.value.phone)}`,
    `Комментарий: ${fallbackText(form.value.notes)}`,
  ]

  return lines.filter(Boolean).join('\n')
})

function avatarImageSrc() {
  return '/images/avatar-96.webp'
}

function avatarImageSrcset() {
  return '/images/avatar-48.webp 48w, /images/avatar-96.webp 96w, /images/avatar-160.webp 160w'
}

function cardImageSrc(program: Program) {
  if (programImageOverrides[program.id]) {
    return programImageSrc(programImageOverrides[program.id], 360)
  }

  return program.id === 'custom-party'
    ? '/hero-cover-laser-20260505-640.webp'
    : programImageSrc(`/images/programs/${program.id}`, 360)
}

function cardImageSrcset(program: Program) {
  if (programImageOverrides[program.id]) {
    return `${programImageSrc(programImageOverrides[program.id], 360)} 360w, ${programImageSrc(
      programImageOverrides[program.id],
      540,
    )} 540w`
  }

  if (program.id === 'custom-party') {
    return heroImage.desktopWebpSrcset
  }

  return `${programImageSrc(`/images/programs/${program.id}`, 360)} 360w, ${programImageSrc(
    `/images/programs/${program.id}`,
    540,
  )} 540w`
}

function programImageSrc(base: string | undefined, width: 360 | 540) {
  return `${base}-${width}-opt.webp`
}

function imageBase(src: string) {
  return src.replace(/\.jpg$/i, '')
}

function responsiveWebpSrc(src: string, width: 480 | 720) {
  return `${imageBase(src)}-${width}.webp`
}

function photoImageSrc(photo: PhotoWallItem) {
  return responsiveWebpSrc(photo.src, 480)
}

function photoImageSrcset(photo: PhotoWallItem) {
  return `${responsiveWebpSrc(photo.src, 480)} 480w, ${responsiveWebpSrc(photo.src, 720)} 720w`
}

function parentInfoImageSrc(slide: ParentInfoSlide) {
  return responsiveWebpSrc(slide.image, 480)
}

function parentInfoImageSrcset(slide: ParentInfoSlide) {
  return `${responsiveWebpSrc(slide.image, 480)} 480w, ${responsiveWebpSrc(slide.image, 720)} 720w`
}

function formatPrice(price: number | null) {
  if (price === null) {
    return 'Цена договорная'
  }

  if (price === 0) {
    return 'Бесплатно'
  }

  return `${rubles.format(price)} ₽`
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0')
}

function isPromoProgram(program: Program) {
  return program.id === promoOffer.programId
}

function programPrice(program: Program) {
  return isPromoProgram(program) && promoIsActive.value ? promoOffer.price : program.price
}

function selectPromoAndBook() {
  form.value.programId = promoOffer.programId
  void navigateTo('home', 'booking')
}

function selectBubbleAndBook() {
  void navigateTo('home', 'booking', 'bubble-show')
}

function fallbackText(value: string) {
  return value.trim() || 'уточнить в переписке'
}

function formatDate(value: string) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function safeHref(value: string) {
  const href = value.trim()

  if (!href) {
    return '#'
  }

  if (/^(#|\/(?!\/)|\.\/|\.\.\/)/.test(href)) {
    return href
  }

  try {
    const url = new URL(href)
    const allowedProtocols = new Set(['http:', 'https:', 'tel:', 'mailto:'])

    return allowedProtocols.has(url.protocol) ? href : '#'
  } catch {
    return '#'
  }
}

function linkTarget(value: string) {
  return /^https?:\/\//i.test(safeHref(value)) ? '_blank' : undefined
}

function setParentInfoSlide(index: number) {
  currentParentInfoSlide.value = Math.min(Math.max(index, 0), parentInfoSlides.length - 1)
}

function changeParentInfoSlide(direction: -1 | 1) {
  const lastSlideIndex = parentInfoSlides.length - 1
  const nextSlideIndex = currentParentInfoSlide.value + direction

  if (nextSlideIndex < 0) {
    currentParentInfoSlide.value = lastSlideIndex
    return
  }

  if (nextSlideIndex > lastSlideIndex) {
    currentParentInfoSlide.value = 0
    return
  }

  currentParentInfoSlide.value = nextSlideIndex
}

function sanitizeDigits(field: 'childAge' | 'phone', maxLength: number) {
  form.value[field] = form.value[field].replace(/\D/g, '').slice(0, maxLength)
}

function phoneLooksValid(value: string) {
  const digits = value.replace(/\D/g, '')

  return digits.length >= 10 && digits.length <= 15
}

function compactText(value: string, maxLength = 1000) {
  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function resetLeadForm() {
  const programId = form.value.programId

  form.value = {
    programId,
    parentName: '',
    childName: '',
    childAge: '',
    childrenCount: '',
    date: isResidence.value ? residenceDate : '',
    time: '',
    phone: '',
    notes: '',
    consentAccepted: false,
    website: '',
  }
}

function clearLeadSuccessTimer() {
  if (leadSuccessTimer !== undefined) {
    window.clearTimeout(leadSuccessTimer)
    leadSuccessTimer = undefined
  }
}

function showLeadSuccessFeedback() {
  clearLeadSuccessTimer()
  leadSuccess.value = 'Спасибо! Заявка отправлена. Мы скоро свяжемся с вами.'
  leadSuccessTimer = window.setTimeout(() => {
    leadSuccess.value = ''
    leadSuccessTimer = undefined
  }, 2800)
}

async function submitLead() {
  if (leadSubmitting.value) {
    return
  }

  clearLeadSuccessTimer()
  leadSuccess.value = ''
  leadError.value = ''

  if (!form.value.programId || !paidPrograms.some((program) => program.id === form.value.programId)) {
    leadError.value = 'Выберите программу праздника.'
    return
  }

  if (!form.value.phone.trim()) {
    leadError.value = 'Укажите телефон, чтобы мы могли связаться с вами.'
    return
  }

  if (!phoneLooksValid(form.value.phone)) {
    leadError.value = 'Проверьте номер телефона: он должен быть похож на настоящий номер.'
    return
  }

  if (!form.value.consentAccepted) {
    leadError.value = 'Подтвердите согласие на обработку персональных данных.'
    return
  }

  if (form.value.childrenCount !== '' && (!Number.isSafeInteger(form.value.childrenCount) || form.value.childrenCount < 1)) {
    leadError.value = 'Укажите количество детей целым числом от 1.'
    return
  }
  if (isResidence.value && !residenceSessions.includes(form.value.time)) {
    leadError.value = 'Выберите сеанс «Резиденции Деда Мороза».'
    return
  }

  const programId = selectedProgram.value.id
  leadSubmitting.value = true

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        programId,
        programName: compactText(selectedProgram.value.title, 160),
        programPrice: compactText(bookingProgramPrice.value, 80),
        bookingPrice: selectedHoliday.value ? '' : '2 000 ₽',
        date: compactText(form.value.date, 40),
        time: compactText(form.value.time, 40),
        parentName: compactText(form.value.parentName, 120),
        childName: compactText(form.value.childName, 120),
        childAge: compactText(form.value.childAge, 20),
        childrenCount: form.value.childrenCount === '' ? null : form.value.childrenCount,
        parentPhone: compactText(form.value.phone, 40),
        comment: compactText(form.value.notes, 1000),
        pageUrl: window.location.href,
        createdAt: new Date().toISOString(),
        consentAccepted: form.value.consentAccepted,
        website: form.value.website,
      }),
    })

    const result = await response.json()
    if (!response.ok || result?.ok !== true) {
      throw new Error('Lead submit failed')
    }

    trackGoal('lead_submitted', { program: programId })
    showLeadSuccessFeedback()
    resetLeadForm()
  } catch {
    leadError.value = `Не удалось отправить заявку. Пожалуйста, позвоните нам: ${bookingContact.value.phone}`
  } finally {
    leadSubmitting.value = false
  }
}

function openCookieSettings() {
  window.dispatchEvent(new CustomEvent('vibeshow-open-cookie-settings'))
}

function removeHomeDetailsListeners() {
  homeDetailEvents.forEach((eventName) => {
    window.removeEventListener(eventName, revealHomeDetails, { capture: true })
  })
}

function revealHomeDetails() {
  if (homeDetailsReady.value) {
    return
  }

  homeDetailsReady.value = true

  if (homeDetailsTimer !== undefined) {
    window.clearTimeout(homeDetailsTimer)
    homeDetailsTimer = undefined
  }

  removeHomeDetailsListeners()
}

function scheduleHomeDetails() {
  if (homeDetailsReady.value) {
    return
  }

  removeHomeDetailsListeners()

  homeDetailEvents.forEach((eventName) => {
    window.addEventListener(eventName, revealHomeDetails, { capture: true, once: true, passive: true })
  })

  homeDetailsTimer = window.setTimeout(revealHomeDetails, 7000)
}

function normalizedPath() {
  return window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/'
}

function holidayFromLocation() {
  const path = normalizedPath()
  return holidayPrograms.find((program) => path === holidayProgramPage(program).path)
}

function pageFromLocation(): PageView {
  const legacyHash = window.location.hash.replace(/^#/, '')

  if (legacyHash === 'catalog') {
    return 'catalog'
  }

  if (holidayFromLocation()) {
    return 'holidayProgram'
  }

  switch (normalizedPath()) {
    case '/programs':
      return 'catalog'
    case '/new-year':
      return 'newYear'
    case '/gallery':
      return 'gallery'
    case '/reviews':
      return 'reviews'
    case '/contacts':
      return 'contacts'
    case '/cookie-policy':
      return 'cookiePolicy'
    case '/privacy-policy':
      return 'privacyPolicy'
    case '/personal-data-consent':
      return 'personalDataConsent'
    default:
      return 'home'
  }
}

function targetFromLocation(page = pageFromLocation()) {
  if (page !== 'home') {
    if (page === 'newYear' || page === 'holidayProgram') {
      return 'page-top'
    }
    if (page === 'catalog') {
      return 'catalog'
    }

    if (page === 'cookiePolicy') {
      return 'cookie-policy'
    }

    if (page === 'privacyPolicy') {
      return 'privacy-policy'
    }

    if (page === 'personalDataConsent') {
      return 'personal-data-consent'
    }

    return page
  }

  const target = window.location.hash.replace(/^#/, '')

  return target && target !== 'home' && target !== 'catalog' ? target : 'hero'
}

function navFromTarget(page: PageView, targetId: string): NavItem {
  if (page === 'catalog') {
    return 'catalog'
  }

  if (page === 'newYear' || page === 'holidayProgram') {
    return 'newYear'
  }

  if (page !== 'home') {
    return ['catalog', 'gallery', 'reviews', 'contacts'].includes(page) ? (page as NavItem) : 'legal'
  }

  return targetId === 'booking' ? 'booking' : 'home'
}

function routeFor(page: PageView, targetId: string, programId?: string) {
  if (page === 'home') {
    if (targetId === 'booking' && programId) {
      const url = new URLSearchParams({ program: programId })
      return `/?${url}#booking`
    }
    return targetId === 'hero' ? pagePaths.home : `${pagePaths.home}#${targetId}`
  }

  if (page === 'holidayProgram') {
    return currentHolidayProgram.value ? holidayProgramPage(currentHolidayProgram.value).path : holidayIndex.path
  }
  return pagePaths[page]
}

function seoForPage(page: PageView): SeoMeta {
  if (page !== 'holidayProgram') {
    return seoByPage[page]
  }
  if (!currentHolidayProgram.value) {
    return seoByPage.newYear
  }
  const { title, description, path, image } = holidayProgramPage(currentHolidayProgram.value)
  return { title, description, canonical: `${siteUrl}${path}`, image: `${siteUrl}${image}` }
}

function structuredDataForPage(page: PageView) {
  const seo = seoForPage(page)
  const pageUrl = seo.canonical
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: breadcrumbLabels.home,
      item: `${siteUrl}/`,
    },
  ]

  if (page === 'holidayProgram') {
    breadcrumbItems.push(
      { '@type': 'ListItem', position: 2, name: breadcrumbLabels.newYear, item: `${siteUrl}${holidayIndex.path}` },
      { '@type': 'ListItem', position: 3, name: currentHolidayProgram.value?.title ?? breadcrumbLabels.holidayProgram, item: pageUrl },
    )
  } else if (page !== 'home') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: breadcrumbLabels[page],
      item: pageUrl,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['EntertainmentBusiness', 'LocalBusiness'],
        '@id': `${siteUrl}/#organization`,
        name: brand.name,
        alternateName: 'Краснобаева Вайб',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/favicon.png`,
        image: ogImage,
        description: homeDescription,
        telephone: brand.phone,
        priceRange: '₽₽',
        foundingDate: String(brand.since),
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'RU',
          addressRegion: 'Республика Крым',
          addressLocality: brand.city,
          streetAddress: 'ул. Ленина, 19',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 45.356223,
          longitude: 36.46722,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '10:00',
            closes: '22:00',
          },
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: brand.phone,
            contactType: 'customer service',
            areaServed: brand.city,
            availableLanguage: 'ru',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ...yandexReviewsStats,
          bestRating: 5,
        },
        sameAs: [brand.vkUrl, brand.yandexMapsUrl],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: brand.name,
        description: homeDescription,
        inLanguage: 'ru-RU',
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': `${siteUrl}/#site-navigation`,
        name: navigationLinks.map((link) => link.name),
        url: navigationLinks.map((link) => link.url),
      },
      {
        '@type': 'ItemList',
        '@id': `${siteUrl}/#quick-links`,
        name: 'Основные разделы сайта Вайб шоу',
        itemListElement: navigationLinks.map((link, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: link.name,
          url: link.url,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
      {
        '@type': page === 'contacts' ? ['WebPage', 'ContactPage'] : 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: seo.title,
        description: seo.description,
        inLanguage: 'ru-RU',
        isPartOf: {
          '@id': `${siteUrl}/#website`,
        },
        about: {
          '@id': `${siteUrl}/#organization`,
        },
        breadcrumb: {
          '@id': `${pageUrl}#breadcrumb`,
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: seo.image ?? ogImage,
        },
      },
    ],
  }
}

function applyStructuredData(page: PageView) {
  let script = document.querySelector<HTMLScriptElement>('script#structured-data')
  if (!script) {
    script = document.createElement('script')
    script.id = 'structured-data'
    script.type = 'application/ld+json'
    document.head.append(script)
  }

  script.textContent = JSON.stringify(structuredDataForPage(page))
}

function applySeo() {
  const seo = seoForPage(currentPage.value)
  document.title = seo.title

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  description?.setAttribute('content', seo.description)

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = seo.canonical

  setOgMeta('og:title', seo.title)
  setOgMeta('og:description', seo.description)
  setOgMeta('og:url', seo.canonical)
  setOgMeta('og:type', 'website')
  setOgMeta('og:site_name', brand.name)
  setOgMeta('og:image', seo.image ?? ogImage)
  applyStructuredData(currentPage.value)
}

function setOgMeta(property: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.append(meta)
  }
  meta.setAttribute('content', content)
}

function trackMetrikaPageView() {
  trackPage(currentPage.value === 'holidayProgram' ? currentHolidayProgram.value?.id : undefined)
}

function scrollToTarget(targetId: string, behavior: ScrollBehavior) {
  if (targetId === 'hero' || targetId === 'page-top') {
    window.scrollTo({ top: 0, behavior: targetId === 'page-top' ? 'instant' : behavior })
    return true
  }
  const target = document.getElementById(targetId)

  if (!target) {
    return false
  }

  target.scrollIntoView({ behavior, block: 'start' })
  return true
}

async function scrollToTargetAfterRender(targetId: string, behavior: ScrollBehavior) {
  await nextTick()

  if (scrollToTarget(targetId, behavior)) {
    return
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  if (scrollToTarget(targetId, behavior)) {
    return
  }

  window.setTimeout(() => {
    scrollToTarget(targetId, behavior)
  }, 80)
}

async function navigateTo(page: PageView, targetId = page === 'catalog' ? 'catalog' : page === 'home' ? 'hero' : page, programId?: string) {
  currentPage.value = page
  activeNav.value = navFromTarget(page, targetId)
  applySeo()

  if (page === 'home' || page === 'catalog') {
    revealHomeDetails()
  }

  if (programId) {
    form.value.programId = programId
  }
  const nextRoute = routeFor(page, targetId, programId)
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextRoute) {
    window.history.pushState(null, '', nextRoute)
    trackMetrikaPageView()
  }

  await scrollToTargetAfterRender(targetId, 'smooth')
}

async function syncPageFromLocation() {
  currentHolidayProgram.value = holidayFromLocation()
  currentPage.value = pageFromLocation()
  const targetId = targetFromLocation(currentPage.value)
  activeNav.value = navFromTarget(currentPage.value, targetId)
  applySeo()

  if (currentPage.value === 'home' || currentPage.value === 'catalog') {
    revealHomeDetails()
  }

  if (currentPage.value === 'home' && targetId === 'booking') {
    const programId = new URLSearchParams(window.location.search).get('program')
    if (programId && paidPrograms.some((program) => program.id === programId)) {
      form.value.programId = programId
    }
  }

  trackMetrikaPageView()
  await scrollToTargetAfterRender(targetId, 'auto')
}

function handleLocationChange() {
  void syncPageFromLocation()
}

onMounted(() => {
  currentTime.value = Date.now()
  countdownTimer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)

  currentHolidayProgram.value = holidayFromLocation()
  currentPage.value = pageFromLocation()
  activeNav.value = navFromTarget(currentPage.value, targetFromLocation(currentPage.value))
  applySeo()

  if (currentPage.value === 'home' && ['', '#home'].includes(window.location.hash)) {
    scheduleHomeDetails()
    trackMetrikaPageView()
  } else {
    revealHomeDetails()
    void syncPageFromLocation()
  }

  window.addEventListener('popstate', handleLocationChange)
  window.addEventListener('hashchange', handleLocationChange)
  window.addEventListener('vibeshow-cookie-consent-changed', trackMetrikaPageView)
  document.addEventListener('click', trackContactClick, true)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handleLocationChange)
  window.removeEventListener('hashchange', handleLocationChange)
  window.removeEventListener('vibeshow-cookie-consent-changed', trackMetrikaPageView)
  document.removeEventListener('click', trackContactClick, true)
  removeHomeDetailsListeners()

  if (homeDetailsTimer !== undefined) {
    window.clearTimeout(homeDetailsTimer)
    homeDetailsTimer = undefined
  }

  if (countdownTimer !== undefined) {
    window.clearInterval(countdownTimer)
    countdownTimer = undefined
  }

  clearLeadSuccessTimer()
})

</script>

<template>
  <div class="site-shell">
    <div v-if="leadSuccess" class="lead-success" aria-live="polite" role="status">
      <span class="lead-success__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span class="sr-only">{{ leadSuccess }}</span>
    </div>

    <header class="topbar">
      <a class="brand" href="/" aria-label="Вайб шоу" @click.prevent="navigateTo('home', 'hero')">
        <img
          class="brand__avatar"
          :src="avatarImageSrc()"
          :srcset="avatarImageSrcset()"
          sizes="48px"
          alt=""
          width="48"
          height="48"
          decoding="async"
          aria-hidden="true"
        />
        <div>
          <strong>{{ brand.name }}</strong>
          <span>{{ brand.city }} · свой зал и выезд</span>
        </div>
      </a>

      <nav class="topbar__nav" aria-label="Навигация по сайту">
        <a href="/" :class="{ 'is-active': activeNav === 'home' }" @click.prevent="navigateTo('home', 'hero')">Главная</a>
        <a class="topbar__seasonal" :class="{ 'is-active': activeNav === 'newYear' }" href="/new-year">Новый год</a>
        <a href="/programs" :class="{ 'is-active': activeNav === 'catalog' }" @click.prevent="navigateTo('catalog')">Программы</a>
        <a href="/gallery" :class="{ 'is-active': activeNav === 'gallery' }" @click.prevent="navigateTo('gallery')">Фото</a>
        <a href="/reviews" :class="{ 'is-active': activeNav === 'reviews' }" @click.prevent="navigateTo('reviews')">Отзывы</a>
        <a href="/contacts" :class="{ 'is-active': activeNav === 'contacts' }" @click.prevent="navigateTo('contacts')">Контакты</a>
      </nav>

      <div class="topbar__actions">
        <a class="btn btn--secondary topbar__vk" :href="safeHref(brand.vkUrl)" :target="linkTarget(brand.vkUrl)" rel="noopener noreferrer">
          VK
        </a>
        <a class="btn btn--ghost topbar__action" href="/#booking" @click.prevent="navigateTo('home', 'booking')">
          Забронировать
        </a>
      </div>
    </header>

    <main class="page">
      <template v-if="currentPage === 'home'">
        <a class="season-banner" href="/new-year">
          <img src="/images/new-year/trees-400.webp" alt="" width="96" height="72" aria-hidden="true" />
          <div class="season-banner__copy">
            <strong>Новогодние утренники 2026/2027</strong>
            <span>Ёлки, утренники и вечеринки</span>
          </div>
          <ArrowRight class="season-banner__arrow" :size="22" aria-hidden="true" />
        </a>
        <div class="home-quick-actions">
          <a class="btn btn--primary" href="/#booking" @click.prevent="navigateTo('home', 'booking')">Забронировать</a>
          <a class="btn btn--secondary" href="/programs" @click.prevent="navigateTo('catalog')">Все программы</a>
        </div>
      </template>

      <section v-if="currentPage === 'home'" id="hero" class="hero">
        <div class="hero__copy">
          <h1>ВЕЧЕРИНКИ, <span>КОТОРЫЕ ХОЧЕТСЯ ПОВТОРИТЬ</span></h1>
          <div class="hero__lead">
            <p><strong>Сценарии со смыслом. Особая атмосфера. Внимание к каждому ребёнку.</strong></p>
            <p>
              Мы создаём детские праздники, которые не заканчиваются вместе с музыкой —
              <strong>они остаются в воспоминаниях.</strong>
            </p>
            <p class="hero__signature"><strong>Вайб Шоу — когда каждый ребёнок чувствует себя важным.</strong> 💜</p>
          </div>

        </div>

        <div class="hero__visual">
          <article class="hero-card hero-card--cover">
            <picture>
              <source media="(max-width: 640px)" type="image/avif" :srcset="heroImage.mobileAvifSrcset" :sizes="heroImage.mobileSizes" />
              <source media="(max-width: 640px)" type="image/webp" :srcset="heroImage.mobileWebpSrcset" :sizes="heroImage.mobileSizes" />
              <source type="image/avif" :srcset="heroImage.desktopAvifSrcset" :sizes="heroImage.desktopSizes" />
              <source type="image/webp" :srcset="heroImage.desktopWebpSrcset" :sizes="heroImage.desktopSizes" />
              <img :src="heroImage.fallback" :alt="brand.fullName" width="960" height="1280" fetchpriority="high" decoding="async" />
            </picture>
            <div class="hero-card__content">
              <p class="hero-card__label">VK-сообщество</p>
              <h2>{{ brand.fullName }}</h2>
            </div>
          </article>

          <div class="hero__highlights">
            <button
              class="hero-card hero-card--floating hero-card--yellow hero-card--review"
              type="button"
              @click="navigateTo('reviews')"
            >
              <strong class="hero-card__rating">
                {{ yandexRatingLabel }} из 5
                <Star class="hero-card__rating-star" :size="24" :stroke-width="1.5" aria-hidden="true" />
              </strong>
              <span class="hero-card__desktop-label">Рейтинг на Яндекс Картах</span>
              <span class="hero-card__mobile-label">Яндекс Карты <ChevronRight :size="14" aria-hidden="true" /></span>
            </button>

            <article class="hero-card hero-card--floating hero-card--mint">
              <strong>с {{ brand.since }}<span class="hero-card__mobile-label"> года</span></strong>
              <span class="hero-card__desktop-label">Нам доверяют родители и счастливые именинники</span>
              <span class="hero-card__mobile-label">Детские праздники</span>
            </article>
          </div>
        </div>
      </section>

      <NewYearOffers v-if="currentPage === 'newYear' || currentPage === 'holidayProgram'" standalone :program="currentHolidayProgram" />

      <section v-if="currentPage === 'home' && promoIsActive && promoProgram" class="promo-countdown" aria-labelledby="promo-countdown-title">
        <div class="promo-countdown__copy">
          <p class="promo-countdown__eyebrow">Акция до {{ promoOffer.deadlineLabel }}</p>
          <h2 id="promo-countdown-title">«{{ promoOffer.title }}» за {{ formatPrice(promoOffer.price) }}</h2>
          <p>
            {{ promoOffer.duration }} {{ promoOffer.place }}, {{ promoOffer.audience }},
            {{ promoOffer.gift }}. Количество дат ограничено, бронь даты — 2 000 ₽.
          </p>
        </div>

        <div class="promo-countdown__panel" aria-label="До конца акции">
          <p>До конца акции</p>
          <div class="promo-countdown__timer">
            <span v-for="item in promoCountdown" :key="item.label">
              <strong>{{ item.value }}</strong>
              <small>{{ item.label }}</small>
            </span>
          </div>
          <button class="btn btn--primary" type="button" @click="selectPromoAndBook">Забронировать со скидкой</button>
        </div>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" id="about" class="facts" aria-label="О Вайб Шоу">
        <article v-for="reason in reasons" :key="reason.title" class="fact-card">
          <h2>{{ reason.title }}</h2>
          <p>{{ reason.text }}</p>
        </article>
      </section>

      <BubbleShowFeature v-if="currentPage === 'home' && homeDetailsReady" @book="selectBubbleAndBook" />

      <NewYearOffers v-if="currentPage === 'home' && homeDetailsReady" />

      <section v-if="currentPage === 'home' && homeDetailsReady" id="programs-preview" class="section home-programs">
        <div class="section__head">
          <div>
            <h2>Готовые сценарии для дня рождения</h2>
          </div>
        </div>

        <div class="catalog-grid catalog-grid--featured">
          <article v-for="program in featuredPrograms" :key="program.id" class="program-card">
            <div class="program-card__media">
              <img
                :src="cardImageSrc(program)"
                :srcset="cardImageSrcset(program)"
                sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1180px) calc((100vw - 76px) / 2), 340px"
                :alt="program.title"
                width="360"
                height="270"
                loading="lazy"
                decoding="async"
              />
              <span :class="['program-card__price', { 'program-card__price--promo': isPromoProgram(program) && promoIsActive }]">
                <template v-if="isPromoProgram(program) && promoIsActive">
                  <s v-if="promoHasOldPrice">{{ formatPrice(promoOffer.oldPrice) }}</s>
                  <strong>{{ formatPrice(promoOffer.price) }}</strong>
                </template>
                <template v-else>{{ formatPrice(program.price) }}</template>
              </span>
            </div>

            <div class="program-card__body">
              <p class="program-card__type">{{ typeLabels[program.category] }}</p>
              <h3>{{ program.title }}</h3>
              <p class="program-card__hint">Один из популярных форматов для детского праздника в Керчи.</p>
            </div>

            <div class="program-card__footer">
              <a class="program-card__link" href="/programs" @click.prevent="navigateTo('catalog')">Смотреть программы</a>
            </div>
          </article>
        </div>
      </section>

      <section v-if="currentPage === 'catalog'" id="catalog" class="section catalog-page">
        <div class="catalog-hero">
          <div>
            <h1>Программы детских праздников в Керчи</h1>
            <p>
              Вайб шоу проводит тематические вечеринки, квесты, шоу-программы, мастер-классы и индивидуальные
              сценарии для дней рождения.
            </p>
          </div>

          <aside class="catalog-hero__panel">
            <span>В каталоге VK</span>
            <strong>{{ catalogPrograms.length }} позиций</strong>
            <p>Можно открыть любую карточку в VK, сравнить стоимость и сразу написать менеджеру.</p>
            <a class="btn btn--market" href="/#booking" @click.prevent="navigateTo('home', 'booking')">
              Забронировать праздник
            </a>
          </aside>
        </div>

        <BubbleShowFeature @book="selectBubbleAndBook" />

        <NewYearOffers />

        <div class="service-grid" aria-label="Основные услуги Вайб шоу">
          <article v-for="service in serviceGroups" :key="service.title" class="fact-card">
            <h2>{{ service.title }}</h2>
            <p>{{ service.text }}</p>
          </article>
        </div>

        <div class="catalog-toolbar">
          <div class="category-list" role="group" aria-label="Фильтр каталога">
            <button
              v-for="category in availableCategories"
              :key="category.key"
              :class="['chip', { 'chip--active': activeCategory === category.key }]"
              type="button"
              :aria-pressed="activeCategory === category.key"
              @click="activeCategory = category.key"
            >
              <span>{{ category.label }}</span>
              <small>{{ category.count }}</small>
            </button>
          </div>
        </div>

        <div v-if="filteredPrograms.length" class="catalog-grid">
          <article v-for="program in filteredPrograms" :key="program.id" class="program-card">
            <div class="program-card__media">
              <img
                :src="cardImageSrc(program)"
                :srcset="cardImageSrcset(program)"
                sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1180px) calc((100vw - 76px) / 2), 340px"
                :alt="program.title"
                width="360"
                height="270"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
              />
              <span :class="['program-card__price', { 'program-card__price--promo': isPromoProgram(program) && promoIsActive }]">
                <template v-if="isPromoProgram(program) && promoIsActive">
                  <s v-if="promoHasOldPrice">{{ formatPrice(promoOffer.oldPrice) }}</s>
                  <strong>{{ formatPrice(promoOffer.price) }}</strong>
                </template>
                <template v-else>{{ formatPrice(program.price) }}</template>
              </span>
            </div>

            <div class="program-card__body">
              <p class="program-card__type">{{ typeLabels[program.category] }}</p>
              <h3>{{ program.title }}</h3>
              <p class="program-card__hint">
                {{
                  program.description ??
                  (program.category === 'guide'
                    ? 'Информационная карточка с тарифами внутри VK.'
                    : `Формат из официального каталога сообщества.`)
                }}
              </p>
            </div>

            <div class="program-card__footer">
              <a
                class="program-card__link"
                :href="safeHref(program.link)"
                :target="linkTarget(program.link)"
                :aria-label="`${program.linkLabel ?? 'Открыть в VK'}: ${program.title}`"
                rel="noopener noreferrer"
              >
                {{ program.linkLabel ?? 'Открыть в VK' }}
              </a>
            </div>
          </article>
        </div>

        <div v-else class="catalog-empty">
          <strong>Ничего не найдено.</strong>
          <p>Попробуйте другой запрос или снимите фильтр категории.</p>
        </div>
      </section>

      <section v-if="currentPage === 'gallery'" id="gallery" class="section photo-wall utility-page">
        <div class="page-hero">
          <h1>Фото детских праздников Вайб шоу</h1>
        </div>

        <div class="photo-wall__grid">
          <figure
            v-for="(photo, index) in photoWallItems"
            :key="photo.src"
            :class="['photo-wall__item', `photo-wall__item--${photo.variant}`]"
          >
            <img
              :src="photoImageSrc(photo)"
              :srcset="photoImageSrcset(photo)"
              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1180px) calc((100vw - 64px) / 2), 340px"
              :alt="photo.alt"
              width="720"
              height="960"
              :loading="index < 4 ? 'eager' : 'lazy'"
              decoding="async"
              :fetchpriority="index < 4 ? 'high' : 'low'"
            />
          </figure>
        </div>
      </section>

      <section v-if="currentPage === 'reviews'" id="reviews" class="section utility-page">
        <div class="reviews-hero">
          <h1>Отзывы</h1>
          <div class="reviews-score">
            <strong>{{ yandexRatingLabel }}</strong>
            <div>
              <span aria-hidden="true">★★★★★</span>
              <small>{{ yandexReviewCountLabel }}</small>
            </div>
          </div>
        </div>

        <div class="reviews-grid reviews-grid--yandex">
          <YandexReviewCard v-for="review in reviews" :key="review.author" v-bind="review" />
        </div>

        <div class="reviews-more">
          <a class="btn btn--secondary" :href="safeHref(brand.yandexReviewsUrl)" :target="linkTarget(brand.yandexReviewsUrl)" rel="noopener noreferrer">
            Все отзывы на Яндекс Картах
          </a>
        </div>
      </section>

      <section v-if="currentPage === 'contacts'" id="contacts" class="section utility-page">
        <div class="page-hero">
          <h1>Контакты Вайб шоу в Керчи</h1>
          <p>
            Свяжитесь с нами, чтобы выбрать программу, уточнить свободную дату и забронировать детский праздник.
          </p>
        </div>

        <article class="contact-card contact-card--location">
          <div class="location-card__body">
            <p class="contact-card__eyebrow">Контактная информация</p>
            <div class="contact-card__rows">
              <div class="contact-card__row">
                <div>
                  <strong>{{ brand.name }}</strong>
                  <span>Организация детских праздников в Керчи</span>
                </div>
              </div>
              <div class="contact-card__row">
                <div>
                  <strong>{{ brand.phone }}</strong>
                  <span>Телефон для бронирования</span>
                </div>
                <a class="contact-card__quick-link contact-card__quick-link--phone" :href="safeHref(brand.phoneHref)">Позвонить</a>
              </div>
              <div class="contact-card__row">
                <div>
                  <strong>{{ brand.workHours }}</strong>
                  <span>Режим работы</span>
                </div>
              </div>
            </div>
            <p class="contact-card__eyebrow">Адрес</p>
            <strong>{{ brand.address }}</strong>
            <span>{{ brand.hallNote }}</span>

            <div class="contact-card__main-channels">
              <strong>Главные каналы связи</strong>
              <div class="contact-card__actions">
                <a class="contact-card__channel-link contact-card__channel-link--primary" :href="safeHref(brand.chatUrl)" :target="linkTarget(brand.chatUrl)" rel="noopener noreferrer">
                  Написать в VK
                </a>
                <a class="contact-card__channel-link contact-card__channel-link--primary" :href="safeHref(brand.maxUrl)" :target="linkTarget(brand.maxUrl)" rel="noopener noreferrer">
                  MAX
                </a>
                <a
                  v-if="SHOW_INSTAGRAM_LINK"
                  class="contact-card__channel-link contact-card__channel-link--primary"
                  :href="safeHref(INSTAGRAM_ARCHIVE_URL)"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                >
                  Instagram*
                </a>
              </div>
            </div>

            <div v-if="SHOW_INSTAGRAM_LINK" class="contact-card__archive">
              <p class="contact-card__notice">
                Instagram* — продукт компании Meta Platforms Inc., деятельность которой признана экстремистской и запрещена на территории РФ.
              </p>
            </div>

            <a
              class="location-card__link"
              :href="safeHref(brand.yandexMapsUrl)"
              :target="linkTarget(brand.yandexMapsUrl)"
              rel="noopener noreferrer"
            >
              Открыть карточку на Яндекс Картах
            </a>
          </div>

          <div class="location-card__map">
            <iframe
              :src="safeHref(brand.yandexMapEmbedUrl)"
              title="Карта: Республика Крым, г. Керчь, ул. Ленина, 19"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </article>
      </section>

      <section v-if="currentPage === 'cookiePolicy'" id="cookie-policy" class="section utility-page legal-page">
        <div class="page-hero">
          <h1>Политика cookie</h1>
          <p>
            Эта политика описывает, какие cookie использует сайт Вайб шоу и как изменить свой выбор.
          </p>
        </div>

        <article class="legal-card">
          <h2>Что такое cookie</h2>
          <p>
            Cookie — это небольшие файлы и похожие технологии, которые сайт сохраняет в браузере пользователя для
            корректной работы страниц, запоминания настроек и анализа использования сайта при наличии согласия.
          </p>

          <h2>Категории cookie</h2>
          <p>
            На сайте используются необходимые cookie. Аналитические и маркетинговые cookie выключены по умолчанию и
            запускаются только после согласия пользователя.
          </p>

          <h2>Необходимые cookie</h2>
          <p>Нужны для работы сайта, сохранения настроек и корректной отправки форм. Они всегда включены.</p>

          <h2>Аналитические cookie</h2>
          <p>
            Помогают понять, как посетители используют сайт, чтобы улучшать страницы и удобство. Яндекс Метрика
            запускается только при выборе аналитических cookie.
          </p>

          <h2>Маркетинговые cookie</h2>
          <p>
            Используются для рекламы, ретаргетинга и оценки эффективности рекламных кампаний. Внешние рекламные
            скрипты не подключаются без отдельного согласия.
          </p>

          <h2>Как изменить выбор</h2>
          <p>
            Нажмите «Настройки cookie» в футере сайта. Вы сможете включить или отключить аналитические и маркетинговые
            cookie.
          </p>

          <h2>Контакты оператора</h2>
          <p>
            Оператор: Вайб шоу. Адрес: Республика Крым, г. Керчь, ул. Ленина, 19. Телефон:
            <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>.
          </p>
        </article>
      </section>

      <section v-if="currentPage === 'privacyPolicy'" id="privacy-policy" class="section utility-page legal-page">
        <div class="page-hero">
          <h1>Политика обработки персональных данных</h1>
          <p>
            Политика описывает, какие персональные данные обрабатывает Вайб шоу при работе сайта и заявок.
          </p>
        </div>

        <article class="legal-card">
          <h2>Оператор</h2>
          <p>
            Оператор персональных данных: Вайб шоу. Адрес: Республика Крым, г. Керчь, ул. Ленина, 19. Телефон:
            <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>.
          </p>
          <p class="legal-card__note">Юридические реквизиты оператора необходимо уточнить и заполнить вручную.</p>

          <h2>Какие данные обрабатываются</h2>
          <p>
            Имя, телефон, комментарий из формы, желаемая дата праздника, возраст ребёнка, количество детей, технические данные сайта и
            cookie.
          </p>

          <h2>Цели обработки</h2>
          <p>
            Обратная связь, бронирование праздника, обработка заявки, улучшение сайта, аналитика и реклама при
            отдельном согласии пользователя.
          </p>

          <h2>Срок хранения</h2>
          <p>
            Данные заявок хранятся в течение срока, необходимого для обработки обращения, бронирования и выполнения
            законных обязанностей оператора. Конкретный срок хранения необходимо уточнить в юридической версии
            документа.
          </p>

          <h2>Права пользователя</h2>
          <p>
            Пользователь может запросить доступ к данным, уточнение, блокирование или удаление данных, а также отозвать
            согласие на обработку персональных данных.
          </p>

          <h2>Как отозвать согласие</h2>
          <p>
            Для отзыва согласия свяжитесь с Вайб шоу по телефону
            <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>. После отзыва согласия обработка будет
            прекращена, кроме случаев, когда продолжение обработки требуется по закону.
          </p>
        </article>
      </section>

      <section
        v-if="currentPage === 'personalDataConsent'"
        id="personal-data-consent"
        class="section utility-page legal-page"
      >
        <div class="page-hero">
          <h1>Согласие на обработку персональных данных</h1>
          <p>
            Отправляя форму на сайте, пользователь дает отдельное согласие на обработку данных для связи и
            бронирования праздника.
          </p>
        </div>

        <article class="legal-card">
          <h2>Согласие</h2>
          <p>
            Я даю согласие Вайб шоу на обработку моих персональных данных, указанных в форме сайта, для обработки
            заявки, обратной связи и бронирования детского праздника.
          </p>

          <h2>Оператор</h2>
          <p>
            Вайб шоу. Адрес: Республика Крым, г. Керчь, ул. Ленина, 19. Телефон:
            <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>.
          </p>

          <h2>Данные</h2>
          <p>Имя, телефон, сообщение, желаемая дата, возраст ребёнка, количество детей и технические данные сайта.</p>

          <h2>Цели</h2>
          <p>Обработка заявки, обратная связь, уточнение деталей и бронирование праздника.</p>

          <h2>Порядок отзыва</h2>
          <p>
            Согласие можно отозвать, связавшись с Вайб шоу по телефону
            <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>. После отзыва заявка может быть удалена или
            обработка будет ограничена в пределах требований закона.
          </p>

          <p class="legal-card__note">Проверить и дополнить юридические реквизиты оператора.</p>
        </article>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" id="info" class="section parent-info">
        <div class="section__head parent-info__head">
          <h2>Информация для родителей</h2>
        </div>

        <div class="parent-info__carousel" aria-label="Информация для родителей">
          <button
            class="parent-info__arrow parent-info__arrow--prev"
            type="button"
            aria-label="Предыдущий шаг"
            @click="changeParentInfoSlide(-1)"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div class="parent-info__viewport">
            <div class="parent-info__track" :style="{ transform: `translateX(-${currentParentInfoSlide * 100}%)` }">
              <article
                v-for="(slide, index) in parentInfoSlides"
                :key="slide.title"
                class="parent-info-slide"
                :aria-hidden="currentParentInfoSlide !== index"
              >
                <figure class="parent-info-slide__visual">
                  <img
                    :src="parentInfoImageSrc(slide)"
                    :srcset="parentInfoImageSrcset(slide)"
                    sizes="(max-width: 640px) calc(100vw - 64px), 360px"
                    :alt="slide.imageAlt"
                    width="720"
                    height="960"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>

                <div class="parent-info-slide__content">
                  <h3>{{ slide.title }}</h3>
                  <p class="parent-info-slide__lead">{{ slide.lead }}</p>

                  <ul>
                    <li v-for="item in slide.items" :key="item.label">
                      <strong>{{ item.label }}</strong>
                      <span>{{ item.text }}</span>
                    </li>
                  </ul>

                  <p v-if="slide.note" class="parent-info-slide__note">{{ slide.note }}</p>
                </div>
              </article>
            </div>
          </div>

          <button
            class="parent-info__arrow parent-info__arrow--next"
            type="button"
            aria-label="Следующий шаг"
            @click="changeParentInfoSlide(1)"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div class="parent-info__dots" aria-label="Переключить карточку">
          <button
            v-for="(slide, index) in parentInfoSlides"
            :key="slide.title"
            :class="['parent-info__dot', { 'is-active': currentParentInfoSlide === index }]"
            type="button"
            :aria-label="`Открыть карточку ${index + 1}`"
            :aria-current="currentParentInfoSlide === index ? 'step' : undefined"
            @click="setParentInfoSlide(index)"
          >
            {{ index + 1 }}
          </button>
        </div>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" class="section photo-wall">
        <div class="section__head photo-wall__head">
          <div>
            <h2>Живые кадры праздников</h2>
          </div>
        </div>

        <div class="photo-wall__grid">
          <figure
            v-for="photo in photoWallItems"
            :key="photo.src"
            :class="['photo-wall__item', `photo-wall__item--${photo.variant}`]"
          >
            <img
              :src="photoImageSrc(photo)"
              :srcset="photoImageSrcset(photo)"
              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1180px) calc((100vw - 64px) / 2), 340px"
              :alt="photo.alt"
              width="720"
              height="960"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
          </figure>
        </div>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" id="reviews-preview" class="section reviews-preview">
        <div class="section__head">
          <div>
            <h2>Что отмечают родители</h2>
          </div>
        </div>

        <div class="reviews-grid">
          <YandexReviewCard v-for="review in recentReviews" :key="review.author" v-bind="review" />
        </div>

        <div class="reviews-more">
          <a class="btn btn--secondary" href="/reviews" @click.prevent="navigateTo('reviews')">
            Читать отзывы
          </a>
        </div>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" id="location" class="section story story--cards">
        <aside class="story__aside">
          <article class="contact-card contact-card--location">
            <div class="location-card__body">
              <strong>{{ brand.address }}</strong>
              <span>{{ brand.hallNote }}</span>

              <div class="contact-card__rows">
                <div class="contact-card__row">
                  <div>
                    <strong>{{ brand.phone }}</strong>
                    <span>Телефон для бронирования праздника</span>
                  </div>
                  <a class="contact-card__quick-link contact-card__quick-link--phone" :href="safeHref(brand.phoneHref)">Позвонить</a>
                </div>
                <div class="contact-card__row">
                  <div>
                    <strong>Главные каналы связи</strong>
                  </div>
                  <div class="contact-card__links">
                    <a class="contact-card__channel-link contact-card__channel-link--primary" :href="safeHref(brand.chatUrl)" :target="linkTarget(brand.chatUrl)" rel="noopener noreferrer">Написать в VK</a>
                    <a class="contact-card__channel-link contact-card__channel-link--primary" :href="safeHref(brand.maxUrl)" :target="linkTarget(brand.maxUrl)" rel="noopener noreferrer">MAX</a>
                    <a
                      v-if="SHOW_INSTAGRAM_LINK"
                      class="contact-card__channel-link contact-card__channel-link--primary"
                      :href="safeHref(INSTAGRAM_ARCHIVE_URL)"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >Instagram*</a>
                  </div>
                  <div v-if="SHOW_INSTAGRAM_LINK" class="contact-card__archive">
                    <p class="contact-card__notice">
                      Instagram* — продукт компании Meta Platforms Inc., деятельность которой признана экстремистской и запрещена на территории РФ.
                    </p>
                  </div>
                </div>
              </div>

              <a
                class="location-card__link"
                :href="safeHref(brand.yandexMapsUrl)"
                :target="linkTarget(brand.yandexMapsUrl)"
                rel="noopener noreferrer"
              >
                Перейти к адресу
              </a>
            </div>

            <div class="location-card__map">
              <iframe
                :src="safeHref(brand.yandexMapEmbedUrl)"
                title="Карта: Республика Крым, г. Керчь, ул. Ленина, 19"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </article>
        </aside>
      </section>

      <section v-if="currentPage === 'home' && homeDetailsReady" id="booking" class="booking">
        <div class="booking__intro">
          <h2>Соберите заявку и отправьте её нам</h2>
          <p v-if="!selectedHoliday" class="booking__price">Бронирование даты стоит 2 000 ₽.</p>
          <p v-else class="booking__price">{{ selectedHoliday.title }} · {{ bookingProgramPrice }}</p>
          <p>
            Укажите номер для связи и детали праздника. Мы свяжемся с вами, чтобы подтвердить заявку.
          </p>
        </div>

        <div class="booking__grid">
          <form class="booking-form" @submit.prevent="submitLead">
            <label>
              <span>Программа</span>
              <select v-model="form.programId" name="programId" required>
                <option v-for="program in paidPrograms" :key="program.id" :value="program.id">
                  {{ program.title }}{{ program.price !== null && !program.id.startsWith('new-year-') ? ` · ${formatPrice(programPrice(program))}` : '' }}
                </option>
              </select>
            </label>

            <div class="booking-form__pair">
              <label>
                <span>Дата</span>
                <input v-model="form.date" :min="isResidence ? residenceDate : today" :readonly="isResidence" type="date" />
              </label>
              <label>
                <span>{{ isResidence ? 'Сеанс' : 'Время' }}</span>
                <input v-if="selectedHoliday && !isResidence" v-model="form.time" type="time" />
                <select v-else v-model="form.time" name="time" :disabled="!form.date" :required="isResidence">
                  <option value="" disabled>
                    {{ isResidence ? 'Выберите сеанс' : form.date ? 'Выберите время' : 'Сначала выберите дату' }}
                  </option>
                  <option v-for="time in timeOptions" :key="time" :value="time">
                    {{ time }}
                  </option>
                </select>
                <small v-if="!selectedHoliday" class="booking-form__hint">{{ timeScheduleHint }}</small>
              </label>
            </div>

            <div class="booking-form__pair">
              <label>
                <span>Имя родителя или организатора</span>
                <input v-model="form.parentName" type="text" maxlength="80" placeholder="Например, Анна" autocomplete="name" />
              </label>
              <label>
                <span>Имя ребёнка</span>
                <input v-model="form.childName" type="text" maxlength="80" placeholder="Например, Миша" />
              </label>
            </div>

            <div class="booking-form__pair">
              <label>
                <span>Возраст ребёнка</span>
                <input
                  v-model="form.childAge"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="2"
                  placeholder="Например, 10"
                  @input="sanitizeDigits('childAge', 2)"
                />
              </label>
              <label>
                <span>Номер телефона родителя</span>
                <input
                  v-model="form.phone"
                  type="tel"
                  inputmode="tel"
                  maxlength="18"
                  placeholder="Например, +7 978 712-93-81"
                  autocomplete="tel"
                  required
                  @input="sanitizeDigits('phone', 15)"
                />
              </label>
            </div>

            <label>
              <span>Количество детей</span>
              <input v-model.number="form.childrenCount" type="number" min="1" step="1" inputmode="numeric" placeholder="Например, 15" />
            </label>

            <label>
              <span>Комментарий</span>
              <textarea
                v-model="form.notes"
                rows="4"
                maxlength="1000"
                placeholder="Что важно: любимая тема, площадка, пожелания по таймингу или вау-эффекту"
              />
            </label>

            <label class="booking-form__honeypot" aria-hidden="true">
              <span>Сайт</span>
              <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" />
            </label>

            <label class="booking-form__consent">
              <input v-model="form.consentAccepted" type="checkbox" required />
              <span>
                Я согласен(на) на
                <a href="/personal-data-consent" target="_blank" rel="noopener noreferrer">обработку персональных данных</a>
                и ознакомлен(а) с
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>.
              </span>
            </label>

            <button class="btn btn--primary booking-form__submit" type="submit" :disabled="leadSubmitting">
              {{ leadSubmitting ? 'Отправляем...' : 'Отправить заявку' }}
            </button>

            <p v-if="leadSuccess" class="sr-only">{{ leadSuccess }}</p>
            <p v-if="leadError" class="booking-form__status booking-form__status--error" role="alert">
              <template v-if="leadError.includes(bookingContact.phone)">
                Не удалось отправить заявку. Пожалуйста, позвоните нам:
                <a :href="safeHref(bookingContact.phoneHref)">{{ bookingContact.phone }}</a>
              </template>
              <template v-else>{{ leadError }}</template>
            </p>
          </form>

          <aside class="booking-summary">
            <article class="booking-summary__program">
              <p class="booking-summary__eyebrow">Выбранная программа</p>
              <h3>{{ selectedProgram.title }}</h3>
              <strong>{{ bookingProgramPrice }}</strong>
              <span v-if="isPromoProgram(selectedProgram) && promoIsActive">
                Акция до {{ promoOffer.deadlineLabel }}: {{ promoOffer.duration }}, {{ promoOffer.place }},
                {{ promoOffer.audience }}, {{ promoOffer.gift }}.
              </span>
              <span>{{ typeLabels[selectedProgram.category] }}</span>
            </article>

            <article class="booking-summary__preview">
              <p class="booking-summary__eyebrow">Текст для отправки</p>
              <pre>{{ bookingMessage }}</pre>
            </article>

            <a v-if="isResidence" class="btn btn--secondary" :href="bookingContact.phoneHref">Позвонить {{ bookingContact.phone }}</a>
            <a v-else class="btn btn--secondary" :href="safeHref(brand.chatUrl)" :target="linkTarget(brand.chatUrl)" rel="noopener noreferrer">
              Написать в VK
            </a>
          </aside>
        </div>
      </section>
    </main>

    <footer class="footer">
      <nav class="footer__links" aria-label="Нижняя навигация">
        <a href="/" @click.prevent="navigateTo('home', 'hero')">Главная</a>
        <a href="/new-year">Новый год</a>
        <a href="/programs" @click.prevent="navigateTo('catalog')">Программы</a>
        <a href="/gallery" @click.prevent="navigateTo('gallery')">Фото</a>
        <a href="/reviews" @click.prevent="navigateTo('reviews')">Отзывы</a>
        <a href="/contacts" @click.prevent="navigateTo('contacts')">Контакты</a>
        <a href="/privacy-policy" @click.prevent="navigateTo('privacyPolicy')">Политика данных</a>
        <a href="/cookie-policy" @click.prevent="navigateTo('cookiePolicy')">Политика cookie</a>
        <button type="button" @click="openCookieSettings">Настройки cookie</button>
      </nav>
      <p>
        {{ brand.name }} — организация детских праздников в Керчи. {{ brand.address }}.
        <a :href="safeHref(brand.phoneHref)">{{ brand.phone }}</a>.
      </p>
      <p v-if="SHOW_INSTAGRAM_LINK" class="footer__warning">
        {{ INSTAGRAM_LEGAL_WARNING }}
      </p>
    </footer>
    <CookieConsent />
  </div>
</template>
