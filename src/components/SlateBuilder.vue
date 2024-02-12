<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import Papa from 'papaparse';
import SlatePicker from '../components/SlatePicker.vue';
import ToggleButton from '../components/ToggleButton.vue';
import LineupsTable from '../components/LineupsTable.vue';
import PlayerExposureComponent from '../components/PlayerExposureComponent.vue';
import ExposureSlider from '../components/ExposureSlider.vue';
import { convertTimeStringToDecimal, getCurrentTimeDecimal, loadPlayerDataForSlate, setupTableData } from '../utils.js'
import hammerIcon from '@/assets/hammer.png'
import liveIcon from '@/assets/live.png'
import { useOptimizer } from '../composables/useOptimizer.js'
import { useLocalStorage } from '../composables/useLocalStorage.js'
import playIcon from '@/assets/play.png'
import stopIcon from '@/assets/stop.png'
import trashIcon from '@/assets/trash.png'
import collapseIcon from '@/assets/arrow.png'
import downloadIcon from '@/assets/download.png'
import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
  
const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  availableSlates: {
    type: Array,
    required: true
  },
  selectedTab: {
    type: String,
    required: true
  },
  teamData: {
    type: Array,
    required: true
  },
  playerData: {
    type: Array,
    required: true
  }
})

const slatePlayerData = ref([])

watch(() => props.selectedTab, (newVal) => {
  stopGeneratingRosters()
})

const isShowingPlayerExposures = ref(false)
const isRosterDifferenceHighlighted = ref(false)

const myIndex = ref(props.index + 1)
const selectedSlate = ref('')
const selectedSlateSite = computed(() => {
  if(!selectedSlate.value) {
    return ''
  }
  if(selectedSlate.value.includes('DK')) {
    return 'dk'
  } else if(selectedSlate.value.includes('FD')) {
    return 'fd'
  }

  return ''
})

const rosterSet = ref([])

const playerByPlayerId = computed(() => {
  const idToPlayer = slatePlayerData.value.reduce((acc, curr) => {
    acc[curr.playerId] = curr
    return acc
  }, {})
  
  return idToPlayer
})

const rowCount = computed(() => {
  return filteredRows.value ? filteredRows.value.length - 1 : 0
})

const averageRosterValue = computed(() => {
  if(rosterSet.value) {
    const total = rosterSet.value.reduce((acc, curr) => {
      return acc + curr.value
    }, 0)

    return total / rosterSet.value.length
  }

  return 0
})

const constructRosterTable = () => {

  tableColumns.value = site.value === 'fd' ? ['Contest', 'PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C', 'Cost', 'Value'] : ['Contest', "PG", "SG", "SF", "PF", "C", "G", "F", "UTIL", 'Cost', 'Value']



  const rows = filteredRows.value ? filteredRows.value.slice(1).map((row) => {
    // return [row[2], '', '', '', '', '', '', '', '', '', '', '']
    return [row[2], row[3].split(':')[1], row[4].split(':')[1], row[5].split(':')[1], row[6].split(':')[1], row[7].split(':')[1], row[8].split(':')[1], row[9].split(':')[1], row[10].split(':')[1], row[11].split(':')[1]]
  }) : []

  if(rosterSet.value) {
    rows.forEach((row, index) => {
      const roster = rosterSet.value[index]
      if(!roster) {
        return
      }

      if(!roster.players) {
        return
      }

      for(var i = 0; i < 9; i += 1) {
        const player = roster.players[i]
        row[i + 1] = player
      }

      const offset = site.value === 'fd' ? 0 : -1

      row[10 + offset] = roster.cost
      row[11 + offset] = roster.value.toFixed(2)
    })
  }

  tableRows.value = rows
}

const filteredRows = ref([])

watch(() => filteredRows.value, (newFilteredRows) => {
  constructRosterTable()
})

watch(() => rosterSet.value, (newRosterSet) => {
  console.log('Roster set updated', newRosterSet)
  constructRosterTable()
})

const areRostersDifferent = (rosters1, rosters2) => {
  if(rosters1.length !== rosters2.length) {
    return true
  }

  for(let i = 0; i < rosters1.length; i += 1) {
    for(let j = 0; j < rosters1[i].players.length; j += 1) {
      if(rosters1[i].players[j]?.playerId !== rosters2[i].players[j]?.playerId) {
        return true
      }
    }
  }
  return false
}

