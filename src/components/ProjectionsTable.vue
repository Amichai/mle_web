<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import SlatePicker from '../components/SlatePicker.vue';
import resetIcon from '@/assets/reset.png'
import uploadIcon from '@/assets/upload.png'
import downloadFileIcon from '@/assets/downloadFile.png'
import { convertTimeStringToDecimal, getCurrentTimeDecimal, setupTableData, postAnalytics } from '../utils.js'
import { useLogoProvider } from '../composables/useLogoProvider.js'
import { useProjectionsParser } from '../composables/useProjectionsParser.js'
import { nameMapper } from './../nameMapper.js'

const emits = defineEmits(['selectedSiteChanged', 'selectedSlateChanged'])

const { getLogo } = useLogoProvider()
const { parseProjectionFile } = useProjectionsParser()

const props = defineProps({
  availableSlates: {
    type: Array,
    required: true
  },
  // selectedSlateGlobal: {
  //   type: Array,
  //   required: true
  // },
  playerData: {
    type: Array,
    required: true
  },
  slatePlayerData: {
    type: Array,
    required: true
  },
  teamData: {
    type: Array,
    required: true
  },
})

watch(() => props.availableSlates, (newVal) => {
})

const isPlayerLocked = (startTime) => {
  const currentTime = getCurrentTimeDecimal()
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  const toReturn = decimalStartTime < currentTime
  return toReturn
}

const selectedSlate = ref('')
const slateData = ref([])
const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

watch(() => props.selectedSlateGlobal, (newVal) => {
  selectedSlate.value = newVal[0]
})

const selectedSlateChanged = async (newSlate) => {
  selectedSlate.value = newSlate[0]
  const newSite = newSlate[1]
  localStorage.setItem('selectedSlate', newSlate)
  emits('selectedSiteChanged', newSite)
  emits('selectedSlateChanged', newSlate)
}

const isNumeric = (value) => {
  return value !== "" && !isNaN(+value);
}

const overrideChanged = (playerRow) => {
  // emits('overrideChanged', playerRow)
  
  if(!(selectedSlate.value in slateToIdToOverride)) {
    slateToIdToOverride[selectedSlate.value] = {}
  }
  const playerIdToOverride = slateToIdToOverride[selectedSlate.value]
  const playerId = playerRow['playerId']
  const override = playerRow['override']
  if(isNumeric(override)) {
    playerIdToOverride[playerId] = parseFloat(override)
  } else {
    delete playerIdToOverride[playerId]
    playerRow['override'] = playerRow['projection']
  }
  
  localStorage.setItem('slateToIdToOverride', JSON.stringify(slateToIdToOverride))
}

const resetProjections = () => {
  const playerIds = slateToIdToOverride[selectedSlate.value]
  for (const playerId in playerIds) {
    delete slateToIdToOverride[selectedSlate.value][playerId];
  }

  slateData.value.forEach((playerRow) => {
    playerRow['override'] = playerRow['projection']
  })

  localStorage.setItem('slateToIdToOverride', JSON.stringify(slateToIdToOverride))
}

const resetRow = (row) => {
  const playerId = row.playerId
  delete slateToIdToOverride[selectedSlate.value][playerId];
  row['override'] = row['projection']
  localStorage.setItem('slateToIdToOverride', JSON.stringify(slateToIdToOverride))

}

watch(() => props.availableSlates, (newVal) => {
  // selectedSlate.value = localStorage.getItem('selectedSlate') || ''
  if(!selectedSlate.value){
    selectedSlate.value = props.availableSlates[0]
  } 
})

const isDataLoaded = computed(() => {
  return props.playerData.length && Object.keys(props.slatePlayerData).length && props.teamData.length
})

const loadTableData = () => {
  if(!isDataLoaded.value) {
    return
  }

  slateData.value = setupTableData(props.playerData, props.slatePlayerData, props.teamData, selectedSlate.value, slateToIdToOverride[selectedSlate.value])
  .filter((playerRow) => {
    return playerRow['position'] !== 'CPT'
  })
}

watch(() => props.teamData, (newVal) => {
  loadTableData()
})

watch(() => props.slatePlayerData, (newVal) => {
  loadTableData()
})

watch(()  => selectedSlate.value, (newVal) => {
  loadTableData()
})

const uploadProjections = () => {
  document.getElementById('formFileProjections').click();
}

const projectionFileUploaded = (evt) => {
  const files = evt.target.files; // FileList object
  const file = files[0];
  const reader = new FileReader()
  reader.onload = function(e) {
    const contents = e.target.result
    const projections = parseProjectionFile(contents)

    for (const playerRow of slateData.value) {
      let name = playerRow.name
      let name2 = null
      if(name in nameMapper) {
        name2 = nameMapper[name]
      }

      if(name in projections) {
        playerRow['override'] = projections[name]
        overrideChanged(playerRow)
      }
      else if(name2 !== null && name2 in projections) {
        playerRow['override'] = projections[name2]
        overrideChanged(playerRow)
      }
    }
  }
  reader.readAsText(file)
}

