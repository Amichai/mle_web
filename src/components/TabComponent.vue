<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import ProjectionsTable from '../components/ProjectionsTable.vue';
import LineupBuilder from '../components/LineupBuilder.vue';
import collapse from '@/assets/collapse.png'

const currentTab = ref('Tab1')

const emits = defineEmits(['openPanel'])

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
})

const isOpenLocal = ref(props.isOpen)

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})


</script>

<template>
  <div class="tab-component">
    <div class="top-bar">
      <div class="tabs">
        <button v-bind:class="{ active: currentTab === 'Tab1' }" @click="currentTab = 'Tab1'">Projections</button>
        <button v-bind:class="{ active: currentTab === 'Tab2' }" @click="currentTab = 'Tab2'">Lineups</button>
      </div>


    <button class="open-button" @click="emits('openPanel')" v-show="!isOpenLocal">
      <img :src="collapse" alt="collapse" height="20">
    </button>
  </div>

  <div class="tab-content">
    <div v-show="currentTab === 'Tab1'">
      <ProjectionsTable />
    </div>
    <div v-show="currentTab === 'Tab2'">
      <LineupBuilder />
    </div>
  </div>

  </div>
</template>

<style>
.tab-component {
  background-color: lightgray;
  color: black;
  height: calc(100vh - 6rem);
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
}

.tabs button {
  padding: 10px;
  border: none;
  cursor: pointer;
  background-color: transparent;
  color: black;
  border: 1px solid black;
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
}

.tab-content div {
  border: 1px solid black;
}

.tab-content div h2 {
  margin: 0;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.open-button {
  background-color: transparent;
  border: 1px solid black;
  cursor: pointer;
  border-radius: 0.5rem;
  transform: rotate(180deg);
  height: 1.5rem;
}

</style>