<script lang="ts">
import type { SelectProps as BaseSelectProps } from 'primevue/select'
import type { MultiSelectProps as BaseMultiSelectProps } from 'primevue/multiselect'

export interface SelectOption<V extends string | number, M = unknown> {
  label: string
  value: V
  disabled?: boolean
  meta?: M
}

// Base props shared by both modes
type BaseProps<V extends string | number, M = unknown> = {
  options?: SelectOption<V, M>[]
  /** Display mode for selected items (multiple mode only) */
  display?: 'comma' | 'chip'
} & /* @vue-ignore */ Omit<BaseSelectProps & BaseMultiSelectProps, 'options' | 'modelValue' | 'display'>

// Discriminated union for single/multiple mode
type SingleModeProps<V extends string | number, M = unknown> = BaseProps<V, M> & {
  multiple?: false
  modelValue?: V | null
}

type MultipleModeProps<V extends string | number, M = unknown> = BaseProps<V, M> & {
  multiple?: true
  modelValue?: V[]
}

export type SelectProps<V extends string | number, M = unknown>
  = | SingleModeProps<V, M>
    | MultipleModeProps<V, M>
</script>

<script setup lang="ts" generic="TValue extends string | number, TMeta = unknown">
type Option = SelectOption<TValue, TMeta>

const props = withDefaults(defineProps<SelectProps<TValue, TMeta>>(), {
  options: () => [],
  multiple: false,
  modelValue: undefined,
  display: 'comma',
})

const emit = defineEmits<{
  'update:modelValue': [value: TValue | TValue[] | null]
}>()

// Two-way binding
const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value as any),
})

// Find option by value from options array
function findOptionByValue (value: TValue | undefined): Option | null {
  if (value === undefined || value === null) return null
  return props.options?.find(opt => opt.value === value) ?? null
}

// Find multiple options by values from options array
function findOptionsByValues (values: TValue[] | undefined): Option[] {
  if (!values || !Array.isArray(values)) return []
  return values
    .map(value => findOptionByValue(value))
    .filter((opt): opt is Option => opt !== null)
}

// Slots to exclude from generic forwarding
const excludedSlots = computed(() =>
  props.multiple
    ? [ 'value', 'chip' ]
    : [ 'value' ],
)
</script>

<template>
  <!-- Multiple selection mode -->
  <PrimeMultiSelect
    v-if="multiple"
    v-model="model"
    :options="options"
    :display="display"
    optionLabel="label"
    optionValue="value"
    optionDisabled="disabled"
    filter
  >
    <template
      v-for="name in Object.keys($slots).filter(n => !excludedSlots.includes(n))"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>

    <!-- Value slot with options data (only when values are selected, non-chip mode) -->
    <template
      v-if="$slots.value && display !== 'chip'"
      #value="slotProps"
    >
      <slot
        v-if="slotProps.value && slotProps.value.length > 0"
        name="value"
        v-bind="slotProps"
        :options="findOptionsByValues(slotProps.value)"
      />
      <span
        v-else
        class="text-muted-color"
      >
        {{ slotProps.placeholder }}
      </span>
    </template>

    <!-- Chip slot: use chip slot if provided, otherwise use value slot in chip mode -->
    <template
      v-if="$slots.chip || (display === 'chip' && $slots.value)"
      #chip="slotProps"
    >
      <Chip
        removable
        @remove="slotProps.removeCallback($event, slotProps.value)"
      >
        <slot
          :name="$slots.chip ? 'chip' : 'value'"
          v-bind="slotProps"
          :value="slotProps.value"
          :option="findOptionByValue(slotProps.value)"
        />
      </Chip>
    </template>
  </PrimeMultiSelect>

  <!-- Single selection mode (default) -->
  <PrimeSelect
    v-else
    v-model="model"
    :options="options"
    optionLabel="label"
    optionValue="value"
    optionDisabled="disabled"
  >
    <template
      v-for="name in Object.keys($slots).filter(n => !excludedSlots.includes(n))"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>

    <!-- Value slot with option data (only when value is selected) -->
    <template
      v-if="$slots.value"
      #value="slotProps"
    >
      <slot
        v-if="slotProps.value !== undefined && slotProps.value !== null"
        name="value"
        v-bind="slotProps"
        :option="findOptionByValue(slotProps.value)"
      />
      <span
        v-else
        class="text-muted-color"
      >
        {{ slotProps.placeholder }}
      </span>
    </template>
  </PrimeSelect>
</template>
