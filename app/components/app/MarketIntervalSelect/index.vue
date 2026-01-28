<script setup lang="ts">
import { getIntervalLabel, getIntervalLabelWithMinutes } from './utils'

// Discriminated union for props based on multiple mode
type SingleModeProps = {
  multiple?: false
  modelValue?: MarketIntervalType
}

type MultipleModeProps = {
  multiple?: true
  modelValue?: MarketIntervalType[]
}

type MarketIntervalSelectProps = (SingleModeProps | MultipleModeProps) & {
  placeholder?: string
  /** Show minutes suffix in interval labels, e.g. "1 Day (1440m)" */
  showMinutes?: boolean
}

const props = withDefaults(defineProps<MarketIntervalSelectProps>(), {
  modelValue: undefined,
  placeholder: undefined,
  multiple: false,
  showMinutes: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: MarketIntervalType | MarketIntervalType[] | undefined]
}>()

const T = useTranslations('components.app.MarketIntervalSelect')

// Two-way binding
const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value as any),
})

// Generate options from MarketInterval enum with translated labels
const options = computed(() =>
  Object.values(MarketInterval).map(interval => ({
    label: props.showMinutes ? getIntervalLabelWithMinutes(interval) : getIntervalLabel(interval),
    value: interval,
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
  />
</template>
