<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useOptimizerV2 } from '../composables/useOptimizerV2.js'
  
const props = defineProps({
})

const emits = defineEmits([])

const firstAverageRosterValue = ref(null)
const currentAverageRosterValue = ref(null)

const rostersUpdatedCallback = (rosters) => {
  console.log("Rosters updated", rosters)
  const averageRosterValue = rosters.reduce((acc, curr) => {
    return acc + curr.value
  }, 0) / rosters.length
  console.log("Average Roster Value", averageRosterValue)
  if(!firstAverageRosterValue.value) {
    firstAverageRosterValue.value = averageRosterValue
  }
  currentAverageRosterValue.value = averageRosterValue
}

const maxPlayerExposure = ref('')

const { startStopGeneratingRosters: startStopV2, isGeneratingRosters: isGeneratingV2, stopGeneratingRosters: stopV2 } = useOptimizerV2(rostersUpdatedCallback, maxPlayerExposure)

onMounted(() => {
  console.log("Mounted")
})

const positions = ['PG', 'SG', 'SF', 'PF', 'C']
const teams = ['LAL', 'LAC', 'GSW', 'BOS', 'MIA', 'NYK', 'BKN', 'PHI']
const positionsToFill = ["PG", "PG", "SG", "SG", "SF", "SF", "PF", "PF", "C"]

const generateByPosition = (ct) => {
  //array of player objects
  const byPosition = {}
  for(let i = 0; i < ct; i++) {
    const pos = positions[i % positions.length]
    if(!byPosition[pos]) {
      byPosition[pos] = []
    }
    byPosition[pos].push({
      name: `Player ${i}`,
      override: Math.random() * 100,
      cost: Math.floor(Math.random() * 10000),
      position: pos,
      team: teams[i % teams.length],
      startTime: '7:00 PM'
    })
  }
  
  return byPosition
}

const testResult = ref('')

const isRosterUnderCost = (players, maxCost, _positionalCostBoost = null) => {
    const totalCost = players.reduce((acc, curr, index) => {
      if(!_positionalCostBoost) {
        return acc + curr.cost
      }

      const boost = _positionalCostBoost[index] || 1
      return acc + curr.cost * boost
    }, 0)
    return totalCost <= maxCost
  }

const optimizerTests = [{
  name: "5 Second Random FD Test",
  description: "",
  action: () => {
    const byPosition = generateByPosition(100)
    const rosterCount = 10
    const rosters = []
    const maxCost = 60000
    
    startStopV2(byPosition, rosters, rosterCount, positionsToFill, null, null, (players) => isRosterUnderCost(players, maxCost), maxCost)

    setTimeout(() => {
      stopV2()
      console.log("TEST STOPPED!")
      runningTestIdx.value = null
      testResult.value = ""

      const averageRosterValueDiff = currentAverageRosterValue.value - firstAverageRosterValue.value
      firstAverageRosterValue.value = null
      console.log("Average Roster Value Diff", averageRosterValueDiff)
    }, 3000)
  }
}, {
  name: "Test 2",
  description: "Test 2 description",
  action: () => {
    // stopV2()
  }
}]

const runningTestIdx = ref(null)

const runTest = (test, idx) => {
  console.log(test.name)
  test.action()
  runningTestIdx.value = idx
}

</script>

<template>
  <div>
    Optimizer Tests
    <div v-for="test, idx in optimizerTests" :key="idx" @click="() => runTest(test, idx)" :class="[idx === runningTestIdx && 'running']">
      {{ test.name }}
      {{ testResult }}
    </div>
  </div>
</template>

<style scoped>
div {
  color: black;
}

.running {
  background-color: lightgreen;
}
</style>