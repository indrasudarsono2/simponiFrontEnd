<script setup lang="ts">
const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/performa-favicon-circle.png?v=3' },
    { rel: 'apple-touch-icon', href: '/performa-favicon-circle.png?v=3' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'PERFORMA'
const description = 'Performance and Operational Record Management Application'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/performa-logo.png',
  twitterImage: '/performa-logo.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
