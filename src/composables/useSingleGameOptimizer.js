import { ref, onMounted, computed, nextTick, watch } from 'vue'

export function useSingleGameOptimizer(rostersUpdatedCallback, maxExposurePercentage) {

    const stopGeneratingRosters = () => {
    }

    const startStopGeneratingRosters = (slateData, rosterSet, rosterCount, site) => {
      /// slate data is an array of players

      topRosters = []
    
    ///don't try to append lineups with undefined players
    if(rosterSet.every((roster) => roster.players.filter((player) => !player).length === 0)) {
      appendNewLineups(rosterSet.map((roster) => playerListToRoster(roster.players)), !_lockedTeams.length)
    }
    }

    const isGeneratingRosters = computed(() => {
        return false
    })
    
    return { startStopGeneratingRosters, isGeneratingRosters, stopGeneratingRosters }
}