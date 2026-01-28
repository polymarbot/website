<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

defineProps<{
  buttonClass?: string
  nameClass?: string
}>()

const { t } = useI18n()
const T = useTranslations('components.app.ProfileDropdown')
const { user, signOutWithConfirm } = useAuth()
const appConfig = useAppConfig()

const menuItems = computed<MenuItem[]>(() => [
  {
    label: T('reportIssue'),
    icon: 'pi pi-flag',
    url: appConfig.links.issues,
  },
  { separator: true },
  {
    label: t('common.actions.signOut'),
    icon: 'pi pi-sign-out',
    command: signOutWithConfirm,
  },
])
</script>

<template>
  <Dropdown
    :menus="menuItems"
    trigger="click"
  >
    <Button
      text
      :class="buttonClass"
    >
      <Avatar
        :image="user?.image || undefined"
        :fallbackLabel="user?.name?.charAt(0)?.toUpperCase()"
        size="small"
        shape="circle"
      />
      <span
        class="text-sm"
        :class="nameClass"
      >
        {{ user?.name }}
      </span>
    </Button>
  </Dropdown>
</template>
