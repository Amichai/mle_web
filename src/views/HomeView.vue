<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'

const pingCounter = ref(0)
let dataVersion = localStorage.getItem(`data-version`) || '0';
let breakingNews = localStorage.getItem('breaking-news') || '';
const breakingNewsRows = ref(breakingNews.split('\n'));

const playerData = ref([])
const teamData = ref([])
const slateData = ref([])
const slatePlayerData = ref([])
const pingPeriod = ref('')

let intervalId = null;

const queryData = async (url) => {
  // Fetch the CSV file
  const response = await fetch(url)
  const data = await response.text()
  return data
}

const pingApi = async () => {
  console.log('pinging API...')

  // TODO: this should return n version numbers, one for each of the file downloads (one base file, and one dynamic override file)
  const url = 'https://icw7yaef4f.execute-api.us-east-1.amazonaws.com/dev/data?key=v'
  const response = await fetch(url)
  const data = await response.json()
  const newDataVersion = data.Items[0].ct.S
  pingPeriod.value = data.Items[0].period.S
  if(newDataVersion !== dataVersion) {
    console.log('new data version detected: ', newDataVersion)
    dataVersion = newDataVersion
    localStorage.setItem(`data-version`, newDataVersion)
    const result = await queryData('https://amichai-dfs-data.s3.amazonaws.com/breakingNews.txt')
    localStorage.setItem('breaking-news', result)
    const rows = result.split('\n');
    console.log(rows);
    breakingNewsRows.value = rows
  }

  pingCounter.value += 1

  intervalId = setTimeout(pingApi, pingPeriod.value * 1000)
}

const splitData = (data) => {
  return data.split('\n').filter(i => i).map((row) => row.split(','))
}

onMounted(async () => {
  startPingingAPI()

  const data1 = await queryData('https://amichai-dfs-data.s3.amazonaws.com/player_data')
  playerData.value = splitData(data1)


  const data2 = await queryData('https://amichai-dfs-data.s3.amazonaws.com/slate_data')
  slateData.value = splitData(data2)
  
  const data3 = await queryData('https://amichai-dfs-data.s3.amazonaws.com/team_data')
  teamData.value = splitData(data3)
  
  const data4 = await queryData('https://amichai-dfs-data.s3.amazonaws.com/slate_player_data')
  slatePlayerData.value = splitData(data4)
  
  console.log(slatePlayerData.value)
})

const gridColumns = ref('2.5fr 1rem 1fr')
const isPanelOpen = ref(true)

const closePanel = () => {
  gridColumns.value = '10fr 0fr 0fr'
  isPanelOpen.value = false
}

const openPanel = () => {
  gridColumns.value = '2.5fr 1rem 1fr'
  setTimeout(() => {
    isPanelOpen.value = true
  }, 490)
}

const startPingingAPI = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  pingApi()
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
          />
        </div>
        <div></div>
        <div class="column-2">
          <NewsFeed @close-panel="closePanel" :isOpen="isPanelOpen" :pingCounter="pingCounter" :newsRows="breakingNewsRows"/>
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
  transition: grid-template-columns 0.5s linear;
}

.column-2 {
}
</style>