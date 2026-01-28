<script setup lang="ts">
import type { MenuItem } from '~/components/ui/Menu.vue'

export interface DropdownProps {
  /** Menu items to display in the dropdown (not required when using popup slot) */
  menus?: MenuItem[]
  /** Trigger mode for showing the dropdown */
  trigger?: 'click' | 'hover'
  /** Index of the active/highlighted menu item */
  activeIndex?: number
}

const props = withDefaults(defineProps<DropdownProps>(), {
  menus: () => [],
  trigger: 'hover',
  activeIndex: undefined,
})

const slots = defineSlots<{
  default?: () => unknown
  popup?: (props: { hide: () => void }) => unknown
}>()

const { isMobile } = useDevice()

// Force click trigger on mobile devices for better touch experience
const effectiveTrigger = computed(() => {
  return isMobile.value ? 'click' : props.trigger
})

const menuRef = useTemplateRef<{
  toggle: (event: Event) => void
  show: (event: Event) => void
  hide: () => void
}>('menuRef')

let hideTimeout: ReturnType<typeof setTimeout> | null = null

const clearHideTimeout = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

const handleTriggerClick = (event: Event) => {
  if (effectiveTrigger.value === 'click') {
    menuRef.value?.toggle(event)
  }
}

const handleTriggerEnter = (event: Event) => {
  if (effectiveTrigger.value === 'hover') {
    clearHideTimeout()
    menuRef.value?.show(event)
  }
}

const handleTriggerLeave = () => {
  if (effectiveTrigger.value === 'hover') {
    hideTimeout = setTimeout(() => {
      menuRef.value?.hide()
    }, 100)
  }
}

const handleMenuEnter = () => {
  if (effectiveTrigger.value === 'hover') {
    clearHideTimeout()
  }
}

const handleMenuLeave = () => {
  if (effectiveTrigger.value === 'hover') {
    hideTimeout = setTimeout(() => {
      menuRef.value?.hide()
    }, 100)
  }
}

onBeforeUnmount(() => {
  clearHideTimeout()
})
</script>

<template>
  <div class="inline-block">
    <div
      class="h-full"
      @click="handleTriggerClick"
      @mouseenter="handleTriggerEnter"
      @mouseleave="handleTriggerLeave"
    >
      <slot />
    </div>

    <!-- Custom popup content using Popover -->
    <PrimePopover
      v-if="slots.popup"
      ref="menuRef"
      @mouseenter="handleMenuEnter"
      @mouseleave="handleMenuLeave"
    >
      <slot
        name="popup"
        :hide="() => menuRef?.hide()"
      />
    </PrimePopover>

    <!-- Default menu dropdown -->
    <PrimeMenu
      v-else
      ref="menuRef"
      :model="menus"
      popup
      @mouseenter="handleMenuEnter"
      @mouseleave="handleMenuLeave"
    >
      <template #item="{ item, props: itemProps }">
        <WebLink
          unstyled
          class="flex items-center gap-2"
          :class="[
            item.class,
            { 'font-semibold bg-emphasis': activeIndex !== undefined && menus.indexOf(item) === activeIndex },
          ]"
          :href="item.url"
          v-bind="itemProps.action"
        >
          <span
            v-if="item.icon"
            :class="item.icon"
          />
          <span>{{ item.label }}</span>
        </WebLink>
      </template>
    </PrimeMenu>
  </div>
</template>
