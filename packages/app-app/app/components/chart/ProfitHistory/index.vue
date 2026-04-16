<script setup lang="ts">
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'

// Register ECharts components
use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

interface Props {
  /** Chart data */
  data: DailyProfit[]
  /** Loading state */
  loading?: boolean
  /** Chart height */
  height?: string
  /** Show data zoom slider */
  showDataZoom?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: '400px',
  showDataZoom: true,
})

const isDark = useDarkMode()
const { formatDate } = useDate()
const { isMobile } = useDevice()
const T = useTranslations('components.chart.ProfitHistory')

// ECharts theme colors
const colors = computed(() => ({
  netProfit: isDark.value ? '#10b981' : '#059669', // green-500/600
  income: isDark.value ? '#3b82f6' : '#2563eb', // blue-500/600
  expense: isDark.value ? '#f59e0b' : '#d97706', // amber-500/600
  txCount: isDark.value ? '#a855f7' : '#9333ea', // purple-500/600
  grid: isDark.value ? '#374151' : '#e5e7eb', // gray-700/200
  text: isDark.value ? '#d1d5db' : '#374151', // gray-300/700
}))

// Loading options with dark mode support
const loadingOption = computed(() => ({
  text: 'loading',
  color: isDark.value ? '#3b82f6' : '#2563eb', // blue-500/600
  textColor: isDark.value ? '#d1d5db' : '#374151', // gray-300/700
  maskColor: isDark.value ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  zlevel: 0,
}))

// ECharts option
const chartOption = computed<EChartsOption>(() => {
  const dates = props.data.map(item => formatDate(item.date))
  const netProfits = props.data.map(item => Number(item.netProfit))
  const expenses = props.data.map(item => Number(item.buyAmount))
  const incomes = props.data.map(item => Number(item.sellAmount) + Number(item.claimAmount))
  const txCounts = props.data.map(item => item.txCount)

  // Series names for legend, tooltip, and series
  const netProfitName = T('netProfit')
  const incomeName = T('income')
  const expenseName = T('expense')
  const txCountName = T('txCount')

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: colors.value.text,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark.value ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: colors.value.grid,
      textStyle: {
        color: colors.value.text,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''

        const date = params[0].axisValue
        let tooltip = `<div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`

        params.forEach((param: any) => {
          // Use different format for txCount (no currency symbol)
          const isTxCount = param.seriesName === txCountName
          const value = isTxCount ? param.value : formatCurrency(param.value)
          const color = param.color
          tooltip += `
            <div style="display: flex; align-items: center; margin: 4px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
              <span style="flex: 1;">${param.seriesName}:</span>
              <span style="font-weight: 600; margin-left: 16px;">${value}</span>
            </div>
          `
        })

        return tooltip
      },
    },
    legend: {
      data: [ netProfitName, incomeName, expenseName, txCountName ],
      textStyle: {
        color: colors.value.text,
        fontSize: isMobile.value ? 11 : 12,
      },
      top: 0,
      itemGap: isMobile.value ? 8 : 10,
      itemWidth: isMobile.value ? 20 : 25,
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: props.showDataZoom ? '15%' : '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: colors.value.grid,
        },
      },
      axisLabel: {
        color: colors.value.text,
      },
    },
    yAxis: [
      {
        type: 'value',
        position: 'left',
        axisLine: {
          lineStyle: {
            color: colors.value.grid,
          },
        },
        axisLabel: {
          color: colors.value.text,
          formatter: (value: number) => formatCurrency(value),
        },
        splitLine: {
          lineStyle: {
            color: colors.value.grid,
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        position: 'right',
        axisLine: {
          lineStyle: {
            color: colors.value.txCount,
          },
        },
        axisLabel: {
          color: colors.value.txCount,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    dataZoom: props.showDataZoom
      ? [
        {
          type: 'slider',
          start: 0,
          end: 100,
          textStyle: {
            color: colors.value.text,
          },
          borderColor: colors.value.grid,
          fillerColor: isDark.value ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          handleStyle: {
            color: colors.value.text,
          },
        },
      ]
      : undefined,
    series: [
      {
        name: netProfitName,
        type: 'line',
        yAxisIndex: 0,
        data: netProfits,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: colors.value.netProfit,
        },
        lineStyle: {
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: isDark.value ? 'rgba(16, 185, 129, 0.3)' : 'rgba(5, 150, 105, 0.3)',
              },
              {
                offset: 1,
                color: isDark.value ? 'rgba(16, 185, 129, 0.05)' : 'rgba(5, 150, 105, 0.05)',
              },
            ],
          },
        },
      },
      {
        name: incomeName,
        type: 'line',
        yAxisIndex: 0,
        data: incomes,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: colors.value.income,
        },
        lineStyle: {
          width: 2,
        },
      },
      {
        name: expenseName,
        type: 'line',
        yAxisIndex: 0,
        data: expenses,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: colors.value.expense,
        },
        lineStyle: {
          width: 2,
        },
      },
      {
        name: txCountName,
        type: 'line',
        yAxisIndex: 1,
        data: txCounts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: colors.value.txCount,
        },
        lineStyle: {
          width: 2,
          type: 'dashed',
        },
      },
    ],
  }
})
</script>

<template>
  <VChart
    :option="chartOption"
    :loading="loading"
    :loadingOptions="loadingOption"
    :style="{ height }"
    autoresize
  />
</template>
