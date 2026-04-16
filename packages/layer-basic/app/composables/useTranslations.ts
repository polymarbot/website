export function useTranslations (namespace?: string) {
  const { t } = useI18n()

  if (!namespace) {
    return t
  }

  type TFunc = typeof t
  return ((key: Parameters<TFunc>[0], ...args: Parameters<TFunc> extends [any, ...infer R] ? R : never) => {
    return t(`${namespace}.${key}`, ...args)
  }) as TFunc
}
