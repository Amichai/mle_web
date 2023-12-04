<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'

import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
  
const props = defineProps({
  msg: {
    type: String,
    required: true
  }
})

const emits = defineEmits([])
</script>

<template>
  <div class="news-feed">
    <!-- At some point we'll seen a sport selector... -->
    <!-- blinking light indicator -->
    <!-- Poll the API every 10 seconds -->
    <div class="title">News Feed
      <div class="site-selector">
        <input type="radio" id="option1" name="option" value="1">
        <label for="option1"><img :src="fdlogo" alt="fanduel" height="20"></label>
        <input type="radio" id="option2" name="option" value="2">
        <label for="option2"><img :src="dklogo" alt="draftkings" height="20"></label>
      </div>
    </div>
    <div class="feed">
      <p>test1</p>
      <p>test2</p>
      <p>test3</p>
      <p>test1</p>
    </div>

  </div>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  justify-content: space-between;
  font-style: italic;
}
.news-feed {
  background-color: lightgray;
  color: black;
  height: calc(100vh - 6rem);
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
}

.feed {
  padding: 0.3rem;
  font-size: 0.9rem;
  line-height: 1;
  background-color: white;
  display: flex;
  flex-direction: column;
  width: 97%;
  overflow-y: auto;
}

.site-selector {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 1rem;
}
</style>