<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import ProjectionsTable from '../components/ProjectionsTable.vue';
import LineupBuilderTab from '../components/LineupBuilderTab.vue';
import collapse from '@/assets/collapse.png'
import { nameMapper } from './../nameMapper.js'


const currentTab = ref('Tab1')

const emits = defineEmits(['openPanel', 'selectedSiteChanged', 'selectedSlateChanged'])

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  playerData: {
    type: Array,
    required: true
  },
  teamData: {
    type: Array,
    required: true
  },
  slateData: {
    type: Array,
    required: true
  },
  slatePlayerData: {
    type: Array,
    required: true
  },
})

const isOpenLocal = ref(props.isOpen)

const availableSlates = ref([])
const nameToPlayerData = ref(null)
const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

const selectedSlate = ref('')

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})

onMounted(() => {
  availableSlates.value = props.slateData.map((row) => row[0])
})


watch(() => props.slateData, (newVal) => {
  availableSlates.value = newVal
})

const selectTab = (tabName) => {
  currentTab.value = tabName
}

const selectedSiteChanged = (newSite) => {
  emits('selectedSiteChanged', newSite)
}

const selectedSlateChanged = (newSlate) => {
  emits('selectedSlateChanged', newSlate)
}

</script>

<template>
  <div class="tab-component">
    <div class="top-bar">
      <div class="tabs">
        <button v-bind:class="{ active: currentTab === 'Tab1' }" @click="selectTab('Tab1')">Projections</button>
        <button v-bind:class="{ active: currentTab === 'Tab2' }" @click="selectTab('Tab2')">Slates</button>
      </div>


    <button class="open-button" @click="emits('openPanel')" v-show="!isOpenLocal">
      <img :src="collapse" alt="collapse" height="20">
    </button>
  </div>

  <div class="tab-content">
    <div v-show="currentTab === 'Tab1'">
      <!-- :selectedSlateGlobal="selectedSlate" -->
      <ProjectionsTable 
        :availableSlates="availableSlates"
        :playerData="playerData"
        :slatePlayerData="slatePlayerData"
        :teamData="teamData"
        @selectedSiteChanged="selectedSiteChanged"
        @selectedSlateChanged="selectedSlateChanged"
      />
    </div>
    <div v-show="currentTab === 'Tab2'">
      <LineupBuilderTab 
        :availableSlates="availableSlates"
        :playerData="playerData"
        :selectedTab="currentTab"
        :teamData="teamData"
        @slateGotFocus="selectedSlate = $event"
      />
    </div>
  </div>

  </div>
</template>

<style scoped>
.tab-component {
  background-color: lightgray;
  color: black;
  height: calc(100vh - 6rem);
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
  overflow: auto;
}

.tab-content {
  width: 100%;
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