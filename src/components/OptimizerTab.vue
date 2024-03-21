<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import SlatePicker from '../components/SlatePicker.vue';
import LineupsTable from '../components/LineupsTable.vue';
import { convertTimeStringToDecimal, getCurrentTimeDecimal, loadPlayerDataForSlate, setupTableData, postRosterSet } from '../utils.js'
import { useOptimizer } from '../composables/useOptimizer.js'
import { useLocalStorage } from '../composables/useLocalStorage.js'
import playIcon from '@/assets/play.png'
import stopIcon from '@/assets/stop.png'
import copyIcon from '@/assets/copy.png'

  
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
const tableRows = ref([])

watch(() => props.selectedTab, (newVal) => {
  stopGeneratingRosters()
})

const isRosterDifferenceHighlighted = ref(false)
const rosterCount = ref(10)

watch(() => rosterCount.value, (newVal) => {
  setItem('rosterCount', newVal)
  constructRosterTable()
})

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

const averageRosterValue = computed(() => {
  if(rosterSet.value) {
    const total = rosterSet.value.reduce((acc, curr) => {
      return acc + curr.value
    }, 0)

    return total / rosterSet.value.length
  }

  return 0
})

const getContestParams = (selectedSlate) => {

  const uploadTemplates = [
    {
      type: 'FD Classic',
      firstLine: ['entry_id', 'contest_id', 'contest_name', 'PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C'],
      columnsToSet: ['PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C', 'Cost', 'Value'],
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
      columnsToSet: ['MVP 2x', 'STAR 1.5x', 'PRO 1.2x', 'UTIL', 'UTIL', 'Cost', 'Value'],
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
      columnsToSet: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'Cost', 'Value'],
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
      columnsToSet: ['CPT', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'UTIL', 'Cost', 'Value'],
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
    return template.isSlateNameConsistent(selectedSlate)
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

watch(() => playerByPlayerId.value, (newVal) => {
  constructRosterTable()
})

const constructRosterTable = () => {
  if(!Object.keys(playerByPlayerId.value).length) {
    return
  }

  contestParams.value = getContestParams(selectedSlate.value)
  const { columnsToSet, costColumnIndex } = contestParams.value

  let rows = Array.from({ length: rosterCount.value }, (_, index) => index).map(() => {
    return ['', ...new Array(columnsToSet.length - 1).fill('')]
  })

  rosterSet.value.slice(0, rosterCount.value).forEach((roster, index) => {
    const row = rows[index]
    roster.players.forEach((player, playerIndex) => {
      row[playerIndex] = player
    })

    row[costColumnIndex - 1] = roster.cost
    row[costColumnIndex] = roster.value.toFixed(2)
  })

  tableRows.value = rows
  tableColumns.value = columnsToSet
}


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

  rosterSet.value = rosters.slice(0, rosterCount.value)
  

  setItem('rosterSet', rosterSet.value)
  constructRosterTable()
}

const maxExposurePercentage = ref('1')

const { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters } = useOptimizer(rostersUpdatedCallback, maxExposurePercentage)

const { getItem, setItem, setId } = useLocalStorage()

watch(() => props.index, (newVal) => {
  myIndex.value = newVal + 1
})

const emits = defineEmits(['delete', 'gotFocus'])

watch(() => maxExposurePercentage.value, (newVal) => {
  setItem('maxExposurePercentage', newVal)
})

const tableColumns = ref([])

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

onMounted(() => {
  console.log('Mounted', props.id)
  setId(props.id)
  selectedSlate.value = getItem('selectedSlate')
  tableColumns.value = getItem('tableColumns', [])
  rosterSet.value = getItem('rosterSet', [])
  maxExposurePercentage.value = getItem('maxExposurePercentage', '1')
  rosterCount.value = getItem('rosterCount', 10)
  constructRosterTable()
})

const slateSelected = (newVal) => {
  selectedSlate.value = newVal[0]
  emits('gotFocus', newVal)
}

watch(() => props.id, (newVal) => {
  setId(newVal)
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
  const oldVal = getItem('selectedSlate')
  if(newVal !== oldVal) {
    setItem('selectedSlate', newVal)
    rosterSet.value = []
  }

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


  startStopGeneratingRosters(slateData, lockedTeams, rosterSet.value, rosterCount.value, site.value, contestParams)
}

const copyToClipboardLegacy = (text) => {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    // console.log('Text copied to clipboard successfully: ' + text);
}

const copyRosters = () => {
  let toWrite = ''
  for(var i = 0; i < rosterSet.value.length; i += 1) {
    const roster = rosterSet.value[i]
    const players = roster.players
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
  copyToClipboardLegacy(toWrite)

  postRosterSet('lineupsCopied', rosterSet.value, '', site.value)
}

</script>

<template>
  <div :class="['root', isGeneratingRosters && 'is-generating-rosters']">
    <div :class="['header']" @click="toggleCollapseState">
      <div class="slate-picker">
        <SlatePicker 
            @selectedSlateChanged="slateSelected"
            :availableSlates="availableSlates" 
            :isFirstSlateAsDefault="false"
            :selected="selectedSlate"
        />
      </div>
      <div class="roster-count">
        rosters:
        <input class="roster-count-field" type="number" v-model="rosterCount" min="1" step="1"/>
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

      <div class="copy-button">
        <button class="button play-button tooltip" @click="copyRosters">
          <span class="tooltiptext">
            Copy rosters
          </span>
          <img :src="copyIcon" alt="optimize" width="30">
        </button>
      </div>
    </div>
    <div 
      :class="['status-bar', isRosterDifferenceHighlighted && 'highlight-difference']"  @click="toggleCollapseState">
      <div v-if="rosterCount > 0">
        {{ rosterCount }} roster{{ rosterCount > 1 ? 's': '' }} average projection: {{ isNaN(averageRosterValue) ? '0' : averageRosterValue.toFixed(2) }}
      </div>
    </div>
    <div>
      <LineupsTable 
        :columns="tableColumns"
        :rows="tableRows"
        :currentTime="getCurrentTimeDecimal()"
      ></LineupsTable>
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
  padding: 0 1rem;
}

.header {
  display: flex;
  /* align-items: center; */
  /* grid-template-columns: 1fr 1fr 1fr; */
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

.setting-tab {
  display: grid;
  grid-template-columns: 10rem 1fr;
  font-size: 1rem;
  gap: 1rem;
  padding: 1rem;
}

.slate-picker {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-style: italic;
}

.roster-count {
  align-self: center;
  font-family: var(--ff-base);
}

.roster-count-field {
  width: 3rem;
  text-align: center;
}

.copy-button {
  align-self: center;
}
</style>