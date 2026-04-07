<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDocumentStore } from '@/stores/document'
import Toast from '@/components/Toast.vue'

const userStore = useUserStore()
const docStore = useDocumentStore()

onMounted(async () => {
  await userStore.init()
  if (userStore.isLoggedIn) {
    await docStore.loadAll()
  }
})
</script>

<template>
  <router-view />
  <Toast />
</template>