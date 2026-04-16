<script setup lang="ts">
/**
 * InfoTable Component
 *
 * Displays information in a table format with label-value pairs.
 * Supports single or multiple columns per row.
 *
 * Features:
 * - Flexible data structure (2D array: rows -> cells)
 * - Auto-sizing label columns (minimum width)
 * - Support for custom value content via slots
 * - Cell spanning support (colspan/rowspan)
 * - Full-width cells for headers or special content
 * - Responsive design with proper alignment
 * - Beautiful styling with rounded corners
 */

export interface InfoTableCell {
  /** Label text to display (optional if using fullWidth mode) */
  label?: string
  /** Value content (string, number, or use slot for complex content) */
  value?: string | number
  /** Optional slot name for custom value content */
  slot?: string
  /** Additional data to pass to slot */
  data?: any
  /** Number of columns the value cell should span (default: 1) */
  colspan?: number
  /** Number of rows the cell should span (default: 1) */
  rowspan?: number
  /** Full-width mode: cell spans entire row without label (useful for headers) */
  fullWidth?: boolean
}

export interface InfoTableProps {
  /** Table data: array of rows, each row is an array of cells */
  rows: InfoTableCell[][]
}

defineProps<InfoTableProps>()

defineSlots<{
  [key: string]: (props: { cell: InfoTableCell, rowIndex: number, cellIndex: number }) => any
}>()
</script>

<template>
  <div class="overflow-hidden rounded-border border border-surface bg-ground">
    <table class="w-full">
      <tbody>
        <tr
          v-for="(row, rowIndex) in rows"
          :key="rowIndex"
          :class="[
            `
              hover:bg-emphasis/50
              transition-colors
            `,
            rowIndex < rows.length - 1 && 'border-b border-surface',
          ]"
        >
          <template
            v-for="(cell, cellIndex) in row"
            :key="cellIndex"
          >
            <!-- Full-width cell (no label, spans entire row) -->
            <td
              v-if="cell.fullWidth"
              :colspan="cell.colspan || 999"
              :rowspan="cell.rowspan || 1"
              class="px-2 py-4"
            >
              <slot
                v-if="cell.slot"
                :name="cell.slot"
                :cell="cell"
                :rowIndex="rowIndex"
                :cellIndex="cellIndex"
              />
              <template v-else>
                {{ cell.value }}
              </template>
            </td>

            <!-- Normal label-value pair -->
            <template v-else>
              <!-- Label cell -->
              <td
                :rowspan="cell.rowspan || 1"
                class="w-0 px-2 py-4 text-sm whitespace-nowrap text-muted-color"
              >
                {{ cell.label }}:
              </td>

              <!-- Value cell -->
              <td
                :colspan="cell.colspan || 1"
                :rowspan="cell.rowspan || 1"
                class="px-2 py-4"
              >
                <slot
                  v-if="cell.slot"
                  :name="cell.slot"
                  :cell="cell"
                  :rowIndex="rowIndex"
                  :cellIndex="cellIndex"
                />
                <template v-else>
                  {{ cell.value }}
                </template>
              </td>
            </template>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
