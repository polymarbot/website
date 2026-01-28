<script setup lang="ts">
/**
 * UpgradeOverlay Component
 *
 * A blur overlay with upgrade prompt, used to restrict access to
 * premium features for users without the required subscription.
 *
 * Can wrap any content - when `show` is false, renders content normally.
 * When `show` is true, applies blur effect and shows upgrade prompt.
 */

export interface UpgradeOverlayProps {
  /** Whether to show the overlay (default: true) */
  show?: boolean
  /** Title text displayed on the overlay */
  title?: string
  /** Description text displayed on the overlay */
  description?: string
  /** Button label text */
  buttonLabel?: string
  /** Whether to show the blur effect */
  blur?: boolean
  /** Show icon */
  showIcon?: boolean
  /** Use sticky positioning for long scrollable containers (default: false, uses centered positioning) */
  sticky?: boolean
}

withDefaults(defineProps<UpgradeOverlayProps>(), {
  show: true,
  title: undefined,
  description: undefined,
  buttonLabel: undefined,
  blur: true,
  showIcon: true,
  sticky: false,
})

const T = useTranslations('components.app.UpgradeOverlay')

// Navigate to subscription page
function handleUpgrade () {
  navigateTo('/app/subscription')
}
</script>

<template>
  <!-- When overlay is hidden, just render the slot content -->
  <template v-if="!show">
    <slot />
  </template>

  <!-- When overlay is shown, use grid layout to stack content and overlay -->
  <div
    v-else
    class="grid"
  >
    <!-- Slot content (blurred) - occupies grid cell -->
    <div
      class="z-0 col-start-1 row-start-1"
      :class="blur && 'pointer-events-none blur-sm select-none'"
    >
      <slot />
    </div>

    <!-- Overlay - same grid cell, stacked on top -->
    <div
      class="bg-surface/80 z-10 col-start-1 row-start-1 rounded-lg"
      :class="!sticky && 'flex items-center justify-center'"
    >
      <!-- Prompt container: centered by default, sticky for long containers -->
      <div
        class="flex flex-col items-center gap-4 py-8"
        :class="sticky && 'sticky top-[30vh]'"
      >
        <!-- Lock icon -->
        <div
          v-if="showIcon"
          class="
            flex size-16 items-center justify-center rounded-full bg-primary/10
          "
        >
          <i class="pi pi-lock text-3xl text-primary" />
        </div>

        <!-- Title -->
        <h3 class="text-lg font-semibold text-color">
          {{ title ?? T('title') }}
        </h3>

        <!-- Description -->
        <p class="max-w-sm text-center text-sm text-muted-color">
          {{ description ?? T('description') }}
        </p>

        <!-- Upgrade button -->
        <Button
          :label="buttonLabel ?? T('upgradeButton')"
          severity="primary"
          icon="pi pi-arrow-up"
          @click="handleUpgrade"
        />
      </div>
    </div>
  </div>
</template>
