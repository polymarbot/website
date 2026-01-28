/**
 * Form state management composable with Zod validation
 *
 * Provides a complete form state management solution:
 * - Tracks form changes against origin data
 * - Validates form data using Zod schemas
 * - Auto-scrolls to first error field on validation failure
 * - Supports flat formState -> nested object conversion
 * - Automatically translates i18n keys in validation error messages
 */

import { cloneDeep, defaultsDeep, get, isEqual, set } from 'lodash-es'
import type { z } from 'zod'

/** Validation result maps field names to error messages */
export type ValidationResult = Record<string, string>

/** Validation error thrown when form validation fails */
export interface FormValidationError {
  fields: ValidationResult
  firstErrorField?: string
}

export interface UseFormOptions {
  /** Zod schema for validation */
  schema?: z.ZodType | Ref<z.ZodType | undefined>
  /** Auto validate on input change (default: true) */
  autoValidate?: boolean
}

export interface UseFormReturn<TData> {
  /** Default values captured at initialization (nested object) */
  defaultValues: Ref<TData>
  /** Current form values as nested object */
  current: ComputedRef<TData>
  /** Original values from server (nested object) */
  origin: Ref<TData>
  /** Whether form has unsaved changes */
  changed: Ref<boolean>
  /** Current validation errors */
  validationResult: Readonly<Ref<ValidationResult>>
  /** Validate form and scroll to first error if validation fails, returns nested object */
  validate: (fields?: string[]) => Promise<TData>
  /** Validate a single field manually (for use with autoValidate: false) */
  validateField: (fieldName: string) => void
  /** Reset form to origin values */
  reset: () => void
  /** Reset form to initial default values */
  resetToDefault: () => void
}

/**
 * Form state management composable
 *
 * @example
 * ```ts
 * const formState = reactive({
 *   'user.name': '',
 *   'user.email': '',
 * })
 *
 * const schema = z.object({
 *   'user.name': z.string().min(1, 'Name is required'),
 *   'user.email': z.email('Invalid email'),
 * })
 *
 * const { current, origin, changed, validate, reset, validationResult } = useForm(formState, {
 *   schema,
 * })
 *
 * // Set origin data from server
 * origin.value = { user: { name: 'John', email: 'john@example.com' } }
 *
 * // Validate and submit
 * async function handleSubmit() {
 *   const values = await validate()
 *   await api.updateUser(values)
 * }
 * ```
 */
export function useForm<TState extends object, TData extends object = TState> (formState: TState | Ref<TState>, options?: UseFormOptions): UseFormReturn<TData> {
  const { schema, autoValidate = true } = options ?? {}
  const state = unref(formState)
  const { t } = useI18n()

  // Convert flat formState to nested object
  const current = computed(() => nonFlatObject<TState, TData>(state))

  // Store default values at initialization
  const defaultValues = ref(cloneDeep(current.value))

  // Origin data from server (nested object)
  const origin = ref(cloneDeep(current.value))

  // Track if form has changed from origin
  const changed = ref(false)

  // Validation state
  const validationResult = ref<ValidationResult>({})
  let validationCanceller = { value: false }
  let oldFormState = { ...state } as Record<string, unknown>

  // Sync form state when origin changes
  watch(origin, () => {
    defaultsDeep(origin.value, defaultValues.value)
    setFieldsValue<TState, TData>(state, origin.value, [])
    changed.value = false
  }, { deep: true })

  // Track changes and trigger incremental validation
  watch(
    () => state,
    async () => {
      changed.value = !isEqualWithOriginData<TState, TData>(state, origin)
      const newFormState = { ...state } as Record<string, unknown>

      // Skip validation if autoValidate is disabled
      if (!autoValidate) {
        oldFormState = newFormState
        return
      }

      // Incremental validation for changed fields only
      const changedFields: string[] = []
      for (const key of Object.keys(newFormState)) {
        if ((newFormState[key] || oldFormState[key]) && newFormState[key] !== oldFormState[key]) {
          changedFields.push(key)
        }
      }

      if (changedFields.length > 0) {
        const completed = await generateValidationResult(changedFields, { value: false })
        // Only update oldFormState after validation completes (not cancelled)
        if (completed) {
          oldFormState = newFormState
        }
      }
    },
    { deep: true },
  )

  /**
   * Generate validation results for specified fields or all fields
   * @returns true if validation completed, false if cancelled
   */
  async function generateValidationResult (fields?: string[], canceller?: typeof validationCanceller): Promise<boolean> {
    validationCanceller.value = true
    if (canceller) validationCanceller = canceller

    const schemaValue = unref(schema)
    if (!schemaValue) {
      validationResult.value = {}
      return true
    }

    const isFullValidation = !fields
    const result: ValidationResult = {}

    // Preserve existing errors for non-validated fields
    if (!isFullValidation) {
      for (const key of Object.keys(validationResult.value)) {
        if (!fields?.includes(key)) {
          const existingError = validationResult.value[key]
          if (existingError) {
            result[key] = existingError
          }
        }
      }
    }

    // Run Zod validation
    const parseResult = await schemaValue.safeParseAsync(state)
    if (canceller?.value) return false

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const fieldPath = issue.path.join('.')
        // Only include errors for fields we're validating
        if (isFullValidation || fields?.includes(fieldPath)) {
          if (!result[fieldPath]) {
            // Translate i18n key to actual message
            result[fieldPath] = translateI18nKey(issue.message, t)
          }
        }
      }
    } else if (isFullValidation) {
      // Full validation passed, clear all errors
      validationResult.value = {}
      return true
    }

    validationResult.value = result
    return true
  }

  /**
   * Validate form data
   * On failure, scrolls to first error field and rejects with error details
   */
  async function validate (fields?: string[]): Promise<TData> {
    await generateValidationResult(fields)

    const values: Record<string, unknown> = {}
    const errors: ValidationResult = {}
    const stateRecord = state as Record<string, unknown>

    if (fields?.length) {
      // Partial validation
      for (const field of fields) {
        values[field] = stateRecord[field]
        const fieldError = validationResult.value[field]
        if (fieldError) {
          errors[field] = fieldError
        }
      }
    } else {
      // Full validation
      Object.assign(values, state)
      Object.assign(errors, validationResult.value)
    }

    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0]

      // Scroll to first error field
      if (firstErrorField) {
        scrollToErrorField(firstErrorField)
      }

      const error: FormValidationError = {
        fields: errors,
        firstErrorField,
      }
      return Promise.reject(error)
    }

    // Return nested object structure (same as current/origin)
    return nonFlatObject<typeof values, TData>(values)
  }

  /**
   * Validate a single field manually
   * Used with autoValidate: false for on-change/on-blur validation
   */
  function validateField (fieldName: string) {
    generateValidationResult([ fieldName ])
  }

  /**
   * Reset form to origin values (server data)
   */
  function reset () {
    setFieldsValue<TState, TData>(state, origin.value, [])
    clearValidationResult()
  }

  /**
   * Reset form to initial default values
   */
  function resetToDefault () {
    setFieldsValue<TState, TData>(state, defaultValues.value, [])
    clearValidationResult()
  }

  /**
   * Clear validation results after state update
   */
  function clearValidationResult () {
    setTimeout(() => {
      validationResult.value = {}
    })
  }

  return {
    defaultValues,
    current,
    origin,
    changed,
    validationResult: readonly(validationResult),
    validate,
    validateField,
    reset,
    resetToDefault,
  }
}

