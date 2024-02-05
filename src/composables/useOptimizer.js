import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useOptimizerFD } from '../composables/useOptimizerFD.js'
import { useOptimizerDK } from '../composables/useOptimizerDK.js'

export function useOptimizer(rostersUpdatedCallback, maxExposurePercentage) {
  const { startStopGeneratingRosters: startStopFD, isGeneratingRosters: isGeneratingFD, stopGeneratingRosters: stopFD } = useOptimizerFD(rostersUpdatedCallback, maxExposurePercentage)
  const { startStopGeneratingRosters: startStopDK, isGeneratingRosters: isGeneratingDK, stopGeneratingRosters: stopDK } = useOptimizerDK(rostersUpdatedCallback)

  const stopGeneratingRosters = () => {
    stopFD()
    stopDK()
  }

  const startStopGeneratingRosters = (slateData, lockedTeams, rosterSet, rosterCount, site) => {
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

      startStopFD(byPosition, lockedTeams, rosterSet, rosterCount)
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