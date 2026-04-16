<script setup lang="ts">
definePageMeta({
  title: 'pages.legal.privacy-policy.title',
})

const T = useTranslations('pages.legal.privacy-policy')
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
