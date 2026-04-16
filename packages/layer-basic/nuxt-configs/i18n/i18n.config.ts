import type { DateTimeFormat, NumberFormat } from '@intlify/core-base'
import type { LocaleCode } from './locales'
import i18nLocales from './locales'

const defaultDatetimeFormat: DateTimeFormat = {
  short: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
  medium: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  },
  long: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  },
}

const defaultNumberFormat: NumberFormat = {
  currency: {
    style: 'currency', currency: 'USD', notation: 'standard',
  },
  decimal: {
    style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2,
  },
  percent: {
    style: 'percent', useGrouping: false,
  },
}

type LocaleFormats<T> = Record<LocaleCode, T>

export default defineI18nConfig(() => ({
  datetimeFormats: Object.fromEntries(
    i18nLocales.map(locale => [ locale.code, defaultDatetimeFormat ]),
  ) as LocaleFormats<DateTimeFormat>,
  numberFormats: Object.fromEntries(
    i18nLocales.map(locale => [ locale.code, defaultNumberFormat ]),
  ) as LocaleFormats<NumberFormat>,
}))
