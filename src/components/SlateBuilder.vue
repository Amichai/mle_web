<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import Papa from 'papaparse';
import SlatePicker from '../components/SlatePicker.vue';
import ToggleButton from '../components/ToggleButton.vue';
import TableComponent from '../components/TableComponent.vue';
import hammerIcon from '@/assets/hammer.png'
import liveIcon from '@/assets/live.png'
import { useOptimizer } from '../composables/optimizer.js'
import { useLocalStorage } from '../composables/useLocalStorage.js'
import playIcon from '@/assets/play.png'
import stopIcon from '@/assets/stop.png'
import trashIcon from '@/assets/trash.png'
  
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
  tableData: {
    type: Object,
    required: true
  },
})

const myIndex = ref(props.index + 1)
const selectedSlate = ref('')

const rosterSet = ref([])

const constructRosterTable = () => {

  tableColumns.value = ['Contest', 'PG', 'PG', 'SG', 'SG', 'SF', 'SF', 'PF', 'PF', 'C', 'Cost', 'Value']
  const rows = filteredRows.value.slice(1).map((row) => {
    return [row[2], '', '', '', '', '', '', '', '', '', '', '']
  })



  rows.forEach((row, index) => {
    const roster = rosterSet.value[index]
    if(!roster) {
      return
    }

    row[10] = roster[1]
    // row[10] = roster.value
  })

  tableRows.value = rows
}

const filteredRows = ref([])

watch(() => filteredRows.value, (newFilteredRows) => {
  constructRosterTable()
})

watch(() => rosterSet.value, (newRosterSet) => {
  console.log('Roster set updated', newRosterSet)
  constructRosterTable()
  // tableRows.value.forEach((row, index) => {
  //   row.map((element, index2) => {
  //     row[index2 + 3] = rosterSet[index][0][index2]?.name
  //   })
  //   row.push('test')
  // })
})

const rostersUpdatedCallback = (rosters) => { 
  console.log('Rosters updated', rosters)
  rosterSet.value = rosters
  setItem('rosterSet', rosters)
}

const { startStopGeneratingRosters, isGeneratingRosters } = useOptimizer(30, rostersUpdatedCallback)

const { getItem, setItem, setId } = useLocalStorage()

watch(() => props.index, (newVal) => {
  myIndex.value = newVal + 1
})

const emits = defineEmits(['delete'])
const reader = new FileReader();

const contests = ref('')

const tableColumns = ref([])
const tableRows = ref([])

const site = ref('fd')
const startTime = ref(0)

const resetVals = () => {
  console.log('Resetting', props.id)
  contests.value = ''
  tableColumns.value = []
  tableRows.value = []
}

onMounted(() => {
  console.log('Mounted', props.id)
  contests.value = getItem('contests')
  selectedSlate.value = getItem('selectedSlate')
  filteredRows.value = getItem('tableRows')
  rosterSet.value = getItem('rosterSet')
})

const slateSelected = (newVal) => {
  selectedSlate.value = newVal
}

watch(() => props.id, (newVal) => {
  setId(newVal)
})

watch(() => contests.value, (newVal) => {
  setItem('contests', newVal)
})

watch(() => selectedSlate.value, (newVal) => {
  setItem('selectedSlate', newVal)
})

const constructOutputFile = (rosters, filename) => {
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
    const roster = rosters[i - 1]
    const playerParts = roster.players.split(',')
    if(site.value === 'fd') {
      toWrite += `"${p1}","${p2}","${p3}",`
    } else {
      toWrite += `"${p1}","${p2}","${p3}","${p4}",`
    }
    playerParts.forEach((element) => {
      toWrite += `"${element}",`
    });
    
    toWrite += `${roster.value},`
    toWrite += `${roster.cost}\n`
  }
  
  toWrite = toWrite.replace(/\r\n/g, '\n');
  console.log(toWrite)
  const blob = new Blob([toWrite], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.setAttribute('download', filename);
  a.setAttribute('href', url);

  a.click();
  window.URL.revokeObjectURL(url);
}

const getCurrentTimeDecimal = () => {
  var now = new Date();
  var current_time = (now.getHours() - 12) + (now.getMinutes() / 60);
  current_time = Math.round(current_time * 100) / 100; // rounding to 2 decimal places
  return current_time;
}

