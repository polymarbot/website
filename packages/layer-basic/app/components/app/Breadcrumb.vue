<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

const { t, te, locale, locales } = useI18n()
const route = useRoute()
const router = useRouter()

// Get all locale codes to filter them out from breadcrumb path
const localeCodes = computed(() => locales.value.map(l => l.code) as string[])

/**
 * Build breadcrumb items by traversing route path hierarchy
 * For each path segment, find the matching route and get its meta.title
 */
const breadcrumbItems = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  const items: MenuItem[] = []

  let currentPath = ''
  for (const segment of pathSegments) {
    currentPath += `/${segment}`

    // Skip locale prefix and 'app' segment
    if (localeCodes.value.includes(segment) || segment === 'app') continue

    // Find matching route for this path
    const resolved = router.resolve(currentPath)
    const title = resolved.meta?.title as string | undefined

    // Skip routes without a title (e.g., redirect pages)
    if (!title) continue

    // Use translated title if available, otherwise capitalize segment
    const label = te(title) ? t(title) : segment.charAt(0).toUpperCase() + segment.slice(1)

    // Last item has no link
    const isLast = currentPath === route.path.replace(`/${locale.value}`, '')
    items.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  }

  return items
})
</script>

<template>
  <Breadcrumb
    :model="breadcrumbItems"
    class="bg-transparent p-0"
  >
    <template #item="{ item, props }">
      <NuxtLink
        v-if="item.href"
        :to="item.href"
        v-bind="props.action"
      >
        {{ item.label }}
      </NuxtLink>
      <span
        v-else
        class="font-semibold text-color"
        v-bind="props.action"
      >
        {{ item.label }}
      </span>
    </template>
  </Breadcrumb>
</template>
