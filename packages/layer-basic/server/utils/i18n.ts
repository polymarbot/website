export async function getTranslations (event: Parameters<typeof useTranslation>[0], namespace: string | null = null): Promise<Awaited<ReturnType<typeof useTranslation>>> {
  const t = await useTranslation(event)

  if (!namespace) {
    return t
  }

  type TFunc = typeof t
  return ((key: Parameters<TFunc>[0], ...args: Parameters<TFunc> extends [any, ...infer R] ? R : never) => {
    return t(`${namespace}.${key}`, ...args)
  }) as TFunc
}
