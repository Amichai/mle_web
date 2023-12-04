<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'


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
  }, 700)
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
          <NewsFeed @close-panel="closePanel" :isOpen="isPanelOpen"/>
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
  transition: grid-template-columns 0.8s;
}

.column-2 {
}
</style>