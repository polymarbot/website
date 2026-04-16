<script setup lang="ts">
import QRCode from 'qrcode'

export interface QrcodeProps {
  content: string
}

const props = defineProps<QrcodeProps>()

const qrcode = ref<string | null>(null)
watch(() => props.content, createQrCode, { immediate: true })
async function createQrCode (content: string): Promise<string | null> {
  if (!content) {
    qrcode.value = null
    return null
  }
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(content, {
      errorCorrectionLevel: 'Q',
      type: 'image/jpeg',
      margin: 0,
      scale: 8,
    }, (err: Error | null | undefined, url: string) => {
      if (err) return reject(err)
      qrcode.value = url
      resolve(url)
    })
  })
}
</script>

<template>
  <img
    v-if="qrcode"
    :src="qrcode"
    alt="qrcode"
    class="mx-auto block size-full bg-white object-contain"
  >
  <Skeleton
    v-else
    class="mx-auto block size-full"
  />
</template>
