import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { playerListToRoster, l, dedupLineups, cloneRoster, getRandomInt, rand } from './optimizerUtil.js'

export function useOptimizerV2(rostersUpdatedCallback, maxExposurePercentage) {
  let rosterSet = []

  const generateRandomRoster = (positionsToFill, byPosition, isRosterValid) => {
    const takenNames = []
    const randomRoster = positionsToFill.map((pos) => {
    const rows = byPosition[pos]
    for(var i = 0; i < 30; i += 1) {
      const takeIdx = getRandomInt(rows.length)
      const candidateRow = rows[takeIdx]
      const name = candidateRow.name
      if(takenNames.includes(name)) {
        continue
      }

      takenNames.push(name)
      return candidateRow
    }
    })

    return isRosterValid(randomRoster) ? randomRoster : null
  }

  const improveRosterOneStep = (lineup, maxCost, positionsToFill, byPosition) => {
    // pick a player at random
    // pick a random candidate that's a) more valuable, b) affordable
    const currentNames = lineup.filter((row) => row.name).map((row) => row.name)
    const totalCost = lineup.map((row) => row.cost).reduce((a, b) => a + b, 0)
    const costRemaining = maxCost - totalCost

    var idx;

    const rosterSize = lineup.length

    if(currentNames.length != rosterSize) {
      idx = lineup.findIndex((row) => !row.name)
    } else {
      idx = getRandomInt(rosterSize)
    }

    const rowToSwap = lineup[idx]

    const positionsToSwap = positionsToFill[idx]
    const swapCandidates = byPosition[positionsToSwap].filter((row) => 
        !currentNames.includes(row.name) 
        && row.override > rowToSwap.override
        && row.cost <= costRemaining + rowToSwap.cost)

    if(swapCandidates.length === 0) {
      return false
    }

    const newSwapRowIdx = getRandomInt(swapCandidates.length)

    const newSwapRow = swapCandidates[newSwapRowIdx]
    lineup[idx] = newSwapRow

    return true
  }


  const improveRosterGreedy = (roster, maxCost, positionsToFill, byPosition) => {
    for(var i = 0; i < 20; i += 1) {
      if(improveRosterOneStep(roster, maxCost, positionsToFill, byPosition)) {
        i = 0
      }
    }
  }

  const rosterValue = (roster) => {
    return roster.reduce((acc, curr, index) => {
      const boost = _positionalScoreBoost[index] || 1
      return acc + curr.override * boost
    }, 0)
  }

  const evaluateRosterSet = () => {
    let sum = 0
    rosterSet.forEach((roster) => {
      sum += rosterValue(roster)
    })

    /// roster set eval is the sum of all roster values
    // with a roster duplication penalty
    /// and a penalty for being over-exposed to a particular player
    return sum
  }

  const updateLineupSet = (rosterCount) => {
    /// Recalculate the cost and projection associated with each roster in case our projections changed
    const toReturn = []
    for (let index = 0; index < rosterSet.length; index++) {
      const roster = rosterSet[index];
      toReturn.push(playerListToRoster(roster))
    }

    const topRostersToReturn = toReturn.slice(0, rosterCount)
    const averageRosterValue = topRostersToReturn.reduce((partialSum, roster) => partialSum + parseFloat(roster[1]), 0) / rosterCount
    

    console.log("Average roster value: ", averageRosterValue.toFixed(2))

    const toReturn2 = topRostersToReturn.map((roster) => ({
      players: roster[0],
      value: roster[1],
      cost: roster[0].map((row) => row.cost).reduce((a, b) => a + b, 0),
    }))

    if (toReturn2.length) {
      rostersUpdatedCallback(toReturn2)
    }
  }

  const generateRosters = (maxCost, positionsToFill, byPosition, rosterCount) => {
    const rosterSetValue = evaluateRosterSet()
    console.log("rosterSetValue", rosterSetValue)

    rosterSet.forEach((roster) => {
      improveRosterGreedy(roster, maxCost, positionsToFill, byPosition)
    })

    const rosterSetValue2 = evaluateRosterSet()
    console.log("rosterSetValue", rosterSetValue2)

    updateLineupSet(rosterCount)
    /// evaluate roster set
    /// create new rosters (under constraints)
    /// consider swapping in the new roster
  }

  let intervalId = null
  let _positionalScoreBoost = null
  const isGeneratingRosters = ref(false)

  const startStopGeneratingRosters = (byPosition, startingRosters, rosterCount, positionsToFill, positionalScoreBoost, isRosterValid, maxCost) => {
    _positionalScoreBoost = positionalScoreBoost

    const toGenerate = rosterCount - startingRosters.length
    if(toGenerate < 0) {
      console.error("too many rosters found")
      debugger
      startingRosters = startingRosters.slice(0, rosterCount)
    }

    const toAdd = []
    let count = 0
    while(toAdd.length < toGenerate) {
      const randomRoster = generateRandomRoster(positionsToFill, byPosition, isRosterValid)
      if(randomRoster) {
        toAdd.push(randomRoster)
      }

      if(count > toGenerate * 10) {
        console.error("too many iterations")
        throw new Error("too many iterations")
      }
    }

    rosterSet = [...startingRosters.map(i => i.players), ...toAdd]

    if(intervalId) {
      clearInterval(intervalId)
    }

    if(!isGeneratingRosters.value) {
      intervalId = setInterval(() => generateRosters(maxCost, positionsToFill, byPosition, rosterCount), 1)
      isGeneratingRosters.value = true
    } else {
      isGeneratingRosters.value = false
    }

    ///Fill up our roster set with know rosters + random rosters
    /// generate new rosters and consider swaps into the roster set that increases the roster set value

  }

  return { startStopGeneratingRosters }
}