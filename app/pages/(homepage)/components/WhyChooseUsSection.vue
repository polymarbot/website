<script setup lang="ts">
const T = useTranslations('pages.(homepage)')

const reasons = [
  { icon: 'pi-sliders-h', key: 'easySetup' },
  { icon: 'pi-bolt', key: 'gasless' },
  { icon: 'pi-chart-line', key: 'strategyStats' },
  { icon: 'pi-wallet', key: 'multiWallet' },
  { icon: 'pi-chart-bar', key: 'realTimeAnalytics' },
  { icon: 'pi-clock', key: 'alwaysOn' },
]
</script>

<template>
  <section
    class="
      bg-surface-900 px-4 py-16
      md:py-24
      lg:py-32
      xl:py-40
    "
  >
    <div class="mx-auto max-w-6xl">
      <h2
        class="
          mb-12 text-center text-3xl font-bold text-surface-0
          md:text-4xl
        "
      >
        {{ T('whyChooseUs.title') }}
      </h2>

      <div
        class="
          grid grid-cols-1 gap-8
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <div
          v-for="reason in reasons"
          :key="reason.key"
          class="text-center"
        >
          <div
            class="
              mx-auto mb-4 flex size-16 items-center justify-center rounded-full
              bg-surface-800
            "
          >
            <i :class="[ 'pi', reason.icon, 'text-2xl text-surface-0' ]" />
          </div>
          <h3 class="mb-2 text-xl font-semibold text-surface-0">
            {{ T(`whyChooseUs.reasons.${reason.key}.title`) }}
          </h3>
          <p class="text-surface-400">
            {{ T(`whyChooseUs.reasons.${reason.key}.description`) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
