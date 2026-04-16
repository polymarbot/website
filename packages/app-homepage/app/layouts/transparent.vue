<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <div>
    <!-- Header with blur gradient background -->
    <header
      class="
        fixed top-0 right-0 left-0 z-100 flex h-14 items-center justify-between
        px-4
      "
    >
      <!-- Blur gradient background layer -->
      <div
        class="
          pointer-events-none absolute inset-0
          [mask-image:linear-gradient(to_bottom,black,transparent)]
          backdrop-blur-md
        "
      />

      <!-- Logo + App Name -->
      <div class="relative flex items-center gap-2">
        <IconLogo
          :size="28"
          class="text-primary"
        />
        <span class="text-lg font-semibold">
          {{ runtimeConfig.public.appName }}
        </span>
      </div>

      <!-- Controls -->
      <div class="relative flex items-center gap-2">
        <AppLanguageSwitcher />
        <AppDarkModeSwitcher />
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>
  </div>
</template>