const downloadProjections = () => {
  const toWrite = 'Name,Projection,Override\n' + slateData.value.map((playerRow) => {
    return `${playerRow.name},${playerRow.projection},${playerRow.override}`
  }).join('\n')

  const blob = new Blob([toWrite], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.setAttribute('download', `MLE Projections ${selectedSlate.value}.csv`);
  a.setAttribute('href', url);

  a.click();
  window.URL.revokeObjectURL(url);

  postAnalytics('download-projections', {
    slate: selectedSlate.value,
  })
}
</script>

<template>
  <div class="projections-header">
    <SlatePicker
      @selectedSlateChanged="selectedSlateChanged"
      :availableSlates="availableSlates"
      :isFirstSlateAsDefault="true"
      />
      <!-- :selected="selectedSlate" -->
    <button class="button reset-button tooltip" @click="resetProjections">
      <img :src="resetIcon" alt="reset projections" width="40">
      <span class="tooltiptext">
        Reset projections
      </span>
    </button>
    <div class="file-upload-wrapper">
      <button class="button upload-button tooltip" @click="uploadProjections">
        <img :src="uploadIcon" alt="upload projections" width="40">
        <span class="tooltiptext">
          Upload projections
        </span>
      </button>
      <input class="form-control-projections" type="file" 
      @change="projectionFileUploaded"
      id="formFileProjections">
    </div>

    <button class="button upload-button tooltip" @click="downloadProjections">
        <img :src="downloadFileIcon" alt="download projections" width="40">
        <span class="tooltiptext">
          Download projections
        </span>
      </button>
  </div>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>Position</th>
        <th>Salary</th>
        <th>Team</th>
        <th>Projection</th>
        <th style="width: 20%;">Override</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(playerRow, index) in slateData" :key="index"
        :class="[playerRow['projection'] != playerRow['override'] ? 'override-row' : '', isPlayerLocked(playerRow.startTime) && 'is-locked']"
      >
      <td><b>{{ index + 1 }}</b></td>
      <td>
        <div class="name-row">
        {{ playerRow['name'] }}
        <div class="out-tag" v-show="playerRow['status'] === 'O'">OUT</div>
        <div class="q-tag" v-show="playerRow['status'] === 'GTD'">Q</div>
        </div>  
      </td>
      <td>{{ playerRow['position'] }}</td>
      <td>{{ playerRow['salary'] }}</td>
      <td><component :is="getLogo(playerRow.team)" /></td>
      <td>{{ playerRow['projection'] }}</td>
      <td>
        <div class="override-cell">
          <input class="override" type="number" v-model="playerRow['override']" 
            @change="() => overrideChanged(playerRow)"
          />
          <div v-if="playerRow.override !== playerRow.projection">
            ({{ playerRow.override - playerRow.projection > 0 ? '+' : '' }}{{ (playerRow.override - playerRow.projection).toFixed(2) }})
            <button class="reset-row" @click="() => resetRow(playerRow)">×</button>
          </div>
        </div>
      </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto', Arial, Helvetica, sans-serif;
  font-weight: 300;
}

th, td {
  border: 1px solid darkgray;
  padding: 0.2rem;
  text-align: left;
}

tr {
  line-height: 1rem;
  font-size: 1rem;
  background-color: #f2f2f2;
}

table tr:nth-child(odd)
{
  background-color: lightgray;
}

thead {
  /* background-color: #f2f2f2; */
}

.override {
  width: 4rem;
}

.projections-header {
  display: flex;
  gap: 1rem;
  flex-direction: row;
  align-items: center;
}

.button {
  border-radius: 50%;
  border: none;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  width: 2.2rem;
  height: 2.2rem;
}

.button:active {
  background-color: gray;
  box-shadow: none;
}
table tr.override-row:nth-child(odd)
{
  background-color: #E9E983 !important;
}

table tr.override-row:nth-child(even)
{
  background-color: #FFFF33 !important;
}

.is-locked {
  color: #6b0c0c !important;
}

.name-row {
  display: flex;
  align-items: center;
}

.out-tag, .q-tag {
  color: rgb(255, 255, 255);
  margin-left: 3px;
  border-radius: 4px;
  padding: 1px 4px;
  font-weight: bold;
  font-size: 10px;
  text-align: center;
}

.out-tag {
  background-color: rgb(184, 20, 39);
}

.q-tag {
  background-color: rgb(202, 71, 11);
}

.override-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.form-control-projections {
  display: none;
}

.reset-row {
  border: none;
  border-radius: 1rem;
}

div {
  line-height: 1rem;
}
</style>