let timeoutId = null
const rostersUpdatedCallback = (rosters) => { 
  console.log('Rosters updated', rosters)
  const areDifferent = areRostersDifferent(rosters, rosterSet.value)
  isRosterDifferenceHighlighted.value = areDifferent
  if(timeoutId) {
    clearTimeout(timeoutId)
  }

  timeoutId = setTimeout(() => {
    isRosterDifferenceHighlighted.value = false
  }, 2000)

  rosterSet.value = rosters.slice(0, rowCount.value)

  setItem('rosterSet', rosterSet.value)
}

const maxExposurePercentage = ref('1')

const { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters } = useOptimizer(rostersUpdatedCallback, maxExposurePercentage)

const { getItem, setItem, setId } = useLocalStorage()

watch(() => props.index, (newVal) => {
  myIndex.value = newVal + 1
})

const emits = defineEmits(['delete', 'gotFocus'])
const reader = new FileReader();

const contests = ref('')

watch(() => maxExposurePercentage.value, (newVal) => {
  console.log('Max exposure changed', newVal)
})

const tableColumns = ref([])
const tableRows = ref([])

const site = computed(() => {
  if(selectedSlate.value.includes('DK')) {
    return 'dk'
  } else if(selectedSlate.value.includes('FD')) {
    return 'fd'
  }

  return ''
})

const isCollapsed = ref(false)

const resetVals = () => {
  console.log('Resetting', props.id)
  contests.value = ''
  tableColumns.value = []
  tableRows.value = []
  selectedSlate.value = ''
  rosterSet.value = []
  setItem('rosterSet', rosterSet.value)
  setItem('tableRows', tableRows.value)
}

onMounted(() => {
  console.log('Mounted', props.id)
  setId(props.id)
  contests.value = getItem('contests')
  selectedSlate.value = getItem('selectedSlate')
  filteredRows.value = getItem('tableRows')
  rosterSet.value = getItem('rosterSet') ?? []
})

const toggleCollapseState = () => {
  console.log('Toggling collapse state')
  isCollapsed.value = !isCollapsed.value
}

const slateSelected = (newVal) => {
  selectedSlate.value = newVal[0]
  emits('gotFocus', newVal)
  isCollapsed.value = false
}

watch(() => props.id, (newVal) => {
  setId(newVal)
})

watch(() => contests.value, (newVal) => {
  setItem('contests', newVal)
})

const isDataLoaded = computed(() => {
  return props.playerData.length && props.teamData.length
})

const loadSlatePlayerData = async (slateName) => {
  const matchedSlate = props.availableSlates.filter((a) => a[0] === slateName)[0]
  if(!matchedSlate) {
    return
  }

  if(!isDataLoaded.value) {
    return
  }

  const slateData = await loadPlayerDataForSlate(matchedSlate)
  slatePlayerData.value = setupTableData(props.playerData, slateData, props.teamData, matchedSlate[0], {})
}

watch(() => props.availableSlates, async (newVal) => {
  console.log('Available slates changed', newVal)

  if(!selectedSlate.value) {
    return
  }

  await loadSlatePlayerData(selectedSlate.value)
})

watch(() => selectedSlate.value, async (newVal) =>{
  setItem('selectedSlate', newVal)
  if(!newVal) {
    return
  }

  if(!Object.keys(props.availableSlates).length) {
    return
  }

  await loadSlatePlayerData(newVal)
})

watch(() => props.teamData, async (newVal) => {
  if(!isDataLoaded.value) {
    return
  }

  await loadSlatePlayerData(selectedSlate.value)
})


