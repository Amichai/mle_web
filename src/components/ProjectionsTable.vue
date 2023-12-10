<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'

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

onMounted(() => {
  selectedSlate.value = props.availableSlates[0]
})

watch(() => props.availableSlates, (newVal) => {
  selectedSlate.value = newVal[0]
})

watch(()  => selectedSlate.value, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
  console.log('slate data: ', slateData.value)
})

watch(() => props.tableData, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
})
</script>

<template>
  <div class="slate-selector">
    <img :src="dklogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('DK')">
    <img :src="fdlogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('FD')">

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
      <tr v-for="(playerRow, index) in slateData" :key="index">
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