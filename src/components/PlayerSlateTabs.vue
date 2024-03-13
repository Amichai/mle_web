<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import collapse from '@/assets/collapse.png'
import { nameMapper } from './../nameMapper.js'


const currentTab = ref('')

const emits = defineEmits([])

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
})


onMounted(() => {
  currentTab.value = props.tabs[0].name
})

const selectTab = (tabName) => {
  currentTab.value = tabName
}
</script>

<template>
  <div class="tab-component">
    <div class="top-bar">
      <div class="tabs">
        <button 
        @click="selectTab(tab.name)"
          v-bind:class="{ active: currentTab === tab.name }"
          v-for="tab, index in tabs" :key="index">
        {{ tab.name }}
        </button>
      </div>
  </div>

  <div class="tab-content">
    <div v-for="tab, index in tabs" :key="index">
      <div v-show="currentTab === tab.name">
        <slot :name="tab.name"></slot>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.tab-component {
  background-color: lightgray;
  color: black;
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
  overflow: hidden;
}

.tab-content {
  width: 100%;
  /* border: 1px solid black; */
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

.tab-content div h2 {
  margin: 0;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  width: 100%;
  user-select: none;
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