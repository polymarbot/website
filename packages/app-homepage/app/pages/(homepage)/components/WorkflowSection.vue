<script setup lang="ts">
const T = useTranslations('pages.(homepage)')

const steps = [
  { icon: 'pi-user-plus', key: 'signUp' },
  { icon: 'pi-wallet', key: 'addWallets' },
  { icon: 'pi-cog', key: 'createStrategies' },
  { icon: 'pi-play-circle', key: 'deployBots' },
]
</script>

<template>
  <section
    class="
      px-4 py-16
      md:py-24
      lg:py-32
      xl:py-40
    "
  >
    <div class="mx-auto max-w-6xl">
      <h2
        class="
          mb-4 text-center text-3xl font-bold text-color
          md:text-4xl
        "
      >
        {{ T('workflow.title') }}
      </h2>
      <p class="mx-auto mb-12 max-w-2xl text-center text-muted-color">
        {{ T('workflow.subtitle') }}
      </p>

      <!-- Desktop: Horizontal Timeline -->
      <div
        class="
          hidden
          md:block
        "
      >
        <div class="relative flex justify-between">
          <!-- Connection line -->
          <div
            class="
              absolute top-10 right-0 left-0 h-0.5 bg-surface-300
              dark:bg-surface-600
            "
          />

          <div
            v-for="(step, index) in steps"
            :key="step.key"
            class="relative z-10 flex flex-1 flex-col items-center px-4"
          >
            <!-- Step number with icon -->
            <div
              class="
                mb-4 flex size-20 items-center justify-center rounded-full
                border-4 border-primary bg-surface
              "
            >
              <i :class="[ 'pi', step.icon, 'text-2xl text-primary' ]" />
            </div>
            <!-- Step number badge -->
            <div
              class="
                mb-2 flex size-6 items-center justify-center rounded-full
                bg-primary text-xs font-bold text-primary-contrast
              "
            >
              {{ index + 1 }}
            </div>
            <h3 class="mb-2 text-center text-lg font-semibold text-color">
              {{ T(`workflow.steps.${step.key}.title`) }}
            </h3>
            <p class="text-center text-sm text-muted-color">
              {{ T(`workflow.steps.${step.key}.description`) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Mobile: Vertical Timeline -->
      <div class="md:hidden">
        <div class="mx-auto w-fit">
          <div
            v-for="(step, index) in steps"
            :key="step.key"
            class="
              relative mb-8 flex items-start gap-5
              last:mb-0
            "
          >
            <!-- Step icon with connecting line -->
            <div class="relative flex flex-col items-center">
              <div
                class="
                  z-10 flex size-16 items-center justify-center rounded-full
                  border-4 border-primary bg-surface
                "
              >
                <i :class="[ 'pi', step.icon, 'text-xl text-primary' ]" />
              </div>
              <!-- Vertical line (except last item) -->
              <div
                v-if="index < steps.length - 1"
                class="
                  absolute top-16 h-[calc(100%+2rem)] w-0.5 bg-surface-300
                  dark:bg-surface-600
                "
              />
            </div>
            <!-- Content -->
            <div class="py-1.5">
              <div class="mb-1 flex items-center gap-2">
                <span
                  class="
                    flex size-5 items-center justify-center rounded-full
                    bg-primary text-xs font-bold text-primary-contrast
                  "
                >
                  {{ index + 1 }}
                </span>
                <h3 class="text-lg font-semibold text-color">
                  {{ T(`workflow.steps.${step.key}.title`) }}
                </h3>
              </div>
              <p class="text-sm text-muted-color">
                {{ T(`workflow.steps.${step.key}.description`) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
