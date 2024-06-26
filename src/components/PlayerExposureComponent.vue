<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useLogoProvider } from '../composables/useLogoProvider.js'
import { convertTimeStringToDecimal, getCurrentTimeDecimal } from '../utils.js'
  
const props = defineProps({
  rosters: {
    type: Array,
    required: true
  }
})

const { getLogo } = useLogoProvider()

const columns = ref([ 'Name', 'Salary', 'Positon', 'Exposure', 'Team', 'Start Time', 'Projection', 'Value'])

const exposures = ref({})
const namesSortedByExposure = computed(() => {
  return Object.keys(exposures.value).sort((a, b) => {
    return exposures.value[b].count - exposures.value[a].count
  })
})

const tableRows = computed(() => {
  const toReturn = namesSortedByExposure.value.map((name) => {
    const percentage = exposures.value[name].count / props.rosters.length
    return { ...exposures.value[name], exposure: `${exposures.value[name].count}/${props.rosters.length} (${(percentage * 100).toFixed(2)}%)`
  }})

  return toReturn
})

watch(() => props.rosters, (newVal) => {
  exposures.value = newVal.reduce((acc, roster) => {
    roster.players.forEach((player) => {
      const name = player?.name
      if(!name) {
        return
      }
      if(!acc[name]) {
        acc[name] = {
          name: name,
          projection: player.projection,
          value: (player.override / player.salary * 100).toFixed(2),
          override: player.override,
          position: player.position,
          team: player.team,
          cost: `$${player.salary}`,
          startTime: player.startTime,
          count: 0
        }
      }
      acc[name].count += 1
    })
    return acc
  }, {})
})

const emits = defineEmits([])
const currentTime = ref(null)

onMounted(() => {
  currentTime.value = getCurrentTimeDecimal()
})

const isPlayerLocked = (startTime) => {
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  const toReturn = decimalStartTime < currentTime.value
  return toReturn
}
</script>

<template>
  <table>
    <thead>
      <tr>
        <th></th>
        <th v-for="(column, index) in columns" :key="index" v-show="column">{{ column }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in tableRows" :key="index"  :class="[row['override'] !== row['projection'] && 'overriden']">
        <td><b>{{ index + 1 }}</b></td>
        <td :class="[isPlayerLocked(row?.startTime) && 'player-locked']">{{ row['name'] }}</td>
        <td>{{ row['cost'] }}</td>
        <td>{{ row['position'] }}</td>
        <td>{{ row['exposure'] }}</td>
        <td><component :is="getLogo(row.team)" /> </td>
        <td :class="[isPlayerLocked(row?.startTime) && 'player-locked']">{{ row['startTime'] }}</td>
        <td>{{ row['override'] }}</td>
        <td>{{ row.value }}</td>
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
  overflow-x: auto;
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

table tr.overriden:nth-child(odd)
{
  background-color: #E9E983 !important;
}

table tr.overriden:nth-child(even)
{
  background-color: #FFFF33 !important;
}

.player-locked {
  color: darkred;
}
</style>