<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { nameMapper } from './../nameMapper.js'
import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'

const emits = defineEmits([])

const props = defineProps({
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

const availableSlates = ref([])
const selectedSlate = ref('')
const tableData = ref([])
const nameToPlayerData = ref({})

onMounted(() => {
  availableSlates.value = props.slateData.map((row) => row[0])
})


watch(() => props.slateData, (newVal) => {
  availableSlates.value = newVal.map((row) => row[0])
  selectedSlate.value = availableSlates.value[0]
})


const loadTableData = (slate) => {
  if(!nameToPlayerData.value) {
    return
  }

  const slatePlayerData = props.slatePlayerData.filter((row) => row[0] === selectedSlate.value)
  console.log('slatePlayerData: ', slatePlayerData)
  tableData.value = slatePlayerData.map((row) => {

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
}

watch(()  => selectedSlate.value, (newVal) => {
  loadTableData(newVal)
})

watch(() => props.slatePlayerData, (newVal) => {
  loadTableData(selectedSlate.value)
})

watch(() => props.playerData, (newVal) => {
  for(const row of newVal) {
    nameToPlayerData.value[row[0]] = row
  }

  loadTableData(selectedSlate.value)
})
</script>

<template>
  <div class="slate-selector">
    <img :src="dklogo" alt="dk logo" height="20" v-show="selectedSlate.includes('DK')">
    <img :src="fdlogo" alt="dk logo" height="20" v-show="selectedSlate.includes('FD')">

    <select v-model="selectedSlate" placeholder="slate">
      <option v-for="(slate, index) in availableSlates" :key="index" :value="slate">
        {{ slate }}
      </option>
    </select>
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
      <tr v-for="(playerRow, index) in tableData" :key="index">
      <td>{{ index + 1 }}</td>
      <td>{{ playerRow['name'] }}</td>
      <td>{{ playerRow['position'] }}</td>
      <td>{{ playerRow['salary'] }}</td>
      <td>{{ playerRow['team'] }}</td>
      <td>{{ playerRow['projection'] }}</td>
      <td>
        <input class="override" type="text" v-model="playerRow['override']"/>
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

select {
  width: 200px; /* Width of the combobox */
  padding: 10px; /* Padding inside the combobox */
  margin: 10px; /* Margin around the combobox */
  border: 1px solid #ccc; /* Border color and width */
  border-radius: 4px; /* Rounded corners */
  background-color: white; /* Background color */
  font-family: Arial, sans-serif; /* Font styling */
}

/* Optional: Styling the options */
option {
  padding: 5px; /* Padding inside each option */
  font-family: Arial, sans-serif; /* Font styling */
}

.override {
  width: 4rem;
}

.slate-selector {
  display: flex;
  direction: row;
  align-items: center;
  margin-left: 1rem;
}
</style>