const downloadFile = (evt) => {
  evt.stopPropagation()
  stopGeneratingRosters()
  emits('gotFocus', selectedSlate.value)
  const lines = contests.value.split('\n')
  let toWrite = ''
  toWrite += lines[0] + '\n'
  for(var i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    const splitLine = line.split(',')
    const p1 = splitLine[0]
    const p2 = splitLine[1]
    const p3 = splitLine[2]
    const p4 = splitLine[3]
    const roster = rosterSet.value[i - 1]
    const players = roster.players
    if(site.value === 'fd') {
      toWrite += `"${p1}","${p2}","${p3}",`
    } else {
      toWrite += `"${p1}","${p2}","${p3}","${p4}",`
    }

    players.forEach((element) => {
      const playerId = element.playerId
      toWrite += site.value === 'fd' ? `"${playerId}:${element.name}",`
      : `"${playerId}",`
    });
    toWrite += `${roster.value.toFixed(2)},`
    toWrite += `${roster.cost}\n`
  }
  toWrite = toWrite.replace(/\r\n/g, '\n');
  console.log(toWrite)
  const blob = new Blob([toWrite], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);

  const contest_count = lines.length - 1
  const a = document.createElement('a');
  a.setAttribute('download', `${selectedSlate.value} ${contest_count} entries.csv`);
  a.setAttribute('href', url);

  a.click();
  window.URL.revokeObjectURL(url);
}

const updateRosterSetPlayerProjections = () => {
  const idToPlayer = slatePlayerData.value.reduce((acc, curr) => {
    acc[curr.playerId] = curr
    return acc
  }, {})
  rosterSet.value.forEach((roster) => {
    roster.players.forEach((player) => {
      if(!player?.name) {
        return
      }

      player.projection = idToPlayer[player.playerId]?.projection ?? 0
      player.override = idToPlayer[player.playerId]?.override ?? 0
    })

    roster.value = roster.players.reduce((acc, curr) => {
      return acc + curr?.override ?? 0
    }, 0)
    
    roster.cost = roster.players.reduce((acc, curr) => {
      return acc + curr?.cost ?? 0
    }, 0)
  })
  // id to player
  // for each roster, update the players by id
}

const optimizeHandler = async (evt) => {
  evt.stopPropagation()
  emits('gotFocus', selectedSlate.value)
  const currentTime = getCurrentTimeDecimal()
  const slateData = slatePlayerData.value
  updateRosterSetPlayerProjections()
  // const lockedTeams = []
  const lockedTeams = slateData.reduce((acc, curr) => {
    const startTime = convertTimeStringToDecimal(curr.startTime)
    const isLocked = startTime < currentTime
    if(isLocked && !acc.includes(curr.team)) {
      acc.push(curr.team)
    }

    return acc
  }, [])

  startStopGeneratingRosters(slateData, lockedTeams, rosterSet.value, rowCount.value, site.value)
}

const uploadSlateFile = (evt) => {
  emits('gotFocus', selectedSlate.value)
  const files = evt.target.files; // FileList object
  const f = files[0];
  // const name = f.name;

  reader.onload = (() => {
    return function (e) {
      const content = e.target.result
      const result = Papa.parse(content)
      filteredRows.value = result.data.filter(row => row[0] !== '').map(row => row.slice(0, 13))

      setItem('tableRows', filteredRows.value)
      
      const playerSets = filteredRows.value.slice(1).map((row) => {
        const startOffset = site.value === 'dk' ? 1 : 0
        return row.slice(3 + startOffset, 12).map((player) => {
          if(player.includes(' (')){
            const playerId = parseInt(player.split(' (')[1].split(')')[0])
            const matchedPlayer = playerByPlayerId.value[playerId]
            return matchedPlayer
          } else {
            const splitPlayer = player.split(':')
            const playerId = splitPlayer[0]
            const matchedPlayer = playerByPlayerId.value[playerId]
            return matchedPlayer
          }
        })
      })
      rosterSet.value = playerSets.map((playerSet) => {
        return {
          cost: playerSet.reduce((acc, curr) => {
            return acc + parseInt(curr?.salary ?? '0')
          }, 0),
          value: playerSet.reduce((acc, curr) => {
            return acc + curr?.override ?? 0
          }, 0),
          players: playerSet,
        }
      })

      constructRosterTable()
      
      contests.value = Papa.unparse(filteredRows.value)
    };
  })();

  reader.readAsText(f);
}

const deleteSlate = (evt) => {
  evt.stopPropagation()
  stopGeneratingRosters()
  resetVals()
  nextTick(() => {
    emits('delete')
  })
}

</script>

