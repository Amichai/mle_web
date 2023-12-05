<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
import TabComponent from '../components/TabComponent.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue'

const pingCounter = ref(0)
let dataVersion = 0;

let intervalId = null;

const queryData = () => {
  const url = 'https://amichai-dfs-data.s3.amazonaws.com/Caesars_NBA_current.txt';

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
      const rows = data.split('\n');
      const result = [];

      // Assuming the first row contains headers
      const headers = rows[0].split(',');

      // Loop through the rows and create objects
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i]) continue; // Skip empty rows
        const cells = rows[i].split(',');
        const obj = {};
        for (let j = 0; j < cells.length; j++) {
          obj[headers[j]] = cells[j];
        }
        result.push(obj);
      }

      // Use the parsed data
      console.log(result);
    })
    .catch(error => {
      console.error('Error fetching the CSV file:', error);
    });
}

const pingApi = () => {
  console.log('pinging API...')

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
      }

    }).catch(error => {
      console.error('Error fetching the API:', error);
    });

  pingCounter.value += 1
}

onMounted(() => {
  startPingingAPI()
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
          <NewsFeed @close-panel="closePanel" :isOpen="isPanelOpen" :pingCounter="pingCounter"/>
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