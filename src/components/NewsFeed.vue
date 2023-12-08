<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'

import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
import collapse from '@/assets/collapse.png'
import sync from '@/assets/sync.png'
  

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  pingCounter: {
    type: Number,
    default: 0
  },
  newsRows: {
    type: Array,
    default: () => []
  }
})

onMounted(() => {
  console.log('mounted')
  console.log(props.newsRows)
  console.log(newsRowsLocal)
})

const emits = defineEmits(['closePanel'])
const isOpenLocal = ref(props.isOpen)
const newsRowsLocal = ref(props.newsRows)

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})

watch(() => props.pingCounter, (newVal) => {
  console.log('ping counter changed to: ', newVal)

  var cube = document.querySelector(".ping-dot");
  if (cube) {
      cube.classList.add("animate-cube");

      // Optional: Remove the class after the animation ends
      cube.addEventListener('animationend', function() {
          cube.classList.remove("animate-cube");
      });
    }
})

watch(() => props.newsRows, (newVal) => {
  newsRowsLocal.value = newVal;
})

const newsRowsFiltered = computed(() => {
  const fdRows =  newsRowsLocal.value.filter((row) => !row.includes('dk:')).map((row) => row.replace('fd:', ''))
  
  const dkRows =  newsRowsLocal.value.filter((row) => !row.includes('fd:')).map((row) => row.replace('dk:', ''))

  return selectedSite.value === '1' ? fdRows : dkRows
})

const closePanel = () => {
  emits('closePanel');
}

const selectedSite = ref('1')

</script>

<template>
  <div class="news-feed" v-if="isOpenLocal">
  <!-- At some point we'll seen a sport selector... -->
    <!-- blinking light indicator -->
    <!-- Poll the API every 10 seconds -->
    
    <div class="title">
      <button class="collapse-button" @click="closePanel">
        <img :src="collapse" alt="collapse" height="20">
      </button>
      <div class="dot-and-title">
        <div class="ping-dot">
          <img :src="sync" alt="sync">

        </div>
        <p>Breaking News</p>
      </div>
      <div class="site-selector">
        <input type="radio" id="option1" name="option" value="1" v-model="selectedSite">
        <label for="option1"><img :src="fdlogo" alt="fanduel" height="20"></label>
        <input type="radio" id="option2" name="option" value="2" v-model="selectedSite">
        <label for="option2"><img :src="dklogo" alt="draftkings" height="20"></label>
      </div>

    </div>
    <div class="feed">
      <p v-for="(row, idx) in newsRowsFiltered" :key="idx">
        {{ row }}
      </p>
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
  user-select: none;
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
  border: 1px solid black;
}

.site-selector {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 1rem;
}

.collapse-button {
  background-color: transparent;
  border: 1px solid black;
  cursor: pointer;
  border-radius: 0.5rem;
}

.ping-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 0.2rem;
  margin-right: 0.1rem;
  visibility: hidden;

}

.dot-and-title {
  display: flex;
  align-items: center;
}

@keyframes rotateCube {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(180deg);
    }
}

.animate-cube {
    animation: rotateCube 2s ease-in-out;
    visibility: visible !important;
}
</style>