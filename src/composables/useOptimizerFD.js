import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { playerListToRoster, l, dedupLineups, cloneRoster, getRandomInt, rand } from './optimizerUtil.js'

export function useOptimizerFD(activeRostersUpdatedCallback, maxPlayerExposure) {
  let topRosters = []

  const isGeneratingRosters = ref(false)

  const positionsToFill = ["PG", "PG", "SG", "SG", "SF", "SF", "PF", "PF", "C"]

  const improveRosterOneStep = (lineup) => {
    // pick a player at random
    // pick a random candidate that's a) more valuable, b) affordable
    const currentNames = lineup.filter((row) => row.name).map((row) => row.name)
    const totalCost = lineup.map((row) => row.cost).reduce((a, b) => a + b, 0)
    const costRemaining = 60000 - totalCost

    var idx;

    if(currentNames.length != 9) {
      idx = lineup.findIndex((row) => !row.name)
    } else {
      idx = getRandomInt(9)
    }

    const rowToSwap = lineup[idx]

    const team = rowToSwap?.team ?? ''
    if(lockedTeams.includes(team)) {
      return false
    }

    const positionsToSwap = positionsToFill[idx]
    const swapCandidates = byPositionFiltered[positionsToSwap].filter((row) => 
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

  const improveRosterGreedy = (roster) => {
    for(var i = 0; i < 20; i += 1) {
      if(improveRosterOneStep(roster)) {
        i = 0
      }
    }
  }

  const tryToImproveRoster = (players) => {
    var removeCount = 0
    for(var i = 0; i < 3; i += 1) {
      const idx = rand(0, players.length - 1)
      if(!lockedTeams.includes(players[idx].team)) {
        players[idx] = {name: '', cost: 0, override: -1000}
        removeCount += 1
      }
    }
    
    removeCount > 1 && improveRosterGreedy(players)
  }

  const isRosterValid = (players) => {
    const teamToCount = {}
    for (var i = 0; i < players.length; i += 1) {
      const player = players[i]
      const team = player.team
      if(!(team in teamToCount)) {
        teamToCount[team] = 1
      } else {
        teamToCount[team] += 1
        if (i > 4 && teamToCount[team] > 4) {
          return false
        }
      }
    }

    return true
  }

  const appendNewLineups2 = (newLineups, shouldSort = true) => {
    if(!topRosters.length) {
      topRosters = newLineups.filter((roster) => isRosterValid(roster[0]))
    }

    const currentRosterKeys = topRosters.map((roster) => l(roster, "key"))

    const topNFiltered_dups = newLineups.filter((roster) => !currentRosterKeys.includes(l(roster, "key")))

    const topNFiltered = dedupLineups(topNFiltered_dups)
              .filter((roster) => isRosterValid(roster[0]))

    topRosters = [...topRosters, ...topNFiltered]

    if(shouldSort) {
      const allRosters = topRosters.sort((a, b) => a[0] < b[0] ? 1 : -1).sort((a, b) => a[1] < b[1] ? 1 : -1)
      // console.log("all rosters",allRosters.length)
      topRosters = allRosters

      const takenRosters = []
      const playerCounts = {}
      const criticalThreshold = rosterCount * parseFloat(maxPlayerExposure.value)
      for(let i = 0; i < topRosters.length; i += 1) {
        const roster = topRosters[i]
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

        if(takenRosters.length === rosterCount) {
          break
        }
      }

      topRosters = takenRosters
    }

    /// go through each roster
    /// consume each roster if we're not over the limit
    /// if we're over the limit skip
  

    updateLineupSet()
  }

  const appendNewLineups = (newLineups, shouldSort = true) => {
    if(maxPlayerExposure.value !== '1') {
      appendNewLineups2(newLineups, shouldSort)
      return
    }

    if(!topRosters.length) {
      topRosters = newLineups.filter((roster) => isRosterValid(roster[0]))
    }

    const lowestTopLineupValue = topRosters.length ? l(topRosters[topRosters.length - 1], "value") : 0

    const topN = newLineups.filter((lineup) => l(lineup, "value") > lowestTopLineupValue)

    const currentRosterKeys = topRosters.map((roster) => l(roster, "key"))

    const topNFiltered_dups = topN.filter((roster) => !currentRosterKeys.includes(l(roster, "key")))

    const topNFiltered = dedupLineups(topNFiltered_dups)
              .filter((roster) => isRosterValid(roster[0]))

    topRosters = [...topRosters, ...topNFiltered]

    if(shouldSort) {
      const allRosters = topRosters.sort((a, b) => a[0] < b[0] ? 1 : -1).sort((a, b) => a[1] < b[1] ? 1 : -1)
      // console.log("all rosters",allRosters.length)
      topRosters = allRosters
    }

    ///check if we are violating the max player exposure constraint for each player
    // if so, find the best rosters without that player 

    updateLineupSet()
  }

  const updateLineupSet = () => {
    /// Recalculate the cost and projection associated with each roster in case our projections changed
    for (let index = 0; index < topRosters.length; index++) {
      const roster = topRosters[index];
      topRosters[index] = playerListToRoster(roster[0])
    }

    const topRostersToReturn = topRosters.slice(0, rosterCount)
    const averageRosterValue = topRostersToReturn.reduce((partialSum, roster) => partialSum + parseFloat(roster[1]), 0) / rosterCount
    
    const toReturn = topRostersToReturn.map((roster) => ({
      players: roster[0],
      value: roster[1],
      cost: roster[0].map((row) => row.cost).reduce((a, b) => a + b, 0),
    }))

    if (toReturn.length) {
      activeRostersUpdatedCallback(toReturn)
    }
  }


  var intervalId = undefined
  var byPositionFiltered = undefined
  var lockedTeams = undefined
  var rosterCount = 0
  
  const stopGeneratingRosters = () => {
    if(intervalId) {
      clearInterval(intervalId)
    }
    isGeneratingRosters.value = false
  }

  const startStopGeneratingRosters = (_byPosition, _lockedTeams, rosterSet, _rosterCount) => {
    topRosters = []
    
    ///don't try to append lineups with undefined players
    if(rosterSet.every((roster) => roster.players.filter((player) => !player).length === 0)) {
      appendNewLineups(rosterSet.map((roster) => playerListToRoster(roster.players)), !_lockedTeams.length)
    }


    rosterCount = _rosterCount
    byPositionFiltered = Object.keys(_byPosition).reduce((acc, key) => {
      const players = _byPosition[key]
      acc[key] = players.filter((row) => !_lockedTeams.includes(row.team))

      return acc
    }, {})
    

    lockedTeams = _lockedTeams
    
    if(intervalId) {
      clearInterval(intervalId)
    }

    if(!isGeneratingRosters.value) {
      if(lockedTeams.length === 0) {
        intervalId = setInterval(() => generateRosters(), 1)
        isGeneratingRosters.value = true
      } else {
        isGeneratingRosters.value = true
        setTimeout(() => {
          generateRosters()
          isGeneratingRosters.value = false
        }, 5)
      }
    } else {
      isGeneratingRosters.value = false
    }
  }

  const isRosterUnderCost = (roster) => {
    const totalCost = roster.map((row) => row.cost).reduce((a, b) => a + b, 0) 
    return totalCost <= 60000
  }

  const generateRandomRoster = () => {
    const takenNames = []
    const randomRoster = positionsToFill.map((pos) => {
      const rows = byPositionFiltered[pos]
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

    return isRosterUnderCost(randomRoster) ? randomRoster : undefined
  }

  const generateRosterBatch = (ct) => {
    if(Object.keys(byPositionFiltered).length === 0) {
      return
    }

    const rostersToReturn = []
    for(var j = 0; j < ct; j += 1) {
      const players = generateRandomRoster()

      if(!players) {
        continue
      }

      improveRosterGreedy(players)

      const asRoster = playerListToRoster(players)

      rostersToReturn.push(asRoster)
    }

    return rostersToReturn
  }

  const generateRosters = () => {
    if(topRosters.filter((row) => row[1]).length) {
      lockedTeams.length === 0 
        ? optimizeRosters()
        : reoptimizeRosters()
      return
    }

    const lineupBatch = generateRosterBatch(1000)
    // const lineupBatch = generateRosterBatch(10)
    if(!lineupBatch) {
      return
    }

    appendNewLineups(lineupBatch)
  }

  const optimizeRosters = async (selectedSlate) => {
    const amassedRosters = []
      for(var i = 0; i < 1000; i += 1) {
        const idx = i % topRosters.length
        const toImprove = topRosters[idx]
        const rosterCloned = cloneRoster(toImprove)[0]

        tryToImproveRoster(rosterCloned)

        const roster = playerListToRoster(rosterCloned)
        amassedRosters.push(roster)
      }

      appendNewLineups(amassedRosters)
  }
  
  const reoptimizeRosters = () => {
    //produce all roster keys
    const allRosterKeys = topRosters.map((row) => row[2])
    /// 1000 * 10 rosters = 10000
    /// x * 100 = 10
    const outerLoopCount = (50000 / topRosters.length) + 1
    console.log("Reoptimize outer loop count: ", outerLoopCount)

    for(var j = 0; j < outerLoopCount; j += 1) {
      for(var i = 0; i < topRosters.length; i += 1) {
        const toImprove = topRosters[i]
        const rosterCloned = cloneRoster(toImprove)[0]

        tryToImproveRoster(rosterCloned)

        const roster = playerListToRoster(rosterCloned)

        /// check if we collide with a known roster key
        if(isRosterValid(roster[0]) && roster[1] > toImprove[1]) {
          ///this rosterkey is not found in existing roster keys
          const newRosterKey = roster[2]
          const newRosterValue = roster[1]
          const oldRosterValue = toImprove[1]
          const valueDifference = newRosterValue - oldRosterValue
          if(!allRosterKeys.includes(newRosterKey) || valueDifference > 5) {
            const oldRosterKey = toImprove[2]

            topRosters[i] = roster
            // remove the old roster key
            // add the new roster key
            const indexToRemove = allRosterKeys.indexOf(oldRosterKey)
            allRosterKeys.splice(indexToRemove, 1)
            allRosterKeys.push(newRosterKey)
          }
        }
      }
    }
    updateLineupSet()
  }


  return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}