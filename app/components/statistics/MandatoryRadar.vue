<script setup lang="ts">
interface StatisticItem {
  group: string
  percentageTrue: number
  isTrue: number
  isFalse: number
  total: number
}

defineProps<{
  ratings: Array<{ rating: string, statistic: StatisticItem[] }>
  showRating?: boolean
}>()

function point(value: number, index: number, total: number, radius = 96) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total
  const scaled = (Math.max(0, Math.min(100, Number(value) || 0)) / 100) * radius
  return { x: 140 + scaled * Math.cos(angle), y: 140 + scaled * Math.sin(angle) }
}

function polygon(items: StatisticItem[]) {
  return items.map((item, index) => {
    const value = point(item.percentageTrue, index, items.length)
    return `${value.x},${value.y}`
  }).join(' ')
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <UCard v-for="(item, itemIndex) in ratings" :key="`${item.rating}-${itemIndex}`">
      <template v-if="showRating !== false" #header>
        <h3 class="font-semibold">
          Rating: {{ item.rating || '-' }}
        </h3>
      </template>
      <div class="flex flex-col items-center gap-3">
        <svg viewBox="0 0 280 280" class="h-auto w-full max-w-[360px]">
          <circle
            v-for="radius in [24, 48, 72, 96]"
            :key="radius"
            cx="140"
            cy="140"
            :r="radius"
            fill="none"
            stroke="rgba(148,163,184,0.35)"
          />
          <line
            v-for="(_, index) in item.statistic"
            :key="`axis-${index}`"
            x1="140"
            y1="140"
            :x2="point(100, index, item.statistic.length).x"
            :y2="point(100, index, item.statistic.length).y"
            stroke="rgba(148,163,184,0.5)"
          />
          <text
            v-for="(stat, index) in item.statistic"
            :key="`label-${index}`"
            :x="point(118, index, item.statistic.length).x"
            :y="point(118, index, item.statistic.length).y"
            font-size="9"
            fill="currentColor"
            text-anchor="middle"
          >
            {{ stat.group.length > 18 ? `${stat.group.slice(0, 18)}…` : stat.group }}
          </text>
          <polygon
            :points="polygon(item.statistic)"
            fill="rgba(147,51,234,0.2)"
            stroke="#9333ea"
            stroke-width="2"
          />
          <circle
            v-for="(stat, index) in item.statistic"
            :key="`point-${index}`"
            :cx="point(stat.percentageTrue, index, item.statistic.length).x"
            :cy="point(stat.percentageTrue, index, item.statistic.length).y"
            r="3"
            fill="#9333ea"
          />
        </svg>
        <div class="grid w-full grid-cols-1 gap-2 text-xs md:grid-cols-2">
          <div v-for="stat in item.statistic" :key="stat.group" class="flex items-center justify-between gap-2 rounded border border-default px-2 py-1">
            <span class="truncate">{{ stat.group }}</span>
            <span class="font-medium">{{ Number(stat.percentageTrue).toFixed(2) }}%</span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
