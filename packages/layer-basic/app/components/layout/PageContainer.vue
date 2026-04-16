<template>
  <div
    :class="cn(`
      container mx-auto w-full
      sm:p-4
    `, $attrs.class || '')"
  >
    <slot />
  </div>
</template>
