import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { l, dedupLineups, cloneRoster, getRandomInt, rand} from './optimizerUtil.js'

export function useOptimizerV3(rostersUpdatedCallback, maxPlayerExposure) {
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

  const rosterValue = (players) => {
    return players.reduce((acc, curr, index) => {
      if(!_positionalScoreBoost) {
        return acc + curr.override
      }

      const boost = _positionalScoreBoost[index] || 1
      return acc + curr.override * boost
    }, 0)
  }
  
  const rosterCost = (players) => {
    return players.reduce((acc, curr, index) => {
      if(!_positionalCostBoost) {
        return acc + curr.cost
      }

      const boost = _positionalCostBoost[index] || 1
      return acc + curr.cost * boost
    }, 0)
  }

  const playerListToRoster = (players) => {
    const totalValue = rosterValue(players)
    
    let lineupKey = players.map((row) => row.name).sort().join('|')


    if(_positionalScoreBoost && _positionalScoreBoost.length > 0) {
      lineupKey += `+${players.map((row) => row.name).slice(0, _positionalScoreBoost.length).join('|')}`
    }

    return [players, totalValue, lineupKey]
  }

  const improveRosterOneStep = (lineup) => {
    // pick a player at random
    // pick a random candidate that's a) more valuable, b) affordable
    const currentNames = lineup.filter((row) => row.name).map((row) => row.name)
    const totalCost = rosterCost(lineup)
    const costRemaining = _maxCost - totalCost

    var idx;

    const rosterSize = lineup.length

    if(currentNames.length != rosterSize) {
      idx = lineup.findIndex((row) => !row.name)
    } else {
      idx = getRandomInt(rosterSize)
    }

    const rowToSwap = lineup[idx]

    const positionsToSwap = _positionsToFill[idx]
    const swapCandidates = _byPositionPruned[positionsToSwap].filter((row) => 
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


  const improveRosterGreedy = (players) => {
    for(var i = 0; i < 20; i += 1) {
      if(improveRosterOneStep(players)) {
        i = 0
      }
    }
  }

  const updateLineupSet = () => {
    const topRostersToReturn = rosterSet.slice(0, _rosterCount)
    const averageRosterValue = topRostersToReturn.reduce((partialSum, roster) => partialSum + parseFloat(roster[1]), 0) / _rosterCount
    

    const toReturn2 = topRostersToReturn.map((roster) => ({
      players: roster[0],
      value: roster[1],
      cost: rosterCost(roster[0]),
      valueComputed: (players) => rosterValue(players),
    }))

    if (toReturn2.length) {
      rostersUpdatedCallback(toReturn2)
    }
  }

  
  const tryToImproveRoster = (roster, lockedTeams) => {
    const players = roster[0]

    if(_positionalScoreBoost && !_positionalCostBoost) {
      players.sort((a, b) => a.override < b.override ? 1 : -1)
    }

    var removeCount = 0
    for(var i = 0; i < 3; i += 1) {
      const idx = rand(0, players.length - 1)
      if(!lockedTeams.includes(players[idx].team)) {
        players[idx] = {name: '', cost: 0, override: -1000}
        removeCount += 1
      }
    }
    
    if(removeCount > 1) {
      improveRosterGreedy(players)

      return playerListToRoster(players)
    }
    
    return roster
  }

  const appendNewLineups2 = (newLineups, shouldSort) => {
    const currentRosterKeys = rosterSet.map((roster) => l(roster, "key"))

    const topNFiltered_dups = newLineups.filter((roster) => !currentRosterKeys.includes(l(roster, "key")))

    const topNFiltered = dedupLineups(topNFiltered_dups)
              .filter((roster) => _isRosterValid(roster[0]))

    rosterSet = [...rosterSet, ...topNFiltered]
    if(shouldSort) {
      const allRosters = rosterSet.sort((a, b) => a[0] < b[0] ? 1 : -1).sort((a, b) => a[1] < b[1] ? 1 : -1)
      // console.log("all rosters",allRosters.length)
      rosterSet = allRosters

      const takenRosters = []
      const playerCounts = {}
      const criticalThreshold = _rosterCount * parseFloat(maxPlayerExposure.value)
      for(let i = 0; i < rosterSet.length; i += 1) {
        const roster = rosterSet[i]
        const players = roster[0]
        let isAcceptable = true
        players.forEach((player) => {
          const name = player.name
          if(!(name in playerCounts)) {
            playerCounts[name] = 1
          } else {
            playerCounts[name] += 1
          }

          if(playerCounts[name] > criticalThreshold) {
            isAcceptable = false
          }
        })

        if(isAcceptable) {
          takenRosters.push(roster)
        } else {
          players.forEach((player) => {
            const name = player.name
            playerCounts[name] -= 1
          })
        }

        if(takenRosters.length === _rosterCount) {
          break
        }
      }

      rosterSet = takenRosters
    }
    updateLineupSet()
  }


  const rosterEnsembleValue = () => {
    const averageRosterValue = rosterSet.reduce((partialSum, roster) => partialSum + parseFloat(roster[1]), 0) / _rosterCount
    const playerCounts = {}
    for(let i = 0; i < rosterSet.length; i += 1) {
      const roster = rosterSet[i]
      const players = roster[0]
      players.forEach((player) => {
        const name = player.name
        if(!(name in playerCounts)) {
          playerCounts[name] = 1
        } else {
          playerCounts[name] += 1
        }
      })
    }
    const criticalThreshold = parseFloat(maxPlayerExposure.value)
    const exposurePenalty = Object.keys(playerCounts).reduce((acc, curr) => {
      const exposure = playerCounts[curr] / _rosterCount
      if(exposure > criticalThreshold) {
        return acc + (exposure - criticalThreshold)
      }

      return acc
    }, 0)

    console.log("exposure penalty: ", exposurePenalty.toFixed(2))
    return averageRosterValue - exposurePenalty * 10
  }

  const appendNewLineups = (newLineups, shouldSort = true) => {
    if(maxPlayerExposure.value !== '1') {
      appendNewLineups2(newLineups, shouldSort)
      return
    }

    // rosterEnsembleValue()

    if(!rosterSet.length) {
      rosterSet = newLineups.filter((roster) => _isRosterValid(roster[0]))
    }

    const lowestTopLineupValue = rosterSet.length ? l(rosterSet[rosterSet.length - 1], "value") : 0

    const topN = newLineups.filter((lineup) => l(lineup, "value") > lowestTopLineupValue)

    const currentRosterKeys = rosterSet.map((roster) => l(roster, "key"))

    const topNFiltered_dups = topN.filter((roster) => !currentRosterKeys.includes(l(roster, "key")))

    const topNFiltered = dedupLineups(topNFiltered_dups)
              .filter((roster) => _isRosterValid(roster[0]))

    rosterSet = [...rosterSet, ...topNFiltered]

    if(shouldSort) {
      const allRosters = rosterSet.sort((a, b) => a[0] < b[0] ? 1 : -1).sort((a, b) => a[1] < b[1] ? 1 : -1)
      // console.log("all rosters",allRosters.length)
      rosterSet = allRosters
    }

    ///check if we are violating the max player exposure constraint for each player
    // if so, find the best rosters without that player 

    updateLineupSet()
  }

  let _maxCost = -1
  let _positionsToFill = []
  let _byPosition = null
  let _byPositionPruned = null
  let _rosterCount = 0
  const generateRosters = (maxCost, positionsToFill, byPosition, rosterCount) => {
    _maxCost = maxCost
    _positionsToFill = positionsToFill
    _byPosition = byPosition
    _byPositionPruned = Object.keys(byPosition).reduce((acc, curr) => {
      const players = byPosition[curr]
      const sortedByProjection = [...players].sort((a, b) => a.override < b.override ? 1 : -1).slice(0, 12)
      const sortedByValue = [...players].sort((a, b) => a.override / a.cost < b.override / b.cost ? 1 : -1).slice(0, 15)

      const combinedArray = Array.from(new Set([...sortedByProjection, ...sortedByValue]));

      acc[curr] = combinedArray

      return acc
    }, {})
    _rosterCount = rosterCount

    const amassedRosters = []

    for(var i = 0; i < 1000; i += 1) {
      const idx = i % rosterSet.length
      const toImprove = rosterSet[idx]
      const rosterCloned = cloneRoster(toImprove)

      const roster = tryToImproveRoster(rosterCloned, [])
      // const hasNullOrUndefined = roster[0].some(element => element === null || element === undefined);
      // if(hasNullOrUndefined) {
      //   debugger
      // }

      amassedRosters.push(roster)
    }

    appendNewLineups(amassedRosters)
  }

  let intervalId = null
  let _positionalScoreBoost = null
  let _positionalCostBoost = null
  const isGeneratingRosters = ref(false)
  let _isRosterValid = null

  const stopGeneratingRosters = () => {
    if(intervalId) {
      clearInterval(intervalId)
    }
    isGeneratingRosters.value = false
  }

  const hasNullOrUndefined = (arr) => {
    return arr.some(element => element === null || element === undefined);
  }

  const startStopGeneratingRosters = (byPosition, startingRosters, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isRosterValid, maxCost) => {
    _positionalScoreBoost = positionalScoreBoost
    _positionalCostBoost = positionalCostBoost
    _isRosterValid = isRosterValid
    const startingRostersFiltered = startingRosters.filter(i => !hasNullOrUndefined(i.players))

    const toGenerate = rosterCount - startingRostersFiltered.length
    if(toGenerate < 0) {
      console.error("too many rosters found")
      debugger
      startingRosters = startingRostersFiltered.slice(0, rosterCount)
    }

    const toAdd = []
    let count = 0
    while(toAdd.length < toGenerate) {
      const randomRoster = generateRandomRoster(positionsToFill, byPosition, isRosterValid)
      if(randomRoster) {
        toAdd.push(randomRoster)
      }

      if(count > toGenerate * 10) {
        console.error("too many iterations. Failed to generate valid intial rosters")
        throw new Error("too many iterations. Failed to generate valid intial rosters")
      }
    }

    rosterSet = [...startingRostersFiltered.map(i => i.players), ...toAdd].map((roster) => playerListToRoster(roster))

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

  return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}