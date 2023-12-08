<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'

const pingCounter = ref(0)
let dataVersion = localStorage.getItem(`data-version`) || '0';
let breakingNews = localStorage.getItem('breaking-news') || '';
const breakingNewsRows = ref(breakingNews.split('\n'));

let intervalId = null;

const queryData = (url, name, action) => {
  // Fetch the CSV file
  fetch(url)
    .then(response => {
      // Check if the request is successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      // Process the CSV data
      localStorage.setItem(name, data)
      const rows = data.split('\n');
      console.log(rows);
      action(rows)
    })
    .catch(error => {
      console.error('Error fetching the CSV file:', error);
    });
}

const pingApi = () => {
  console.log('pinging API...')

  // TODO: this should return n version numbers, one for each of the file downloads (one base file, and one dynamic override file)
  const url = 'https://icw7yaef4f.execute-api.us-east-1.amazonaws.com/dev/data?key=v'
  fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).then(data => {
      const newDataVersion = data.Items[0].ct.S
      if(newDataVersion !== dataVersion) {
        console.log('new data version detected: ', newDataVersion)
        dataVersion = newDataVersion
        localStorage.setItem(`data-version`, newDataVersion)
        queryData('https://amichai-dfs-data.s3.amazonaws.com/breakingNews.txt', 'breaking-news', (rows) => breakingNewsRows.value = rows)
      }

    }).catch(error => {
      console.error('Error fetching the API:', error);
    });

  pingCounter.value += 1
}

onMounted(() => {
  startPingingAPI()

  queryData('https://amichai-dfs-data.s3.amazonaws.com/player_data', 'breaking-news', (rows) => breakingNewsRows.value = rows)
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

  // Set up the interval to ping the API every 10 seconds (10000 milliseconds)
  intervalId = setInterval(pingApi, 10000);
}

</script>

<template>
  <main>
    <HeaderBar />
    <div class="home-view">
      <div class="root-table" :style="{ gridTemplateColumns: gridColumns }">
        <div class="column-1">
          <TabComponent @openPanel="openPanel" :isOpen="isPanelOpen"/>
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