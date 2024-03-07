import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { l, dedupLineups, cloneRoster, getRandomInt, rand} from './optimizerUtil.js'

export function useOptimizerV2(rostersUpdatedCallback, maxPlayerExposure) {
  let rosterSet = []
  let exposedRosters = []

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

    const team = rowToSwap?.team ?? ''
    if(_lockedTeams.includes(team)) {
      return false
    }

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

    const toReturn = topRostersToReturn.map((roster) => ({
      players: roster[0],
      value: roster[1],
      cost: rosterCost(roster[0]),
      valueComputed: (players) => rosterValue(players),
    }))

    if (toReturn.length) {
      rostersUpdatedCallback(toReturn)

      exposedRosters = topRostersToReturn
    }
  }

  
  const tryToImproveRoster = (roster) => {
    const players = roster[0]

    if(_positionalScoreBoost && !_positionalCostBoost) {
      players.sort((a, b) => a.override < b.override ? 1 : -1)
    }

    var removeCount = 0
    for(var i = 0; i < 3; i += 1) {
      const idx = rand(0, players.length - 1)
      if(!_lockedTeams.includes(players[idx].team)) {
        players[idx] = {name: '', cost: 0, override: -1000}
        removeCount += 1
      }
    }
    
    if(removeCount > 1) {
      improveRosterGreedy(players)

      return playerListToRoster(players)
    }
    
    return null
  }

  const rosterEnsembleValue = (evaluationSet) => {
    if(evaluationSet.length === 0) {
      return null
    }

    const averageRosterValue = evaluationSet.reduce((partialSum, roster) => partialSum + parseFloat(roster[1]), 0) / _rosterCount
    
    const minRosterValue = evaluationSet.length ? Math.min(...evaluationSet.map(i => i[1])) : 0
    const playerCounts = {}
    const rosterKeys = new Set()
    for(let i = 0; i < evaluationSet.length; i += 1) {
      const roster = evaluationSet[i]
      const players = roster[0]
      rosterKeys.add(roster[2])
      players.forEach((player) => {
        if(_lockedTeams.includes(player.team)) {
          /// don't count anyone locked players
          return
        }

        const name = player.name
        if(!(name in playerCounts)) {
          playerCounts[name] = 1
        } else {
          playerCounts[name] += 1
        }
      })
    }
    
    const playersOverCriticalThreshold = []
    const criticalThreshold = parseFloat(maxPlayerExposure.value)
    Object.keys(playerCounts).forEach((playerName) => {
      const exposure = playerCounts[playerName] / _rosterCount
      if(exposure > criticalThreshold) {
        if(!(playersOverCriticalThreshold.includes(playerName))) {
          playersOverCriticalThreshold.push(playerName)
        }
      }
    })

    return {
      averageRosterValue,
      minRosterValue,
      rosterKeys,
      playersOverCriticalThreshold,
    }
  }

  const countPlayersOverCriticalThreshold = (roster, playersOverCriticalThreshold) => {
    return roster[0].reduce((acc, curr) => {
      const name = curr.name
      if(playersOverCriticalThreshold.includes(name)) {
        return acc + 1
      }

      return acc
    }, 0)
  }

  const areRostersLockTeamCompatible = (roster1, roster2) => {
    const set1 = roster1[0]
    const set2 = roster2[0]
    for(var i = 0; i < set1.length; i += 1) {
      const player1Locked = _lockedTeams.includes(set1[i].team)
      const player2Locked = _lockedTeams.includes(set2[i].team)
      if(player1Locked !== player2Locked) {
        return false
      }
    }

    return true
  }

  const considerSwap = (roster, initialEvaluation) => {
    const idx = getRandomInt(_rosterCount)
    let toRemove = exposedRosters[idx]

    if(_lockedTeams.length > 0) {
      const n = _rosterCount;
      const randomArray = [...Array(n)].map((_, i) => i).sort(() => Math.random() - 0.5);

      for(var i = 0; i < _rosterCount; i += 1) {
        const idx = randomArray[i]
        const toRemove = exposedRosters[idx]
        if(areRostersLockTeamCompatible(roster, toRemove)) {
          break 
        }
      }
    }

    if(_lockedTeams.length > 0 && !areRostersLockTeamCompatible(roster, toRemove)) {
      
      return initialEvaluation
    }
    
    const playersOverCriticalThreshold = initialEvaluation.playersOverCriticalThreshold
    const numberOfPlayersOverCriticalThresholdRemoved = countPlayersOverCriticalThreshold(toRemove, playersOverCriticalThreshold)
    const numberOfPlayersOverCriticalThresholdNew = countPlayersOverCriticalThreshold(roster, playersOverCriticalThreshold)
    const criticalThresholdPlayerDiff = numberOfPlayersOverCriticalThresholdNew - numberOfPlayersOverCriticalThresholdRemoved
    // ^ we want this to be a negative number
    if(criticalThresholdPlayerDiff > 0
      || criticalThresholdPlayerDiff === 0 && roster[1] < toRemove[1]
      || criticalThresholdPlayerDiff < -1
      ) {
      return initialEvaluation
    }

    /// consider if we violate a locked team consraint

    exposedRosters[idx] = roster
    const toReturn = rosterEnsembleValue(exposedRosters)
    if(toReturn.playersOverCriticalThreshold.length > initialEvaluation.playersOverCriticalThreshold.length) {
      /// the swap isn't vald roll it back
      exposedRosters[idx] = toRemove
      return initialEvaluation
    }

    return toReturn
  }

  const appendNewLineups = (newLineups, shouldSort = true) => {
    if(exposedRosters.length === 0) {
      exposedRosters = rosterSet.slice(0, _rosterCount)
    }

    let initialEnsembleValuation = rosterEnsembleValue(exposedRosters)

    if(initialEnsembleValuation && newLineups.length) {
      initialEnsembleValuation.rosterKeys.size && newLineups.forEach((roster) => {
        const val = roster[1]
        const key = roster[2]
        if(initialEnsembleValuation.rosterKeys.has(key)) {
          return
        }
        
        if(val > initialEnsembleValuation.minRosterValue || initialEnsembleValuation.playersOverCriticalThreshold.length > 0) {
          /// unique roster
          ///within range
          /// consider a swap
          /// if late swapping, check the validity of that late swap first
          initialEnsembleValuation = considerSwap(roster, initialEnsembleValuation)
        }
      })
    }

    if(shouldSort) {
      const allRosters = exposedRosters.sort((a, b) => a[0] < b[0] ? 1 : -1).sort((a, b) => a[1] < b[1] ? 1 : -1)
      // console.log("all rosters",allRosters.length)
      rosterSet = allRosters
    }

    rosterSet = exposedRosters
    ///check if we are violating the max player exposure constraint for each player
    // if so, find the best rosters without that player 

    updateLineupSet()
  }

  let _maxCost = -1
  let _positionsToFill = []
  let _byPosition = null
  let _lockedTeams = null
  let _byPositionPruned = null
  let _rosterCount = 0
  const generateRosters = (maxCost, positionsToFill) => {
    _maxCost = maxCost
    _positionsToFill = positionsToFill

    if(maxPlayerExposure.value !== '1' && exposedRosters.length) {
      let ensembleValuation = rosterEnsembleValue(exposedRosters)
      if(ensembleValuation.playersOverCriticalThreshold.length > 0) {
        const toExclude = ensembleValuation.playersOverCriticalThreshold[getRandomInt(ensembleValuation.playersOverCriticalThreshold.length)]
        _byPositionPruned = Object.keys(_byPositionPruned).reduce((acc, curr) => {
          acc[curr] = _byPositionPruned[curr].filter((player) => {
            return player.name !== toExclude
          })

          return acc
        }, {})
      }
    }

    const amassedRosters = []
    
    const sampleSet = exposedRosters.length > 0 ? exposedRosters : rosterSet

    for(var i = 0; i < 1000; i += 1) {
      const idx = i % sampleSet.length
      const toImprove = sampleSet[idx]
      const rosterCloned = cloneRoster(toImprove)

      const roster = tryToImproveRoster(rosterCloned)
      // const hasNullOrUndefined = roster[0].some(element => element === null || element === undefined);
      // if(hasNullOrUndefined) {
      //   debugger
      // }

      if(roster) {
        amassedRosters.push(roster)
      }
    }

    appendNewLineups(amassedRosters, _lockedTeams.length === 0)
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

  const startStopGeneratingRosters = (byPosition, startingRosters, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isRosterValid, maxCost, lockedTeams) => {
    _positionalScoreBoost = positionalScoreBoost
    _positionalCostBoost = positionalCostBoost
    _isRosterValid = isRosterValid
    _lockedTeams = lockedTeams
    _rosterCount = rosterCount
    _byPosition = byPosition

    const lockedTeamsRomoved = Object.keys(_byPosition).reduce((acc, key) => {
      const players = _byPosition[key]
      acc[key] = players.filter((row) => !_lockedTeams.includes(row.team))

      return acc
    }, {})

    _byPositionPruned = Object.keys(byPosition).reduce((acc, curr) => {
      const players = lockedTeamsRomoved[curr]
      const sortedByProjection = [...players].sort((a, b) => a.override < b.override ? 1 : -1).slice(0, 12)
      const sortedByValue = [...players].sort((a, b) => a.override / a.cost < b.override / b.cost ? 1 : -1).slice(0, 15)

      const combinedArray = Array.from(new Set([...sortedByProjection, ...sortedByValue]));

      acc[curr] = combinedArray

      return acc
    }, {})
    
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
      intervalId = setInterval(() => generateRosters(maxCost, positionsToFill), 1)
      isGeneratingRosters.value = true
    } else {
      isGeneratingRosters.value = false
    }

    ///Fill up our roster set with know rosters + random rosters
    /// generate new rosters and consider swaps into the roster set that increases the roster set value

  }

  return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}