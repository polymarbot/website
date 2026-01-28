<script setup lang="ts">
const T = useTranslations('pages.(homepage)')
</script>

<template>
  <section
    class="
      relative flex min-h-[100svh] items-center justify-center overflow-hidden
      pb-7
    "
  >
    <EffectBackgroundGrid />
    <div class="relative z-10 text-center">
      <h1
        class="
          mb-4 text-4xl font-bold text-color
          md:text-5xl
          lg:text-6xl
        "
      >
        <EffectTyped
          :strings="[ T('brand') ]"
          :backDelay="5000"
          loop
        />
      </h1>
      <p
        class="
          mb-8 text-lg text-muted-color
          md:text-xl
        "
      >
        {{ T('tagline') }}
      </p>
      <Button
        :label="T('launchApp')"
        icon="pi pi-arrow-right"
        iconPos="right"
        href="/app"
        size="large"
      />
    </div>
  </section>
</template>
