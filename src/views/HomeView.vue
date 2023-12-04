<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'

const pingCounter = ref(0)

onMounted(() => {
  startPingingAPI()
})

const gridColumns = ref('2.5fr 1rem 1fr')
const isPanelOpen = ref(true)

const closePanel = () => {
  gridColumns.value = '10fr 0fr 0fr'
  isPanelOpen.value = false
}

const openPanel = () => {
  gridColumns.value = '2.5fr 1rem 1fr'
  setTimeout(() => {
    isPanelOpen.value = true
  }, 490)
}

let intervalId = null;

const pingApi = () => {
  console.log('pinging API...')
  pingCounter.value += 1
}

const startPingingAPI = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  pingApi()

  // Set up the interval to ping the API every 10 seconds (10000 milliseconds)
  intervalId = setInterval(pingApi, 10000);
}

</script>

<template>
  <main>
    <HeaderBar />
    <div class="home-view">
      <div class="root-table" :style="{ gridTemplateColumns: gridColumns }">
        <div class="column-1">
          <TabComponent @openPanel="openPanel" :isOpen="isPanelOpen"/>
        </div>
        <div></div>
        <div class="column-2">
          <NewsFeed @close-panel="closePanel" :isOpen="isPanelOpen" :pingCounter="pingCounter"/>
        </div>
      </div>
    </div>
  </main>
</template>


<style scoped>
.home-view {
  display: flex;
  justify-content: center;
  align-items: center;
}

.root-table {
  margin: 1rem;
  display: grid;
  width: clamp(300px, 100%, 77rem);
  transition: grid-template-columns 0.5s linear;
}

.column-2 {
}
</style>