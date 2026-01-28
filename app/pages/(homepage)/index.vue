<script setup lang="ts">
import HeroSection from './components/HeroSection.vue'
import WorkflowSection from './components/WorkflowSection.vue'
import WhyChooseUsSection from './components/WhyChooseUsSection.vue'
import PricingSection from './components/PricingSection.vue'

definePageMeta({
  layout: 'transparent',
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <HeroSection />

    <!-- Workflow Section -->
    <WorkflowSection />

    <!-- Why Choose Us Section -->
    <WhyChooseUsSection />

    <!-- Pricing Section -->
    <PricingSection />

    <!-- Footer -->
    <AppFooter />
  </div>
</template>
