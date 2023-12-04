<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import logo from '@/assets/logo.png'


const emits = defineEmits([])
</script>

<template>
  <div class="header">
      <img :src="logo" alt="money line edge" class="logo" height="40">

      <div class="title">
        Money Line Edge
      </div>
  </div>
</template>

<style scoped>

.header {
  background-color: maroon;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.title {
  color: #040000;
  text-align: center;
  text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  /* font-family: Inter; */
  font-size: 25px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  align-self: center;
  font-style: italic;
}

.logo {
  margin: 0.3rem;
}
</style>