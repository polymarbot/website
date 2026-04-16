<script setup lang="ts">
definePageMeta({
  title: 'pages.legal.terms-of-service.title',
})

const T = useTranslations('pages.legal.terms-of-service')
const ContentMd = await useLocalizedMarkdown(
  suffix => import(`./content${suffix}.md`),
)
</script>

<template>
  <LayoutPageContainer>
    <PageCard :title="T('title')">
      <Markdown hideTitle>
        <component :is="ContentMd" />
      </Markdown>
    </PageCard>
  </LayoutPageContainer>
</template>