const showExposures = async () => {
  // const exposures = await getRosterExposures(slateId.value, contests.value, sport.value, site.value)
  
  // slatePlayers.value = JSON.parse(exposures.name_to_player)
  // playerExposures.value = Object.keys(exposures.player_exposures).map((player) => {
  //   return [player, exposures.player_exposures[player]]
  // }).sort((a, b) => b[1] - a[1])

  // startTimeExposures.value = exposures.start_times

  // console.log(playerExposures.value)
  // console.log(startTimeExposures.value)
}

const optimizeHandler = async () => {
  const currentTime = getCurrentTimeDecimal()
  const slateData = props.tableData[selectedSlate.value]
  const byPosition = slateData.reduce((acc, curr) => {
    const positions = curr.position.split('/')
    positions.forEach((position) => {
      if (acc[position] === undefined) {
        acc[position] = []
      }

      curr.cost = parseInt(curr.salary)
      acc[position].push(curr)
    })
    
    return acc
  }, {})

  startStopGeneratingRosters(byPosition, [])
  if (currentTime > startTime.value) {
    // reoptimize()
    // optimize(selectedSlate.value)
    // alert('Slate has already started')
    // return


    // const result = await runReoptimizer(sport.value, site.value, 
    // gameType.value, slateId.value, rosterCount.value, iterCount.value, contests.value, excludedPlayers.value)
    // constructOutputFile(result, `${site.value}_${slateName.value}_${slateId.value}_reopto.csv`)
  } else {
    // optimize(selectedSlate.value)
    // const result = await runOptimizer(sport.value, site.value, 
    // gameType.value, slateId.value, rosterCount.value, iterCount.value, excludedPlayers.value)
    // constructOutputFile(result, `${site.value}_${slateName.value}_${slateId.value}.csv`)
  }
}

const uploadSlateFile = (evt) => {
  const files = evt.target.files; // FileList object
  const f = files[0];
  const name = f.name;

  reader.onload = (() => {
    return function (e) {
      const content = e.target.result
      const result = Papa.parse(content)
      filteredRows.value = result.data.filter(row => row[0] !== '').map(row => row.slice(0, 13))

      setItem('tableRows', filteredRows.value)
      
      constructRosterTable()
      
      contests.value = Papa.unparse(filteredRows)

    };
  })();

  reader.readAsText(f);
}

const reoptimizeHandler = async  (sport, site, type) => {
  // const result = await runReoptimizer(sport, site, type, slateId.value, rosterCount.value, iterCount.value, contests.value, excludedPlayers.value)
  // console.log(result)
  // constructOutputFile(result, `${site}_reoptimize.csv`)
}

const deleteSlate = () => {
  resetVals()
  nextTick(() => {
    emits('delete')
  })
}

</script>

<template>
  <div class="root">
    <div class="header">
      <button class="button delete-button" @click="deleteSlate">
        <img :src="trashIcon" alt="delete slate" width="30">
      </button>
      <div class="slate-number">
        {{ myIndex }}
      </div>
      <SlatePicker 
        @selectedSlateChanged="slateSelected"
        :availableSlates="availableSlates" 
        :isFirstSlateAsDefault="false"
        :selected="selectedSlate"
        />
        <button class="button play-button" @click="optimizeHandler" v-show="!isGeneratingRosters">
          <img :src="playIcon" alt="optimize" width="30">
        </button>
        <button class="button play-button" @click="optimizeHandler" v-show="isGeneratingRosters">
          <img :src="stopIcon" alt="optimize" width="30">
        </button>
        <div class="view-selector">
          <img :src="hammerIcon" alt="construction view" width="26" height="26">
          <ToggleButton></ToggleButton>
          <img :src="liveIcon" alt="live view" width="26" height="26">
        </div>
    </div>
    <div class="input-grid">
      <!-- <textarea name="rosters" class="roster-results span-3" rows="3" placeholder="contests" v-model="contests"></textarea> -->
      <TableComponent 
      :columns="tableColumns"
      :rows="tableRows"
      ></TableComponent>
    </div>
    <div class="input-file-row">
      <input class="form-control" @change="uploadSlateFile" type="file" id="formFile">
    </div>
  </div>
</template>

<style scoped>
.input-grid {
  overflow: auto;
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
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 1rem;
  justify-content: space-between;
}

.delete-button, .play-button {
  border-radius: 50%;
  border: none;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  width: 1.9rem;
  height: 1.9rem;
}

.delete-button:active, .play-button:active {
  background-color: gray;
  box-shadow: none;
}

.view-selector {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 0.5rem;
}

.slate-number {
  font-size: 1rem;
  font-weight: bold;
  color: black;
  border-radius: 50%;
  padding: 0 0.5rem;
}
</style>