<template>
  <div :class="['root', isGeneratingRosters && 'is-generating-rosters']">
    <div :class="['header']" @click="toggleCollapseState">
      <button class="button delete-button" @click="deleteSlate">
        <img :src="trashIcon" alt="delete slate" width="30">
      </button>
      <SlatePicker 
          v-show="!selectedSlate"
          @selectedSlateChanged="slateSelected"
          :availableSlates="availableSlates" 
          :isFirstSlateAsDefault="false"
          :selected="selectedSlate"
        />
        <div class="slate-name">
          <img :src="fdlogo" alt="fanduel" height="20" v-if="selectedSlateSite === 'fd'">
          <img :src="dklogo" alt="draftkings" height="20" v-if="selectedSlateSite === 'dk'">
            {{ myIndex }} - {{  selectedSlate }}
        </div>
        <div v-show="selectedSlate" class="play-button-parent">
          <button class="button play-button" @click="optimizeHandler" v-show="!isGeneratingRosters">
            <img :src="playIcon" alt="optimize" width="30">
          </button>
          <button class="button play-button" @click="optimizeHandler" v-show="isGeneratingRosters">
            <img :src="stopIcon" alt="optimize" width="30">
          </button>
          <ExposureSlider v-model="maxExposurePercentage" />
        </div>
        <div class="view-selector" v-show="selectedSlate">
          <img :src="hammerIcon" alt="construction view" width="26" height="26">
          <ToggleButton v-model="isShowingPlayerExposures"></ToggleButton>
          <img :src="liveIcon" alt="live view" width="26" height="26">
        </div>
        <div v-show="selectedSlate">
          <div class="collapse-button" @click="toggleCollapseState">
            <img :src="collapseIcon" alt="expand" width="26" height="26"
            @click="toggleCollapseState"
            v-show="isCollapsed"
            >
            <img :src="collapseIcon" alt="collapse" width="26" height="26" class="expand-button-state"
            @click="toggleCollapseState"
            v-show="!isCollapsed"
            >
          </div>
        </div>
    </div>
    <div 
      :class="['status-bar', isRosterDifferenceHighlighted && 'highlight-difference']"  @click="toggleCollapseState">
      <div v-if="rowCount > 0">
        {{ rowCount }} roster{{ rowCount > 1 ? 's': '' }} average projection: {{ averageRosterValue.toFixed(2) }}
      </div>
      <div>
        <button class="button download-button" @click="downloadFile">
          <img :src="downloadIcon" alt="download" width="20" height="20">
        </button>
      </div>
    </div>
    <div v-show="!isCollapsed">
      <div class="input-grid" v-show="selectedSlate">
        <LineupsTable 
          v-show="!isShowingPlayerExposures"
          :columns="tableColumns"
          :rows="tableRows"
          :currentTime="getCurrentTimeDecimal()"
        ></LineupsTable>
        <PlayerExposureComponent 
          v-show="isShowingPlayerExposures"
          :rosters="rosterSet"
        />
      </div>
      <div class="input-file-row" v-show="selectedSlate">
        <input class="form-control" @change="uploadSlateFile" type="file" id="formFile">
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-grid {
  overflow: auto;
  min-height: 6rem;
}

.span-3 {
  grid-column: span 3;
}

.input-file-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
  grid-column: span 4;
}

#formFile {
  width: 100%;
  color: black;
  font-size: 0.8em;
  padding: 0;
}

.root {
  border: 1px solid white;
  padding: 0 1rem;
}

.header {
  display: grid;
  grid-template-columns: 1fr 2.5fr 1fr 2.5fr 1fr;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
}

.delete-button, .play-button, .download-button {
  border-radius: 50%;
  border: none;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  width: 1.9rem;
  height: 1.9rem;
}

.delete-button:active, .play-button:active, .download-button:active {
  background-color: gray;
  box-shadow: none;
}

.view-selector {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 0.5rem;
  justify-content: center;
}


.slate-name {
  font-size: 1rem;
  padding: 0.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collapse-button {
  display: flex;
  justify-content: flex-end;
}

.play-button-parent {
  text-align: center;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.expand-button-state {
  transform: rotate(180deg);
}

.status-bar {
  display: flex;
  line-height: 1rem;
  font-size: 1rem;
  padding: 0.2rem 1rem;
  margin-bottom: 0.2rem;
  justify-content: space-between;
}

.is-generating-rosters {
  background-color: lightgreen;
}

@keyframes fadeBackgroundColor {
  from {
    background-color: yellow; /* Starting color */
  }
  to {
    background-color: transparent; /* End color */
  }
}

.highlight-difference {
  animation: fadeBackgroundColor 2s forwards;
  border-radius: 0.5rem;
}

</style>