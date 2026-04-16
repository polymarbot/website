<script setup lang="ts">
// Discriminated union for props based on multiple mode
type SingleModeProps = {
  multiple?: false
  modelValue?: MarketSymbolType
}

type MultipleModeProps = {
  multiple?: true
  modelValue?: MarketSymbolType[]
}

type MarketSymbolSelectProps = (SingleModeProps | MultipleModeProps) & {
  placeholder?: string
}

const props = withDefaults(defineProps<MarketSymbolSelectProps>(), {
  modelValue: undefined,
  placeholder: undefined,
  multiple: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: MarketSymbolType | MarketSymbolType[] | undefined]
}>()

const T = useTranslations('components.app.MarketSymbolSelect')

// Two-way binding
const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value as any),
})

// Generate options from MarketSymbol enum
const options = computed(() =>
  Object.values(MarketSymbol).map(symbol => ({
    label: getSymbolName(symbol),
    value: symbol,
  })),
)
</script>

<template>
  <Select
    v-model="model"
    :options="options"
    :placeholder="placeholder ?? T('placeholder')"
    :multiple="multiple"
    display="chip"
  >
    <!-- Value slot: used for single mode display and chip content in multiple mode -->
    <template #value="{ value, option }">
      <div
        v-if="value"
        class="flex items-center gap-2"
      >
        <img
          :src="getSymbolImage(value)"
          :alt="option?.label"
          class="size-4 rounded-full"
        >
        {{ option?.label }}
      </div>
    </template>

    <!-- Option display with icon -->
    <template #option="{ option }">
      <div class="flex items-center gap-2">
        <img
          :src="getSymbolImage(option.value)"
          :alt="option.label"
          class="size-5 rounded-full"
        >
        {{ option.label }}
      </div>
    </template>
  </Select>
</template>
