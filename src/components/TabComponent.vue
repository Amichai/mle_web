<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import ProjectionsTable from '../components/ProjectionsTable.vue';
import LineupBuilder from '../components/LineupBuilder.vue';
import collapse from '@/assets/collapse.png'
import { nameMapper } from './../nameMapper.js'


const currentTab = ref('Tab1')

const emits = defineEmits(['openPanel'])

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
const tableData = ref([])
const nameToPlayerData = ref({})

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})

onMounted(() => {
  availableSlates.value = props.slateData.map((row) => row[0])
})


watch(() => props.slateData, (newVal) => {
  availableSlates.value = newVal.map((row) => row[0])
})


const loadTableData = () => {
  if(!nameToPlayerData.value) {
    return
  }
  
  const bySlate = availableSlates.value.reduce((acc, slate) => {
    acc[slate] = props.slatePlayerData
    .filter((row) => row[0] === slate)
    .map((row) => {

        let name = row[2]
        if(name in nameMapper) {
          name = nameMapper[name]
        } 
        const playerData = nameToPlayerData.value[name]
        if (!playerData) {
          debugger
        } 
        row.push(playerData[1])
        const projection = playerData[2]
        
        const status = playerData[3]
        if (status === 'O') {
          row.push('0.0')
        } else {
          row.push(projection)
        }
        row.push(status)
        const projectionRounded = Math.round(parseFloat(row[6]) * 100) / 100;
        return {
          name: row[2],
          position: row[3],
          salary: row[4],
          team: row[5],
          projection: projectionRounded,
          override: projectionRounded,
          status: row[7]
        }
      })
    return acc
  }, {})

  tableData.value = bySlate
}

watch(() => props.slatePlayerData, (newVal) => {
  loadTableData()
})

watch(() => props.playerData, (newVal) => {
  for(const row of newVal) {
    nameToPlayerData.value[row[0]] = row
  }

  loadTableData()
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
      <ProjectionsTable 
      :tableData="tableData"
      :availableSlates="availableSlates"
      />
    </div>
    <div v-show="currentTab === 'Tab2'">
      <LineupBuilder />
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