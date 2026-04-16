<script setup lang="ts">
const T = useTranslations('pages.(homepage)')
const runtimeConfig = useRuntimeConfig()
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
          mb-4 text-lg text-muted-color
          md:text-xl
        "
      >
        {{ T('tagline') }}
      </p>
      <!-- Mobile: vertical layout -->
      <div
        class="
          mx-auto mb-8 flex w-fit flex-col items-center gap-5 rounded-2xl
          bg-black/5 px-8 py-5 text-2xl backdrop-blur-sm
          md:hidden
          dark:bg-white/5
        "
      >
        <div class="flex flex-col items-center gap-1.5">
          <span class="hero-slogan-text">
            {{ T('slogan.line1Left') }}
          </span>
          <span class="hero-slogan-symbol-v">
            <span class="hero-slogan-line-v" />
          </span>
          <span class="hero-slogan-text">
            {{ T('slogan.line1Right') }}
          </span>
        </div>

        <span class="hero-slogan-divider" />

        <div class="flex flex-col items-center gap-1.5">
          <span class="hero-slogan-text">
            {{ T('slogan.line2Left') }}
          </span>
          <span class="hero-slogan-symbol-v">
            <span class="hero-slogan-line-v" />
            <span class="hero-slogan-line-v" />
          </span>
          <span>
            <span class="hero-slogan-text">
              {{ T('slogan.line2Right') }}
            </span>
            <span class="ml-1">
              🤑
            </span>
          </span>
        </div>
      </div>

      <!-- Desktop: horizontal grid layout -->
      <div
        class="
          mx-auto mb-8 hidden w-fit grid-cols-[1fr_auto_1fr] items-center
          gap-x-6 gap-y-4 rounded-2xl bg-black/5 px-8 py-4 text-3xl
          backdrop-blur-sm
          md:grid
          dark:bg-white/5
        "
      >
        <span class="hero-slogan-text text-right">
          {{ T('slogan.line1Left') }}
        </span>
        <span class="hero-slogan-symbol-h">
          <span class="hero-slogan-line-h" />
        </span>
        <span class="hero-slogan-text text-left">
          {{ T('slogan.line1Right') }}
        </span>

        <span class="hero-slogan-divider col-span-3" />

        <span class="hero-slogan-text text-right">
          {{ T('slogan.line2Left') }}
        </span>
        <span class="hero-slogan-symbol-h">
          <span class="hero-slogan-line-h" />
          <span class="hero-slogan-line-h" />
        </span>
        <span class="text-left">
          <span class="hero-slogan-text">
            {{ T('slogan.line2Right') }}
          </span>
          <span class="ml-1">
            🤑
          </span>
        </span>
      </div>
      <Button
        :label="T('launchApp')"
        icon="pi pi-arrow-right"
        iconPos="right"
        :href="runtimeConfig.public.appOrigin"
        size="large"
      />
    </div>
  </section>
</template>

<style scoped>
.hero-slogan-text {
  font-weight: bold;
  letter-spacing: 0.05em;
  background: linear-gradient(270deg, #0891b2, #059669, #65a30d, #0891b2);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: slogan-gradient-shift 4s ease infinite, slogan-glow-pulse 2s ease-in-out infinite alternate;
}

:where(.dark) .hero-slogan-text {
  background: linear-gradient(270deg, #22d3ee, #34d399, #a3e635, #22d3ee);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes slogan-gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes slogan-glow-pulse {
  from { filter: drop-shadow(0 0 6px rgba(8, 145, 178, 0.3)); }
  to { filter: drop-shadow(0 0 16px rgba(5, 150, 105, 0.6)); }
}

/* Horizontal symbol: — and = */
.hero-slogan-symbol-h {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 20px;
}

.hero-slogan-line-h {
  display: block;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background-color: rgb(0 0 0 / 0.3);
}

/* Vertical symbol: | and || */
.hero-slogan-symbol-v {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 14px;
}

.hero-slogan-line-v {
  display: block;
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background-color: rgb(0 0 0 / 0.3);
}

.hero-slogan-divider {
  display: block;
  width: 100%;
  height: 1px;
  background-color: rgb(0 0 0 / 0.15);
}

:where(.dark) .hero-slogan-divider,
:where(.dark) .hero-slogan-line-h,
:where(.dark) .hero-slogan-line-v {
  background-color: rgb(255 255 255 / 0.3);
}
</style>
