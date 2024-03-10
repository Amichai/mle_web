import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useOptimizerV2 } from './useOptimizerV2.js'
import { useOptimizerV3 } from './useOptimizerV3.js'
import { useOptimizerFD } from '../composables/useOptimizerFD.js'
import { useOptimizerDK } from '../composables/useOptimizerDK.js'

export function useOptimizer(rostersUpdatedCallback, maxExposurePercentage) {
  const { startStopGeneratingRosters: startStopFD, isGeneratingRosters: isGeneratingFD, stopGeneratingRosters: stopFD } = useOptimizerFD(rostersUpdatedCallback, maxExposurePercentage)
  const { startStopGeneratingRosters: startStopDK, isGeneratingRosters: isGeneratingDK, stopGeneratingRosters: stopDK } = useOptimizerDK(rostersUpdatedCallback, maxExposurePercentage)
  const { startStopGeneratingRosters: startStopV2, isGeneratingRosters: isGeneratingV2, stopGeneratingRosters: stopV2 } = useOptimizerV2(rostersUpdatedCallback, maxExposurePercentage)
  const { startStopGeneratingRosters: startStopV3, isGeneratingRosters: isGeneratingV3, stopGeneratingRosters: stopV3 } = useOptimizerV3(rostersUpdatedCallback, maxExposurePercentage)

  const stopGeneratingRosters = () => {
    stopFD()
    stopDK()
    stopV2()
    stopV3()
  }

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

  const doesRosterContainTwoTeams = (roster) => {
    const seenTeams = []
    roster.forEach((row) => {
      if(!seenTeams.includes(row.team)) {
        seenTeams.push(row.team)
      }
    })

    if(seenTeams.length === 1) {
      return false
    }
    
    return true
  }

  const isSingleGameRosterValidDK = (roster, positionalCostBoost) => {
    const isUnderCost = isRosterUnderCost(roster, 50000, positionalCostBoost)
    if(!isUnderCost) {
      return false
    }

    return doesRosterContainTwoTeams(roster)
  }

  const isSingleGameRosterValidFD = (roster) => {
    const isUnderCost = isRosterUnderCost(roster, 60000)
    if(!isUnderCost) {
      return false
    }

    return doesRosterContainTwoTeams(roster)
  }

  const isClassicRosterValidFD = (players) => {
    const isUnderCost = isRosterUnderCost(players, 60000)
    if(!isUnderCost) {
      return false
    }

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

  const isClassicRosterValidDK = (players) => {
    const isUnderCost = isRosterUnderCost(players, 50000)
    if(!isUnderCost) {
      return false
    }

    const seenKeys = []
    players.forEach((player) => {
      const team = player.team
      const opp = player.opp
      const key1 = `${team}|${opp}`
      const key2 = `${opp}|${team}`
      if(!seenKeys.includes(key1)) {
        seenKeys.push(key1)
        seenKeys.push(key2)
      }
    })

    return seenKeys.length > 2
  }

  const startStopGeneratingRosters = (slateData, lockedTeams, rosterSet, rosterCount, site, contestParams) => {
    const { type, positionsToFill, positionalScoreBoost, positionalCostBoost } = contestParams.value

    if (site === 'fd') {
      const byPosition = slateData.reduce((acc, curr) => {
        const positions = curr.position.split('/')
        positions.forEach((position) => {
          if (acc[position] === undefined) {
            acc[position] = []
          }
    
          curr.cost = parseInt(curr.salary)
          acc[position].push(curr)
        })
        
        return acc
      }, {})

      const maxCost = 60000 
      if(type === 'FD Single Game') {
        // startStopV2(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isSingleGameRosterValidFD, maxCost, lockedTeams)
        startStopV3(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isSingleGameRosterValidFD, maxCost, lockedTeams)
      }
      if(type === 'FD Classic') {
        startStopV2(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isClassicRosterValidFD, maxCost, lockedTeams)
      }
    } else if (site === 'dk') {
      const dkPositionsMapper = {"PG": ["PG", "G", "UTIL"], "SG": ["SG", "G", "UTIL"], "SF": ["SF", "F", "UTIL"], "PF": ["PF", "F", "UTIL"], "C": ["C", "UTIL"], "UTIL": ["UTIL"], "CPT": ["CPT"]}

      const byPosition = slateData.reduce((acc, curr) => {
        const positions = curr.position.split('/')
        positions.forEach((position) => {
          const mappedPositions = dkPositionsMapper[position]
          mappedPositions.forEach((mappedPosition) => {
            if (acc[mappedPosition] === undefined) {
              acc[mappedPosition] = []
            }
      
            curr.cost = parseInt(curr.salary)
            acc[mappedPosition].push(curr)
          })
        })
        
        return acc
      }, {})

      const maxCost = 50000 
      if(type === 'DK Single Game') {
        startStopV3(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, (roster) => 
          isSingleGameRosterValidDK(roster, positionalCostBoost),
          maxCost, positionalCostBoost)
      } 
      if(type === 'DK Classic') { 
        startStopV2(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isClassicRosterValidDK, maxCost, lockedTeams)
        // if(lockedTeams.length > 0) {
        //   startStopDK(byPosition, lockedTeams, rosterSet, rosterCount)
        // } else {
        //   startStopV2(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, positionalCostBoost, isClassicRosterValidDK, maxCost, lockedTeams)
        // }
      }
    }
  }

  const isGeneratingRosters = computed(() => {
    return isGeneratingDK.value || isGeneratingFD.value || isGeneratingV2.value || isGeneratingV3.value
  })

  return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}