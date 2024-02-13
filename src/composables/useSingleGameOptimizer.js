import { ref, onMounted, computed, nextTick, watch } from 'vue'

export function useSingleGameOptimizer(rostersUpdatedCallback, maxExposurePercentage) {

    const stopGeneratingRosters = () => {
    }

    const startStopGeneratingRosters = (slateData, rosterSet, rosterCount, site) => {
      /// slate data is an array of players
    }

    const isGeneratingRosters = computed(() => {
        return false
    })
    
    return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}