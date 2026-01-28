<script setup lang="ts">
import type { CardProps as BaseCardProps } from 'primevue/card'

export interface PageCardBackConfig {
  action: () => void
}

export interface PageCardProps extends /* @vue-ignore */ BaseCardProps {
  title?: string
  subtitle?: string
  back?: boolean | PageCardBackConfig
  ready?: boolean
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<PageCardProps>(), {
  title: undefined,
  subtitle: undefined,
  back: undefined,
  ready: true,
})

const router = useRouter()
const { isMobile } = useDevice()

const hasBack = computed(() => {
  if (!props.back) return false
  // On mobile, hide back button when no explicit action is provided,
  // because the app/Navbar component already handles back navigation on mobile.
  if (isMobile.value && !(typeof props.back === 'object' && props.back.action)) return false
  return true
})

function handleBack () {
  if (typeof props.back === 'object' && props.back.action) {
    props.back.action()
  } else {
    router.back()
  }
}
</script>

<template>
  <PrimeCard
    :pt="{
      root: {
        class: 'min-h-full',
      },
      body: {
        class: [
          'gap-0 py-0 px-4 sm:px-5',
          ready && disabled ? 'pointer-events-none opacity-50' : undefined,
        ],
      },
      caption: {
        class: [
          'py-4',
        ],
      },
      content: {
        class: [
          !!$slots.title || !!title || !ready ? 'pt-4 border-t border-surface' : 'pt-6',
          !!$slots.footer ? 'pb-4 border-b border-surface' : 'pb-6',
        ],
      },
      footer: {
        class: [
          'py-4',
        ],
      },
    }"
  >
    <!-- Skeleton state -->
    <template
      v-if="!ready"
      #title
    >
      <Skeleton
        height="1.5rem"
        width="40%"
      />
    </template>
    <template
      v-else-if="!!$slots.title || !!title || !!$slots.subtitle || !!subtitle || hasBack"
      #title
    >
      <div class="flex items-center gap-2">
        <Button
          v-if="hasBack"
          severity="secondary"
          text
          icon="pi pi-arrow-left"
          @click="handleBack"
        />
        <div class="flex-1">
          <slot
            v-if="!!$slots.title || !!title"
            name="title"
          >
            {{ title }}
          </slot>
          <div
            v-if="!!$slots.subtitle || !!subtitle"
            class="mt-1 text-base text-muted-color"
          >
            <slot name="subtitle">
              {{ subtitle }}
            </slot>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <div
        v-if="!ready"
        class="flex flex-col gap-6"
      >
        <!-- Section 1: Intro paragraph -->
        <div class="flex flex-col gap-2">
          <Skeleton height="1rem" />
          <Skeleton
            height="1rem"
            width="92%"
          />
          <Skeleton
            height="1rem"
            width="45%"
          />
        </div>

        <!-- Section 2: With subheading -->
        <div class="flex flex-col gap-3">
          <Skeleton
            height="1.25rem"
            width="30%"
          />
          <div class="flex flex-col gap-2">
            <Skeleton height="1rem" />
            <Skeleton
              height="1rem"
              width="88%"
            />
            <Skeleton
              height="1rem"
              width="95%"
            />
            <Skeleton
              height="1rem"
              width="60%"
            />
          </div>
        </div>

        <!-- Section 3: With subheading -->
        <div class="flex flex-col gap-3">
          <Skeleton
            height="1.25rem"
            width="25%"
          />
          <div class="flex flex-col gap-2">
            <Skeleton height="1rem" />
            <Skeleton
              height="1rem"
              width="90%"
            />
            <Skeleton
              height="1rem"
              width="70%"
            />
          </div>
        </div>

        <!-- Section 4: With subheading and longer content -->
        <div class="flex flex-col gap-3">
          <Skeleton
            height="1.25rem"
            width="35%"
          />
          <div class="flex flex-col gap-2">
            <Skeleton height="1rem" />
            <Skeleton
              height="1rem"
              width="94%"
            />
            <Skeleton
              height="1rem"
              width="87%"
            />
            <Skeleton
              height="1rem"
              width="92%"
            />
            <Skeleton
              height="1rem"
              width="50%"
            />
          </div>
        </div>

        <!-- Section 5: Short section -->
        <div class="flex flex-col gap-3">
          <Skeleton
            height="1.25rem"
            width="28%"
          />
          <div class="flex flex-col gap-2">
            <Skeleton height="1rem" />
            <Skeleton
              height="1rem"
              width="85%"
            />
            <Skeleton
              height="1rem"
              width="40%"
            />
          </div>
        </div>

        <!-- Section 6: Final section -->
        <div class="flex flex-col gap-3">
          <Skeleton
            height="1.25rem"
            width="22%"
          />
          <div class="flex flex-col gap-2">
            <Skeleton height="1rem" />
            <Skeleton
              height="1rem"
              width="88%"
            />
            <Skeleton
              height="1rem"
              width="75%"
            />
            <Skeleton
              height="1rem"
              width="55%"
            />
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <PrimeBlockUI
        v-else-if="loading"
        blocked
      >
        <div
          v-if="loading"
          class="absolute inset-0 z-1200 flex items-center justify-center"
        >
          <i class="pi pi-spin pi-spinner text-4xl text-surface-200" />
        </div>
        <slot />
      </PrimeBlockUI>

      <div v-else>
        <slot />
      </div>
    </template>

    <template
      v-if="ready && !!$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </PrimeCard>
</template>
