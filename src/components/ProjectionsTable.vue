<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import SlatePicker from '../components/SlatePicker.vue';
import resetIcon from '@/assets/reset.png'
import uploadIcon from '@/assets/upload.png'
import { convertTimeStringToDecimal } from '../utils.js'
import { useLogoProvider } from '../composables/useLogoProvider.js'

const emits = defineEmits(['selectedSiteChanged'])

const { getLogo } = useLogoProvider()

const props = defineProps({
  availableSlates: {
    type: Array,
    required: true
  },
  tableData: {
    type: Object,
    required: true
  },
  selectedSlateGlobal: {
    type: String,
    required: true
  },
})

const isPlayerLocked = (startTime) => {
  const currentTime = getCurrentTimeDecimal()
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  const toReturn = decimalStartTime < currentTime
  return toReturn
}

const getCurrentTimeDecimal = () => {
  var now = new Date();
  var current_time = (now.getHours() - 12) + (now.getMinutes() / 60);
  current_time = Math.round(current_time * 100) / 100; // rounding to 2 decimal places
  return current_time;
}

const selectedSlate = ref('')
const slateData = ref([])
const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

watch(() => props.selectedSlateGlobal, (newVal) => {
  selectedSlate.value = newVal
})

const selectedSlateChanged = (newSlate) => {
    selectedSlate.value = newSlate
    const newSite = newSlate.includes('FD') ? 'FD' : 'DK'
    localStorage.setItem('selectedSlate', newSlate)
    emits('selectedSiteChanged', newSite)
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
  console.log('override changed: ', slateToIdToOverride)
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

  console.log('override changed: ', slateToIdToOverride)
}

watch(() => props.availableSlates, (newVal) => {
  selectedSlate.value = localStorage.getItem('selectedSlate') || ''
  if(!selectedSlate.value){
    selectedSlate.value = props.availableSlates[0]
  } 
})

watch(()  => selectedSlate.value, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
})

watch(() => props.tableData, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
})
</script>

<template>
  <div class="projections-header">
    <SlatePicker
      @selectedSlateChanged="selectedSlateChanged"
      :availableSlates="availableSlates" 
      :selected="selectedSlate"
      />
    <button class="button reset-button" @click="resetProjections">
      <img :src="resetIcon" alt="reset projections" width="40">
    </button>
    <button class="button upload-button" @click="uploadProjections">
      <img :src="uploadIcon" alt="upload projections" width="40">
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
        <th>Override</th>
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
      <td><component :is="getLogo(playerRow.team)" /> </td>
      <td>{{ playerRow['projection'] }}</td>
      <td>
        <input class="override" type="number" v-model="playerRow['override']" 
          @change="() => overrideChanged(playerRow)"
        />
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
</style>