import { CONTACT_PHONE, CONTACT_PHONE_HREF } from './siteConfig'

interface HolidayPoster {
  id: string
  title: string
  audience: string
  detail: string
  image: string
  phone: string
  phoneHref: string
}

export interface HolidayProgram extends HolidayPoster {
  price: number | null
  duration?: string
  schedule?: string
  location?: string
  tickets?: string
}

const contact = { phone: CONTACT_PHONE, phoneHref: CONTACT_PHONE_HREF }

export const residenceDate = '2026-12-27'
export const residenceSessions = ['10:00–12:00', '13:00–15:00']

export const holidayPrograms: HolidayProgram[] = [
  {
    id: 'residence',
    title: 'Резиденция Деда Мороза',
    audience: 'Для семей, классов и групп',
    detail: 'Письмо Деду Морозу с эльфом, мини-шоу мыльных пузырей, хоровод, зимние игры, чаепитие и фото на память.',
    image: 'residence',
    price: 1500,
    duration: '2 часа',
    schedule: '27 декабря 2026 · 10:00–12:00 или 13:00–15:00',
    location: 'Санаторий «Москва-Крым». Ярмарка и мастер-классы с 10:00 до 16:00.',
    tickets: 'Билет на ребёнка. Оплата только за ребёнка.',
    phone: '+7 978 595-61-20',
    phoneHref: 'tel:+79785956120',
  },
  {
    id: 'hostess',
    title: 'Хозяйка Нового года',
    audience: 'Для дошкольников',
    detail: 'Зимние забавы, танцы и встреча с Дедом Морозом и Снегурочкой.',
    image: 'hostess',
    price: null,
    duration: '1 час · с аэро-шоу — 1,5 часа',
    ...contact,
  },
  {
    id: 'grinch',
    title: 'Гринчеринка',
    audience: 'Детям 6–10 лет',
    detail: 'Игры с Гринчем, распаковка подарков и антидискотека-сюрприз.',
    image: 'grinch',
    price: null,
    duration: '1,5 или 2 часа',
    ...contact,
  },
  {
    id: 'first-matinee',
    title: 'Первый новогодний утренник',
    audience: '0+ · для малышей с родителями',
    detail: 'Первый новогодний праздник для самых маленьких. Родители остаются рядом на протяжении праздника.',
    image: 'events',
    price: null,
    ...contact,
  },
]

export const seasonPosters: HolidayPoster[] = [
  {
    id: 'events',
    title: 'Новогодние события',
    audience: 'Для детей и родителей',
    detail: 'Первый утренник 0+, мастерская Деда Мороза, ёлки и вечеринки для школьников.',
    image: 'events',
    ...contact,
  },
  {
    id: 'trees',
    title: 'Новогодние ёлки',
    audience: 'Санаторий «Москва-Крым»',
    detail: 'Сказки для дошкольников, вечеринки для школьников и утренники для малышей с родителями.',
    image: 'trees',
    ...contact,
  },
]

export const holidayIndex = {
  path: '/new-year',
  heading: 'Новогодние утренники в Керчи 2026/2027',
  title: 'Новогодние утренники в Керчи 2026–2027 — Вайб Шоу',
  description: 'Ёлки, детские утренники и новогодние вечеринки в Керчи. Программы Вайб Шоу для детских садов, школ и семей. Афиши и запись.',
  image: '/images/new-year/trees.jpg',
}

export function holidayProgramPage(program: HolidayProgram) {
  return {
    path: `/new-year/${program.id}`,
    heading: program.title,
    title: `${program.title} в Керчи — Вайб Шоу`,
    description: [program.title + '.', program.audience + '.', program.detail, program.schedule].filter(Boolean).join(' '),
    image: `/images/new-year/${program.image}.jpg`,
  }
}

export function holidayBookingId(id: string) {
  return `new-year-${id}`
}

export function holidayBookingHref(id: string) {
  return `/?program=${holidayBookingId(id)}#booking`
}

export function formatHolidayPrice(program: HolidayProgram) {
  return program.price === null ? 'Уточнить стоимость' : `${new Intl.NumberFormat('ru-RU').format(program.price)} ₽ за ребёнка`
}
