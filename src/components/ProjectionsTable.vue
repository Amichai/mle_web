<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import SlatePicker from '../components/SlatePicker.vue';
import resetIcon from '@/assets/reset.png'
import uploadIcon from '@/assets/upload.png'

const emits = defineEmits([])

const props = defineProps({
  availableSlates: {
    type: Array,
    required: true
  },
  tableData: {
    type: Object,
    required: true
  },
})

const selectedSlate = ref('')
const slateData = ref([])
const slateToIdToOverride = localStorage.getItem('slateToIdToOverride') ? JSON.parse(localStorage.getItem('slateToIdToOverride')) : {}

const isNumeric = (value) => {
  return value.trim() !== "" && !isNaN(+value);
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
    playerIdToOverride[playerId] = override
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

onMounted(() => {
  selectedSlate.value = props.availableSlates[0]
})

watch(() => props.availableSlates, (newVal) => {
  selectedSlate.value = newVal[0]
})

watch(()  => selectedSlate.value, (newVal) => {
  console.log('selected slate changed: ', newVal)
  slateData.value = props.tableData[selectedSlate.value]
})

watch(() => props.tableData, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
})
</script>

<template>
  <div class="projections-header">
    <SlatePicker
      @selectedSlateChanged="selectedSlate = $event"
      :availableSlates="availableSlates" />
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
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(playerRow, index) in slateData" :key="index"
        :class="playerRow['projection'] != playerRow['override'] ? 'override-row' : ''"
      >
      <td><b>{{ index + 1 }}</b></td>
      <td>{{ playerRow['name'] }}</td>
      <td>{{ playerRow['position'] }}</td>
      <td>{{ playerRow['salary'] }}</td>
      <td>{{ playerRow['team'] }}</td>
      <td>{{ playerRow['projection'] }}</td>
      <td>
        <input class="override" type="text" v-model="playerRow['override']" 
          @change="() => overrideChanged(playerRow)"
        />
      </td>
      <td>{{ playerRow['status'] }}</td>
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

</style>