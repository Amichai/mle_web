<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import TableComponent from '../components/TableComponent.vue';
  
const props = defineProps({
  rosters: {
    type: Array,
    required: true
  }
})

const exposures = ref({})
const namesSortedByExposure = computed(() => {
  return Object.keys(exposures.value).sort((a, b) => {
    return exposures.value[b].count - exposures.value[a].count
  })
})

const tableRows = computed(() => {
  return namesSortedByExposure.value.map((name) => {
    return [
      name,
      `${exposures.value[name].count} / ${props.rosters.length}`,
      exposures.value[name].team,
      exposures.value[name].startTime,
      exposures.value[name].projection,
    ]
  })
})

watch(() => props.rosters, (newVal) => {
  exposures.value = newVal.reduce((acc, roster) => {
    roster.players.forEach((player) => {
      const name = player.name
      if(!acc[name]) {
        acc[name] = {
          name: name,
          projection: player.projection,
          team: player.team,
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
</script>

<template>
  <TableComponent 
    :columns="[ 'Name', 'Exposure', 'Team', 'Start Time', 'Projection' ]"
    :rows="tableRows"
  ></TableComponent>
</template>

<style>
</style>