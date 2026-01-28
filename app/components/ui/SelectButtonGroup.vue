<script setup lang="ts" generic="T extends string | number">
/**
 * SelectButtonGroup Component
 *
 * A group of selectable buttons with optional clear button.
 * Supports single and multiple selection modes.
 */

export interface SelectButtonOption<V = string | number> {
  label: string
  value: V
}

export interface SelectButtonGroupProps<V = string | number> {
  /** Available options */
  options: SelectButtonOption<V>[]
  /** Selected value(s) */
  modelValue: V | V[]
  /** Enable multiple selection mode */
  multiple?: boolean
  /** Show clear button when items are selected */
  showClear?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Size of the buttons */
  size?: 'small' | 'large'
}

const props = withDefaults(defineProps<SelectButtonGroupProps<T>>(), {
  multiple: false,
  showClear: false,
  disabled: false,
  size: 'small',
})

const emit = defineEmits<{
  'update:modelValue': [value: T | T[]]
}>()

const { t } = useI18n()

// Normalize modelValue to array for internal use
const selectedValues = computed<T[]>(() => {
  if (props.multiple) {
    return (props.modelValue as T[]) ?? []
  }
  return props.modelValue !== undefined && props.modelValue !== null
    ? [ props.modelValue as T ]
    : []
})

// Check if a value is selected
function isSelected (value: T): boolean {
  return selectedValues.value.includes(value)
}

// Handle button click
function handleClick (value: T) {
  if (props.disabled) return

  if (props.multiple) {
    // Multiple selection mode
    const current = selectedValues.value
    const index = current.indexOf(value)
    if (index === -1) {
      emit('update:modelValue', [ ...current, value ])
    } else {
      emit('update:modelValue', current.filter(v => v !== value))
    }
  } else {
    // Single selection mode
    if (isSelected(value)) {
      // If already selected, only allow deselection when showClear is enabled
      if (props.showClear) {
        emit('update:modelValue', undefined as unknown as T)
      }
      // Otherwise, do nothing (keep selected)
    } else {
      emit('update:modelValue', value)
    }
  }
}

// Clear all selections
function handleClear () {
  if (props.disabled) return
  if (props.multiple) {
    emit('update:modelValue', [])
  } else {
    emit('update:modelValue', undefined as unknown as T)
  }
}

// Check if clear button should be visible
const showClearButton = computed(() => {
  if (!props.showClear) return false
  return selectedValues.value.length > 0
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Button
      v-for="option in options"
      :key="String(option.value)"
      :size="size"
      :severity="isSelected(option.value) ? 'primary' : 'secondary'"
      :outlined="!isSelected(option.value)"
      :disabled="disabled"
      @click="handleClick(option.value)"
    >
      <slot
        name="option"
        :option="option"
        :selected="isSelected(option.value)"
      >
        {{ option.label }}
      </slot>
    </Button>

    <!-- Clear button -->
    <Button
      v-if="showClearButton"
      :size="size"
      severity="secondary"
      text
      icon="pi pi-times"
      :disabled="disabled"
      @click="handleClear"
    >
      {{ t('common.actions.clear') }}
    </Button>
  </div>
</template>
