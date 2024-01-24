<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import ProjectionsTable from '../components/ProjectionsTable.vue';
import LineupBuilderTab from '../components/LineupBuilderTab.vue';
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
const nameToPlayerData = ref(null)
const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

const selectedSlate = ref('')

const loadNameToPlayerData = () => {
  nameToPlayerData.value = {}
  for(const row of props.playerData) {
    let name = row[0]
    if(name in nameMapper) {
      name = nameMapper[name]
    }

    nameToPlayerData.value[name] = row
  }
}

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})

onMounted(() => {
  availableSlates.value = props.slateData.map((row) => row[0])

  if(props.playerData.length === 0) {
    return
  }
  loadNameToPlayerData()

  loadTableData()
})


watch(() => props.slateData, (newVal) => {
  availableSlates.value = newVal.map((row) => row[0])
})


const loadTableData = () => {
  if(!nameToPlayerData.value) {
    return
  }

  const teamToStartTime = props.teamData.reduce((acc, row) => {
    acc[row[0]] = row[2]
    return acc
  }, {})
  
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
          ///Are you missing a name conversion here?
          // debugger
          return {
            name: name,
            position: row[3],
            salary: row[4],
            team: row[5],
            projection: 0,
            override: 0,
            status: row[7],
            startTime: teamToStartTime[row[5]]
          }
        } 

        // row.push(playerData[1])

        let projection = '0.0'

        if(slate.includes('DK')) {
          projection = playerData[3]
        } else {
          projection = playerData[2]
        }
        
        const status = playerData[4]
        if (status === 'O') {
          row.push('0.0')
        } else {
          row.push(projection)
        }
        row.push(status)

        const projectionRounded = Math.round(parseFloat(row[6]) * 100) / 100;

        const overrides = slateToIdToOverride[slate]
        return {
          name: row[2],
          playerId: row[1],
          position: row[3],
          salary: row[4],
          team: row[5],
          projection: projectionRounded,
          override: overrides ? overrides[row[1]] ?? projectionRounded : projectionRounded,
          status: row[7],
          startTime: teamToStartTime[row[5]]
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
  loadNameToPlayerData()

  loadTableData()
})

const selectTab = (tabName) => {
  currentTab.value = tabName
}

</script>

<template>
  <div class="tab-component">
    <div class="top-bar">
      <div class="tabs">
        <button v-bind:class="{ active: currentTab === 'Tab1' }" @click="selectTab('Tab1')">Projections</button>
        <button v-bind:class="{ active: currentTab === 'Tab2' }" @click="selectTab('Tab2')">Lineups</button>
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
        :selectedSlateGlobal="selectedSlate"
      />
    </div>
    <div v-show="currentTab === 'Tab2'">
      <LineupBuilderTab 
        :availableSlates="availableSlates"
        :tableData="tableData"
        :selectedTab="currentTab"
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