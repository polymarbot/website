<script setup lang="ts">
definePageMeta({
  title: 'pages.legal.terms-of-service.title',
})

const T = useTranslations('pages.legal.terms-of-service')
const { component, loading } = useLocalizedMarkdown(
  suffix => import(`./content${suffix}.md`),
)
</script>

<template>
  <LayoutPageContainer>
    <PageCard
      :ready="!loading"
      :title="T('title')"
    >
      <Markdown
        v-if="component"
        hideTitle
      >
        <component :is="component" />
      </Markdown>
    </PageCard>
  </LayoutPageContainer>
</template>
