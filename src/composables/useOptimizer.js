import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useOptimizerFD } from '../composables/useOptimizerFD.js'
import { useOptimizerDK } from '../composables/useOptimizerDK.js'
import { useOptimizerV2 } from './useOptimizerV2.js'

export function useOptimizer(rostersUpdatedCallback, maxExposurePercentage) {
  const { startStopGeneratingRosters: startStopFD, isGeneratingRosters: isGeneratingFD, stopGeneratingRosters: stopFD } = useOptimizerFD(rostersUpdatedCallback, maxExposurePercentage)
  const { startStopGeneratingRosters: startStopDK, isGeneratingRosters: isGeneratingDK, stopGeneratingRosters: stopDK } = useOptimizerDK(rostersUpdatedCallback, maxExposurePercentage)
  
  const { startStopGeneratingRosters: startStopV2, isGeneratingRosters: isGeneratingV2, stopGeneratingRosters: stopV2 } = useOptimizerV2(rostersUpdatedCallback, maxExposurePercentage)

  const stopGeneratingRosters = () => {
    stopFD()
    stopDK()
  }

  const isSingleGameRosterValid = (roster) => {
    /// TWO different teams
    /// 60k salary cap
    const totalCost = roster.map((row) => row.cost).reduce((a, b) => a + b, 0) 
    const isUnderCost = totalCost <= 60000
    if(!isUnderCost) {
      return false
    }

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

  const startStopGeneratingRosters = (slateData, lockedTeams, rosterSet, rosterCount, site, contestParams) => {
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

      const { type, positionsToFill, positionalScoreBoost } = contestParams.value
      if(type === 'FD Single Game') {
        startStopV2(byPosition, rosterSet, rosterCount, positionsToFill, positionalScoreBoost, isSingleGameRosterValid, 60000)
      }
      if(type === 'FD Classic') {
        startStopFD(byPosition, lockedTeams, rosterSet, rosterCount)
      }
    } else if (site === 'dk') {
      const dkPositionsMapper = {"PG": ["PG", "G", "UTIL"], "SG": ["SG", "G", "UTIL"], "SF": ["SF", "F", "UTIL"], "PF": ["PF", "F", "UTIL"], "C": ["C", "UTIL"]}

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

      startStopDK(byPosition, lockedTeams, rosterSet, rosterCount)
    }
  }

  const isGeneratingRosters = computed(() => {
    return isGeneratingDK.value || isGeneratingFD.value
  })

  return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}