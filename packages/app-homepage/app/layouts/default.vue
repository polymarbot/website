<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <div>
    <!-- Header -->
    <header
      class="
        fixed top-0 right-0 left-0 z-10 flex h-14 items-center justify-between
        border-b border-surface bg-surface px-4
      "
    >
      <!-- Logo + App Name -->
      <div class="flex items-center gap-2">
        <IconLogo
          :size="28"
          class="text-primary"
        />
        <span class="text-lg font-semibold">
          {{ runtimeConfig.public.appName }}
        </span>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <AppLanguageSwitcher />
        <AppDarkModeSwitcher />
      </div>
    </header>

    <!-- Header Spacer -->
    <div class="h-14" />

    <!-- Main Content -->
    <main>
      <slot />
    </main>
  </div>
</template>
