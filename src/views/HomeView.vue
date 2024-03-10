<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { getTodaysDate, queryData, splitData, loadPlayerDataForSlate } from '../utils.js'

const pingCounter = ref(0)
let dataVersion = localStorage.getItem(`data-version`) || '0';
let breakingNews = localStorage.getItem('breaking-news') || '';
const breakingNewsRows = ref(breakingNews.split('\n'));

const playerData = ref([])
const teamData = ref([])
const slateData = ref([])
const slatePlayerData = ref([])
const pingPeriod = ref('')
const selectedSite = ref('FD')

let intervalId = null;

const queryProjectionsAPI = async () => {
  const url = 'https://icw7yaef4f.execute-api.us-east-1.amazonaws.com/dev/data?key=v'
  const response = await fetch(url)
  const data = await response.json()
  const newDataVersion = data.Items[0].ct.S
  pingPeriod.value = data.Items[0].period.S
  if(newDataVersion !== dataVersion) {
    console.log('new data version detected: ', newDataVersion)
    dataVersion = newDataVersion
    localStorage.setItem(`data-version`, newDataVersion)
    const result = await queryData('https://amichai-dfs-data.s3.amazonaws.com/news_feed.txt', true)
    localStorage.setItem('breaking-news', result)
    const rows = result.split('\n');
    console.log(rows);
    breakingNewsRows.value = rows

    const formattedDate = getTodaysDate()
    const data1 = await queryData(`https://amichai-dfs-data.s3.amazonaws.com/player_data_${formattedDate}`, true)
    playerData.value = splitData(data1, 1)
  }
}

const pingApi = async () => {
    console.log('pinging API...')

  try {
    // TODO: this should return n version numbers, one for each of the file downloads (one base file, and one dynamic override file)
    await queryProjectionsAPI()

    pingCounter.value += 1
  } catch (error) {
    console.error('error pinging API: ', error)
  }

  intervalId = setTimeout(pingApi, pingPeriod.value * 1000)
}

onMounted(async () => {
  startPingingAPI()

  const formattedDate = getTodaysDate()

  const data1 = await queryData(`https://amichai-dfs-data.s3.amazonaws.com/player_data_${formattedDate}`)
  playerData.value = splitData(data1, 1)

  const data2 = await queryData(`https://amichai-dfs-data.s3.amazonaws.com/slate_data_${formattedDate}`)
  slateData.value = splitData(data2)
  
  const data3 = await queryData(`https://amichai-dfs-data.s3.amazonaws.com/team_data_${formattedDate}`)

  teamData.value = splitData(data3)
})

const isPlayerDataAvailable = computed(() => {
  return playerData.value.length > 2 && slateData.value
})

const openGridColumnStyle = '70% 1rem 29% 1rem'

const gridColumns = ref(openGridColumnStyle)
const isPanelOpen = ref(true)

const closePanel = () => {
  gridColumns.value = '100% 0rem 0% 1rem'
  isPanelOpen.value = false
}

const openPanel = () => {
  gridColumns.value = openGridColumnStyle
  setTimeout(() => {
    isPanelOpen.value = true
  }, 190)
}

const startPingingAPI = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  pingApi()
}

const selectedSlateChanged = async (newSlate) => {
  console.log('selectedSlateChanged', newSlate)
  const playerDataWithDuplicates = await loadPlayerDataForSlate(newSlate)

  slatePlayerData.value = playerDataWithDuplicates
}

const queryProjections = () => {
  queryProjectionsAPI()
}
</script>

<template>
  <main>
    <HeaderBar />
    <div class="home-view">
      <div class="root-table" :style="{ gridTemplateColumns: gridColumns }">
        <div class="column-1">
          <TabComponent @openPanel="openPanel" :isOpen="isPanelOpen"
            :playerData="playerData" :teamData="teamData" :slateData="slateData" :slatePlayerData="slatePlayerData"
            @selectedSiteChanged="selectedSite = $event"
            @selectedSlateChanged="selectedSlateChanged"
          />
        </div>
        <div></div>
        <div class="column-2">
          <NewsFeed @close-panel="closePanel" :isOpen="isPanelOpen"
          @queryProjections="queryProjections" :pingCounter="pingCounter" :newsRows="breakingNewsRows"
          :selectedSiteInitial="selectedSite"
          />
        </div>
      </div>
    </div>
  </main>
</template>


<style scoped>
.home-view {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: black;
}

.root-table {
  margin: 1rem;
  display: grid;
  width: 100%;
  transition: grid-template-columns 0.2s linear;
}

.background-message {
  background-color: lightgray;
  color: black;
  height: calc(100vh - 6rem);
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
  overflow: auto;
}

</style>