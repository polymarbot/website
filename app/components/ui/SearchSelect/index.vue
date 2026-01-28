<script setup lang="ts" generic="TValue extends string | number, TMeta = unknown">
import type { SelectProps as BaseSelectProps } from 'primevue/select'
import { debounce } from 'lodash-es'

export interface SelectOption<V extends string | number, M = unknown> {
  label: string
  value: V
  disabled?: boolean
  meta?: M
}

/** Result returned by loadMethod */
export interface LoadMethodResult<V extends string | number, M = unknown> {
  items: SelectOption<V, M>[]
  total: number
}

/** Parameters passed to loadMethod */
export interface LoadMethodParams {
  keyword: string
  offset: number
  limit: number
}

export interface SearchSelectProps<V extends string | number, M = unknown>
  extends /* @vue-ignore */ Omit<BaseSelectProps, 'options' | 'loading' | 'filter'> {
  modelValue?: V
  /** Default options to display at the top of the list */
  defaultOptions?: SelectOption<V, M>[]
  /** Enable auto-load when component mounts or selected value is not in options */
  autoLoad?: boolean
  /** Async function to load options. Receives keyword, offset, limit and returns items with total */
  loadMethod?: (params: LoadMethodParams) => Promise<LoadMethodResult<V, M>>
  /** Async function to load a single option by value. Called after first page load if value not found in options */
  loadValueOptionMethod?: (value: V) => Promise<SelectOption<V, M> | null>
  /** Number of items to load per request (default: 20) */
  loadLimit?: number
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Message to display when search returns no results */
  searchEmptyMessage?: string
  /** Link URL for "Create new" footer action. When provided, shows footer with create link */
  createNewTo?: string
  /** Custom text for "Create new" link (default: i18n 'createNew') */
  createNewText?: string
}

type Option = SelectOption<TValue, TMeta>
type Props = SearchSelectProps<TValue, TMeta>

// Load more marker item - appended to options list for infinite scroll
const LOAD_MORE_ITEM = { label: '', value: '', disabled: true, isLoadMore: true } as const

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultOptions: () => [],
  autoLoad: false,
  loadMethod: undefined,
  loadValueOptionMethod: undefined,
  loadLimit: 20,
  searchPlaceholder: undefined,
  searchEmptyMessage: undefined,
  createNewTo: undefined,
  createNewText: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: TValue | undefined]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const T = useTranslations('components.ui.SearchSelect')

const keyword = ref('')
const searchInputRef = ref<ComponentPublicInstance | null>(null)
const isLoading = ref(false)

// Internal state for auto-fetched option when model value is not found in loaded options
// Use shallowRef to avoid UnwrapRef type issues with generic Option type
const fetchedValueOption = shallowRef<Option | null>(null)

// Internal pagination management
const pagination = usePagination<Option>([], { limit: props.loadLimit })

// Fetch options from API and update pagination
async function fetchOptions (offset: number, limit: number) {
  if (!props.loadMethod) return
  const result = await props.loadMethod({ keyword: keyword.value, offset, limit })
  pagination.update(result.items, { total: result.total })
}

// Load more options (infinite scroll)
async function loadMore () {
  if (!props.loadMethod || isLoading.value) return
  const next = pagination.next.value
  if (!next) return

  isLoading.value = true
  try {
    await fetchOptions(next.offset, next.limit)
  } finally {
    isLoading.value = false
  }
}

// Check if value exists in current options (defaults + loaded + fetched)
function isValueInOptions (value: TValue): boolean {
  const defaults = props.defaultOptions ?? []
  if (defaults.some(opt => opt.value === value)) return true
  if (pagination.items.value.some(opt => opt.value === value)) return true
  if (fetchedValueOption.value?.value === value) return true
  return false
}

// Fetch single option by value using loadValueOptionMethod
async function fetchValueOption (value: TValue) {
  if (!props.loadValueOptionMethod) return
  // Skip if already fetched
  if (fetchedValueOption.value?.value === value) return

  try {
    const option = await props.loadValueOptionMethod(value)
    fetchedValueOption.value = option
  } catch {
    // Silently ignore errors
    fetchedValueOption.value = null
  }
}

// Reset pagination and reload with current keyword
async function resetAndLoad () {
  if (!props.loadMethod) return

  // Clear fetched value option on refresh
  fetchedValueOption.value = null

  pagination.reset([], { limit: props.loadLimit })
  isLoading.value = true
  try {
    await fetchOptions(0, props.loadLimit)

    // After first page load, check if model value exists in options
    // If not found and loadValueOptionMethod is provided, fetch it
    if (model.value !== undefined && model.value !== null) {
      if (!isValueInOptions(model.value)) {
        fetchValueOption(model.value)
      }
    }
  } finally {
    isLoading.value = false
  }
}

// Debounced search handler - reset pagination and reload when keyword changes
const debouncedSearch = debounce(() => {
  resetAndLoad()
}, 300)

