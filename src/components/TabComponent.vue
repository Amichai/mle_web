<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'


const currentTab = ref('Tab1')

const emits = defineEmits([])
</script>

<template>
  <div class="tab-component">

    <div class="tabs">
    <button v-bind:class="{ active: currentTab === 'Tab1' }" @click="currentTab = 'Tab1'">Projections</button>
    <button v-bind:class="{ active: currentTab === 'Tab2' }" @click="currentTab = 'Tab2'">Lineups</button>
  </div>

  <div class="tab-content">
    <div v-show="currentTab === 'Tab1'">
      <h2>Content for Tab 1</h2>
      test1
      <!-- Your content for Tab 1 -->
      esting
    </div>
    <div v-show="currentTab === 'Tab2'">
      <h2>Content for Tab 2</h2>
      test2
      <!-- Your content for Tab 2 -->
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

</style>