<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import Papa from 'papaparse';
import SlatePicker from '../components/SlatePicker.vue';
import LineupsTable from '../components/LineupsTable.vue';
import PlayerExposureComponent from '../components/PlayerExposureComponent.vue';
import ExposureSlider from '../components/ExposureSlider.vue';
import { convertTimeStringToDecimal, getCurrentTimeDecimal, loadPlayerDataForSlate, setupTableData } from '../utils.js'
import { useOptimizer } from '../composables/useOptimizer.js'
import { useLocalStorage } from '../composables/useLocalStorage.js'
import playIcon from '@/assets/play.png'
import stopIcon from '@/assets/stop.png'
import trashIcon from '@/assets/trash.png'
import collapseIcon from '@/assets/arrow.png'
import downloadIcon from '@/assets/download.png'
import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
import PlayerSlateTabs from '../components/PlayerSlateTabs.vue';
  
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
const contestParams = ref([])

watch(() => props.selectedTab, (newVal) => {
  stopGeneratingRosters()
})

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

const getContestParams = (firstRow) => {

  const uploadTemplates = [
    {
      type: 'FD Classic',
      firstLine: ['entry_id', 'contest_id', 'contest_name', 'PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C'],
      columnsToSet: ['Contest', 'PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C', 'Cost', 'Value'],
      lastColumnIndex: 12,
      positionsToFill: ["PG", "PG", "SG", "SG", "SF", "SF", "PF", "PF", "C"],
      costColumnIndex: 10,
      firstColumnIndex: 3,
      contestNameColumnIndex: 2,
      isSlateNameConsistent: (slateName) => {
        return slateName.includes('FD')
          && !slateName.includes('Single game')
      }
    },
    {
      type: 'FD Single Game',
      firstLine: ['entry_id', 'contest_id', 'contest_name', 'MVP - 2X Points', 'STAR - 1.5X Points', 'PRO - 1.2X Points', 'UTIL', 'UTIL'],
      columnsToSet: ['Contest', 'MVP 2x', 'STAR 1.5x', 'PRO 1.2x', 'UTIL', 'UTIL', 'Cost', 'Value'],
      positionsToFill: ['UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL'],
      lastColumnIndex: 8,
      positionalScoreBoost: [2, 1.5, 1.2],
      costColumnIndex: 6,
      firstColumnIndex: 3,
      contestNameColumnIndex: 2,
      isSlateNameConsistent: (slateName) => {
        return slateName.includes('FD')
          && slateName.includes('Single game')
      }
    },
    {
      type: 'DK Classic',
      firstLine: ['Entry ID','Contest Name', 'Contest ID', 'Entry Fee', 'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'],
      columnsToSet: ['Contest', 'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'Cost', 'Value'],
      lastColumnIndex: 12,
      positionsToFill: ["PG", "SG", "SF", "PF", "C", "G", "F", "UTIL"],
      costColumnIndex: 9,
      firstColumnIndex: 4,
      contestNameColumnIndex: 1,
      isSlateNameConsistent: (slateName) => {
        return slateName.includes('DK')
          && !slateName.includes('SHOWDOWN')
      }
    },
    {
      type: 'DK Single Game',
      firstLine: ['Entry ID', 'Contest Name', 'Contest ID', 'Entry Fee', 'CPT', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL'],
      columnsToSet: ['Contest', 'CPT', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'Cost', 'Value'],
      positionsToFill: ['UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL'],
      lastColumnIndex: 10,
      positionalScoreBoost: [1.5],
      positionalCostBoost: [1.5],
      costColumnIndex: 7,
      firstColumnIndex: 4,
      contestNameColumnIndex: 1,
      isSlateNameConsistent: (slateName) => {
        return slateName.includes('DK')
          && slateName.includes('SHOWDOWN')
      }
    },
  ]

  const matchedTemplate = uploadTemplates.filter((template) => {
    const matches = firstRow.map((element, index) => {
      return element === template.firstLine[index] || template.firstLine.length <= index
    })

    return matches.every((element) => element === true)
  })

  if(matchedTemplate.length) {
    return matchedTemplate[0]
  }

  throw new Error('Unable to parse upload template')
}

const parsePlayerIdFromCell = (cell) => {
  if(cell.includes(' (')){
    return cell.split(' (')[1].split(')')[0]
  } 
  
  if(cell.includes(':')){
    return cell.split(':')[0]
  }

  return cell
}

const getPlayerFromPlayerId = (playerId) => {
  return playerByPlayerId.value[playerId] ?? null
}

watch(() => playerByPlayerId.value, (newVal) => {
  constructRosterTable()
})

const constructRosterTable = () => {
  if(!filteredRows.value || !filteredRows.value.length) {
    return
  }

  if(!Object.keys(playerByPlayerId.value).length) {
    return
  }
  ///given filtered rows
  /// construct tableRows
  /// construct rosterSet
  const firstRow = filteredRows.value[0]
  contestParams.value = getContestParams(firstRow)
  const { columnsToSet, costColumnIndex, lastColumnIndex, firstColumnIndex, contestNameColumnIndex } = contestParams.value

  let rows = []
  if(!rosterSet.value || !Object.keys(rosterSet.value).length) {
    rows = filteredRows.value ? filteredRows.value.slice(1).map((row) => {
      return [row[contestNameColumnIndex], ...row.slice(firstColumnIndex, lastColumnIndex).map(parsePlayerIdFromCell).map(getPlayerFromPlayerId)]
    }) : []

    rosterSet.value = rows.map((row) => {
      const playerSet = row.slice(1)

      const cost = playerSet.reduce((acc, curr) => {
        return acc + parseInt(curr?.salary ?? '0')
      }, 0)
      
      const roster = {
        cost,
        value: playerSet.reduce((acc, curr) => {
          return acc + curr?.override ?? 0
        }, 0),
        players: playerSet,
      }

      return roster
    })
  } else {
    rows = rosterSet.value.map((roster, idx) => {
      return [filteredRows.value.slice(1)[idx][contestNameColumnIndex], ...roster.players]
    })
  }

  rosterSet.value.forEach((roster, index) => {
    const row = rows[index]
    row[costColumnIndex] = roster.cost
    row[costColumnIndex + 1] = roster.value.toFixed(2)
  })

  tableRows.value = rows
  tableColumns.value = columnsToSet
}

const filteredRows = ref([])

watch(() => filteredRows.value, (newFilteredRows) => {
  constructRosterTable()
})

watch(() => rosterSet.value, (newRosterSet) => {
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
  setItem('maxExposurePercentage', newVal)
})

const tableColumns = ref([])
const tableRows = ref([])

const site = computed(() => {
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
  setItem('tableColumns', tableColumns.value)
}

onMounted(() => {
  console.log('Mounted', props.id)
  setId(props.id)
  contests.value = getItem('contests')
  selectedSlate.value = getItem('selectedSlate')
  filteredRows.value = getItem('tableRows', [])
  tableColumns.value = getItem('tableColumns', [])
  rosterSet.value = getItem('rosterSet', [])
  isCollapsed.value = getItem('isCollapsed', false)
  maxExposurePercentage.value = getItem('maxExposurePercentage', '1')
})

watch(() => isCollapsed.value, (newVal) => {
  setItem('isCollapsed', newVal)
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

  const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

  const slateData = await loadPlayerDataForSlate(matchedSlate)
  slatePlayerData.value = setupTableData(props.playerData, slateData, props.teamData, matchedSlate[0], slateToIdToOverride[selectedSlate.value])
}

watch(() => props.availableSlates, async (newVal) => {
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
    
    roster.value = roster.valueComputed ? roster.valueComputed(roster.players) : roster.players.reduce((acc, curr) => {
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
  
  await loadSlatePlayerData(selectedSlate.value)

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


  startStopGeneratingRosters(slateData, lockedTeams, rosterSet.value, rowCount.value, site.value, contestParams)
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
      const rows = result.data.filter(row => row[0] !== '').map(row => row.slice(0, 13))
      
      const firstRow = rows[0]
      contestParams.value = getContestParams(firstRow)
      if(!contestParams.value.isSlateNameConsistent(selectedSlate.value)){
        alert('Slate name does not match the contest type')
        return
      }

      filteredRows.value = rows


      setItem('tableRows', filteredRows.value)
      
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
      <button class="button delete-button tooltip" @click="deleteSlate">
        <img :src="trashIcon" alt="delete slate" width="30">
        <span class="tooltiptext">
            Delete slate
        </span>
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
          <button class="button play-button tooltip" @click="optimizeHandler" v-show="!isGeneratingRosters">
            <span class="tooltiptext">
              Start optimizing
            </span>
            <img :src="playIcon" alt="optimize" width="30">
          </button>
          <button class="button play-button tooltip" @click="optimizeHandler" v-show="isGeneratingRosters">
            <span class="tooltiptext">
              Stop optimizing
            </span>
            <img :src="stopIcon" alt="optimize" width="30">
          </button>
        </div>
        <div v-show="selectedSlate">
          <div class="collapse-button">
            <img :src="collapseIcon" alt="expand" width="26" height="26"
            v-show="isCollapsed"
            >
            <img :src="collapseIcon" alt="collapse" width="26" height="26" class="expand-button-state"
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
        <button class="button download-button tooltip" @click="downloadFile">
          <span class="tooltiptext tooltiptext-left">
            Download lineups
          </span>
          <img :src="downloadIcon" alt="download" width="20" height="20">
        </button>
      </div>
    </div>
    <div v-show="!isCollapsed">
      <div class="input-grid" v-show="selectedSlate">
      <PlayerSlateTabs
        v-show="filteredRows.length"
        :tabs="[
          {name: 'Lineups'}, 
          {name: 'Exposure'},
          {name: 'Settings'}]"
      >
        <template v-slot:Lineups>
          <LineupsTable 
          :columns="tableColumns"
          :rows="tableRows"
          :currentTime="getCurrentTimeDecimal()"
        ></LineupsTable>
        </template>
        <template v-slot:Exposure>
          <PlayerExposureComponent
          :rosters="rosterSet"
        /> 
        </template>
        <template v-slot:Settings>
          <div class="setting-tab">
            <p>Max player exposure:</p>
            <ExposureSlider v-model="maxExposurePercentage" />
          </div>
        </template>
      </PlayerSlateTabs>
        <!-- 
       -->
      </div>
      <div class="input-file-row" v-show="selectedSlate && !filteredRows.length">
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
  /* align-items: center; */
  grid-template-columns: 10rem 1fr 10rem 10rem;
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


.tooltip {
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
}

/* Tooltip text */
.tooltip .tooltiptext {
  visibility: hidden;
  width: 120px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
 
  /* Position the tooltip text - see examples below! */
  position: absolute;
  z-index: 100;
  top: 2rem;
  left: -120%;
}

.tooltiptext-left {

}

/* Show the tooltip text when you mouse over the tooltip container */
.tooltip:hover .tooltiptext {
  visibility: visible;
}

.setting-tab {
  display: grid;
  grid-template-columns: 10rem 1fr;
  font-size: 1rem;
  gap: 1rem;
  padding: 1rem;
}
</style>