/**
 * Find and scroll to the DOM element for an error field
 */
function scrollToErrorField (fieldName: string): void {
  // Try multiple selector strategies to find the input element
  const selectors = [
    // By name attribute
    `[name="${fieldName}"]`,
    // By id attribute
    `#${fieldName.replace(/\./g, '-')}`,
    `#${fieldName}`,
    // By data attribute
    `[data-field="${fieldName}"]`,
    // By aria-label
    `[aria-label="${fieldName}"]`,
  ]

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        // Focus the element if it's focusable
        if (element instanceof HTMLElement && 'focus' in element) {
          setTimeout(() => element.focus(), 300)
        }
        return
      }
    } catch {
      // Invalid selector, continue to next
    }
  }

  // Fallback: try to find by FormError component with matching field
  const formErrorSelector = `[data-form-error="${fieldName}"]`
  const errorElement = document.querySelector(formErrorSelector)
  if (errorElement) {
    errorElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }
}

/**
 * Set data to form's formState from nested object
 */
export function setFieldsValue<TState extends object, TData extends object = TState> (
  formState: TState | Ref<TState>,
  data: TData,
  ignore: unknown[] = [ undefined ],
): void {
  const unwrappedData = unref(data)
  const unwrappedFormState = unref(formState)

  Object.entries(unwrappedFormState).forEach(([ path, value ]) => {
    const newValue = get(unwrappedData, path, undefined)
    if (
      (Array.isArray(ignore) ? !ignore.includes(newValue) : newValue !== ignore)
      && !isEqual(value, newValue)
    ) {
      if (isRef(formState)) {
        (formState as Ref<TState>).value[path as keyof TState] = newValue
      } else {
        (formState as TState)[path as keyof TState] = newValue
      }
    }
  })
}

/**
 * Strict equality comparison for settings data
 *
 * Handles the common case where server data has undefined fields
 * while form data has falsy default values (0, '', false, null)
 *
 * @example
 * ```
 * Origin,             formState           //=> Result
 * {},                 { foo: null }      //=> true (both "empty")
 * { foo: undefined }, { foo: false }     //=> true (both "empty")
 * { foo: 1 },         { foo: undefined } //=> false (origin has value)
 * { foo: 1 },         {}                 //=> true (form doesn't track foo)
 * ```
 */
export function isEqualWithOriginData<TState extends object, TData extends object = TState> (
  formState: TState | Ref<TState>,
  origin: TData | Ref<TData>,
): boolean {
  const unwrappedFormState = unref(formState)
  const unwrappedOrigin = unref(origin)

  for (const [ path, value ] of Object.entries(unwrappedFormState)) {
    const originValue = get(unwrappedOrigin, path, undefined)

    // Both values are "empty" - consider equal
    const originEmpty = [ undefined, null ].includes(originValue as null | undefined)
    const formEmpty = [ 0, '', false, undefined, null ].includes(value as boolean | number | string | null | undefined)

    if (originEmpty && formEmpty) {
      continue
    }

    if (!isEqual(originValue, value)) {
      return false
    }
  }

  return true
}

/**
 * Convert flat object with dot-notation keys to nested object
 *
 * @example
 * ```ts
 * nonFlatObject({ 'a.b.c': 1 })         // => { a: { b: { c: 1 } } }
 * nonFlatObject({ 'items.0': 1 })       // => { items: [1] }
 * ```
 */
export function nonFlatObject<TState extends object, TData extends object = TState> (flatObject: TState): TData {
  const data = {}
  Object.entries(flatObject).forEach(([ path, value ]) => {
    set(data, path, value)
  })
  return data as TData
}
