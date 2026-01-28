import type { ComposerTranslation } from 'vue-i18n'

export type { LocaleCode } from '~~/layers/i18n/locales'

/**
 * i18n translator function type from vue-i18n
 * Using relaxed generic parameters to support various locale configurations
 */
export type I18nTranslatorFn = ComposerTranslation<any, any>
