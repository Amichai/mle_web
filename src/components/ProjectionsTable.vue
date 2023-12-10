<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import SlatePicker from '../components/SlatePicker.vue';

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
  console.log('selected slate changed: ', newVal)
  console.log('slate data: ', slateData.value)
})

watch(() => props.tableData, (newVal) => {
  slateData.value = props.tableData[selectedSlate.value]
})
</script>

<template>
  <SlatePicker 
  @selectedSlateChanged="selectedSlate = $event"
  :availableSlates="availableSlates" />
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
      <td><b>{{ index + 1 }}</b></td>
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
</style>