// Compute displayed options with fetchedValueOption and defaultOptions at top, deduplicated, and load more item appended
const displayedOptions = computed<Option[]>(() => {
  const fetched = fetchedValueOption.value
  const defaults = props.defaultOptions ?? []
  const loaded = pagination.items.value

  // Build priority options: fetched value option first (if not in defaults), then defaultOptions
  const priorityOptions: Option[] = []
  const priorityValues = new Set<TValue>()

  // Add fetched value option if exists and not in defaults
  if (fetched && !defaults.some(opt => opt.value === fetched.value)) {
    priorityOptions.push(fetched)
    priorityValues.add(fetched.value)
  }

  // Add default options
  for (const opt of defaults) {
    priorityOptions.push(opt)
    priorityValues.add(opt.value)
  }

  // Deduplicate: filter out loaded options that already exist in priority options
  const dedupedLoaded = loaded.filter(opt => !priorityValues.has(opt.value))

  // Combine: priority options first, then deduplicated loaded options
  const combined = [ ...priorityOptions, ...dedupedLoaded ]

  // Append load more item if loadMethod is provided and has more items
  if (props.loadMethod && pagination.next.value) {
    return combined.concat(LOAD_MORE_ITEM as unknown as Option)
  }

  return combined
})

// Compute empty message based on keyword
const emptyMessage = computed(() => {
  if (keyword.value) {
    return props.searchEmptyMessage ?? T('noSearchItems')
  }
  return props.emptyMessage ?? T('noItems')
})

// Compute search placeholder
const searchInputPlaceholder = computed(() => {
  return props.searchPlaceholder ?? T('searchPlaceholder')
})

// Compute create new link text
const createNewLinkText = computed(() => {
  return props.createNewText ?? T('createNew')
})

// Handle search input change
function handleSearchInput (value: string | undefined) {
  keyword.value = value ?? ''
  debouncedSearch()
}

// Handle dropdown show - focus search input and auto-load if options empty
function handleShow () {
  // Auto-load if no options available
  if (props.loadMethod && displayedOptions.value.length === 0) {
    resetAndLoad()
  }

  nextTick(() => {
    searchInputRef.value?.$el.focus()
  })
}

// Handle dropdown hide - reset search keyword and reload without filter
function handleHide () {
  if (keyword.value) {
    keyword.value = ''
    debouncedSearch.cancel()
    resetAndLoad()
  }
}

// Check if auto-load should be triggered
function shouldAutoLoad (): boolean {
  if (!props.autoLoad || !props.loadMethod) return false
  // If options is empty, trigger initial load
  if (pagination.items.value.length === 0) return true
  // Check if selected value exists in options
  if (model.value !== undefined && model.value !== null) {
    return !pagination.items.value.some(option => option.value === model.value)
  }
  return false
}

// Auto-load on mount or when selected value is not in options
// Normalize model.value to undefined to avoid duplicate triggers when value changes between undefined/null
watch(
  [
    () => props.autoLoad,
    () => model.value ?? undefined,
  ],
  () => {
    if (shouldAutoLoad()) resetAndLoad()
  },
  { immediate: true },
)

// Find option by value from displayedOptions
function findOptionByValue (value: TValue | undefined): Option | undefined {
  if (value === undefined || value === null) return undefined
  return displayedOptions.value.find(opt => opt.value === value)
}

// Expose refresh method for parent components to trigger re-fetch
defineExpose({
  refresh: resetAndLoad,
})
</script>

<template>
  <PrimeSelect
    v-model="model"
    optionLabel="label"
    optionValue="value"
    optionDisabled="disabled"
    :options="displayedOptions"
    :loading="isLoading"
    :emptyMessage="emptyMessage"
    @show="handleShow"
    @hide="handleHide"
  >
    <template
      v-for="name in Object.keys($slots).filter(name => ![ 'option', 'header', 'footer', 'value' ].includes(name))"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>

    <!-- Search input in header -->
    <template #header>
      <div class="p-2 pb-1">
        <PrimeIconField>
          <PrimeInputText
            ref="searchInputRef"
            :modelValue="keyword"
            :placeholder="searchInputPlaceholder"
            fluid
            @update:modelValue="handleSearchInput"
          />
          <PrimeInputIcon class="pi pi-search" />
        </PrimeIconField>
      </div>
      <slot name="header" />
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

    <!-- Option slot with load more indicator support -->
    <template #option="slotProps">
      <!-- Load more indicator item -->
      <EffectIntersectionChecker
        v-if="slotProps.option?.isLoadMore"
        class="flex w-full items-center justify-center"
        :disabled="isLoading"
        @show="loadMore"
      >
        <i class="pi pi-spinner pi-spin text-muted-color" />
      </EffectIntersectionChecker>

      <!-- Regular option - use custom slot if provided, otherwise default rendering -->
      <slot
        v-else-if="$slots.option"
        name="option"
        v-bind="slotProps"
      />
      <span v-else>
        {{ slotProps.option?.label }}
      </span>
    </template>

    <!-- Footer with create new link -->
    <template
      v-if="createNewTo || $slots.footer"
      #footer
    >
      <slot name="footer">
        <div class="border-t border-surface">
          <WebLink
            :to="createNewTo!"
            target="_blank"
            unstyled
            class="
              flex items-center gap-2 rounded-md px-3 py-2 text-base
              text-muted-color transition-colors
              hover:bg-emphasis
            "
          >
            <i class="pi pi-plus" />
            {{ createNewLinkText }}
          </WebLink>
        </div>
      </slot>
    </template>
  </PrimeSelect>
</template>
