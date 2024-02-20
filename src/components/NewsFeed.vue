<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'

import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
import collapse from '@/assets/collapse.png'
import sync from '@/assets/sync.png'
  

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  pingCounter: {
    type: Number,
    default: 0
  },
  newsRows: {
    type: Array,
    default: () => []
  },
  selectedSiteInitial: {
    type: String,
    required: true
  }
})

const selectedSite = ref(props.selectedSiteInitial)

watch(() => props.selectedSiteInitial, (newVal) => {
  selectedSite.value = newVal

  console.log("Selected site1", selectedSite.value)
})

onMounted(() => {
  // const persistedSlate = localStorage.getItem('selectedSlate') || ''
  // if(persistedSlate.includes('FD')) {
  //   selectedSite.value = 'FD'
  // } 
  // if(persistedSlate.includes('DK')) {
  //   selectedSite.value = 'DK'
  // }


  formatRows(props.newsRows)

  nextTick(() => {
    scrollToBottom()
  })
})

const emits = defineEmits(['closePanel'])
const isOpenLocal = ref(props.isOpen)
const newsRowsLocal = ref(props.newsRows)

watch(() => props.isOpen, (newVal) => {
  isOpenLocal.value = newVal;
})

watch(() => props.pingCounter, (newVal) => {
  console.log('ping counter changed to: ', newVal, new Date().toLocaleString())

  let cube = document.querySelector(".ping-dot");
  if (cube) {
      cube.classList.add("animate-cube");

      // Optional: Remove the class after the animation ends
      cube.addEventListener('animationend', function() {
          cube.classList.remove("animate-cube");
      });
    }
})

const formatTime = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    let strTime = hours + ':' + minutes + ':' + seconds + ampm;
    return strTime;
}

const isToday = (timeInSeconds) => {
  const today = new Date();
    // Create a date object for the given time
    const dateToCheck = new Date(timeInSeconds * 1000); // Convert seconds to milliseconds

    // Check if the year, month, and day are the same
    return today.getFullYear() === dateToCheck.getFullYear() &&
           today.getMonth() === dateToCheck.getMonth() &&
           today.getDate() === dateToCheck.getDate();
}

const formatRows = (rows) => {
  newsRowsLocal.value = []
  rows.forEach((row) => {
    if(!row) {
      return
    }
    const newRows = []
    const parts = row.split(',')
    const time = parts[0]
    const startIdx = row.indexOf(',')
    let canParseJSON = false
    try {
      JSON.parse(row.substring(startIdx + 2, row.length))
      canParseJSON = true
    } catch {
      canParseJSON = false
    }

    if(!canParseJSON) {
      newsRowsLocal.value.push({
        text: row
      })

      return
    }

    const projections = JSON.parse(row.substring(startIdx + 2, row.length))

    const timeString = new Date(parseFloat(time) * 1000)

    if(!isToday(time)) {
      return
    }

    newsRowsLocal.value.push({
      text: `${formatTime(timeString)}`
    })
    projections.forEach((projection) => {
      const name = projection[0]
      const team = projection[1]
      const fdInitial = projection[2]
      const dkInitial = projection[3]
      const fdFinal = projection[4]
      const dkFinal = projection[5]

      if(!fdInitial || !dkInitial) {
        return
      }
      
      const fdDiff = (fdFinal - fdInitial).toFixed(2)
      const dkDiff = (dkFinal - dkInitial).toFixed(2)
      
      if((fdInitial > 13 || fdFinal > 13) && Math.abs(fdDiff) > 0.3) {
        newRows.push([`${name} ${fdInitial.toFixed(2)} → ${fdFinal.toFixed(2)} (${fdDiff > 0 ? '+' : ''}${fdDiff})`, fdDiff, 'fd', team])
      }
      if((dkInitial > 13 || dkFinal > 13) && Math.abs(dkDiff) > 0.3) {
        newRows.push([`${name} ${dkInitial.toFixed(2)} → ${dkFinal.toFixed(2)} (${fdDiff > 0 ? '+' : ''}${dkDiff})`, dkDiff, 'dk', team])
      }
    })

    newsRowsLocal.value = [...newsRowsLocal.value, ...newRows.sort((a, b) => {
      return b[1] - a[1]
    }).map((row) =>
    ({
      text: row[0],
      diff: row[1],
      site: row[2],
      team: row[3],
    }))]
  })



}

watch(() => props.newsRows, (newVal) => {
  formatRows(newVal)
  nextTick(() => {
    scrollToBottom()
  })
})

const newsRowsFiltered = computed(() => {
  const fdRows =  newsRowsLocal.value.filter((row) => !row.site || row.site === 'fd')
  
  const dkRows =  newsRowsLocal.value.filter((row) => !row.site || row.site === 'dk')

  return selectedSite.value === 'FD' ? fdRows : dkRows
})

const closePanel = () => {
  emits('closePanel');
}

const scrollToBottom = () => {
  let div = document.getElementById("feed");
  div.scrollTop = div.scrollHeight;
}
</script>

<template>
  <div class="news-feed" v-if="isOpenLocal">
  <!-- At some point we'll seen a sport selector... -->
    <!-- blinking light indicator -->
    <!-- Poll the API every 10 seconds -->
    
    <div class="title">
      <button class="collapse-button" @click="closePanel">
        <img :src="collapse" alt="collapse" height="20">
      </button>
      <div class="dot-and-title">
        <div class="ping-dot">
          <img :src="sync" alt="sync">

        </div>
        <p>Breaking News</p>
      </div>
      <div class="site-selector">
        <input type="radio" id="option1" name="option" value="FD" v-model="selectedSite">
        <label for="option1"><img :src="fdlogo" alt="fanduel" height="20"></label>
        <input type="radio" id="option2" name="option" value="DK" v-model="selectedSite">
        <label for="option2"><img :src="dklogo" alt="draftkings" height="20"></label>
      </div>

    </div>
    <div class="feed" id="feed">
      <div v-for="(row, idx) in newsRowsFiltered" :key="idx">
        <p :class="[row.diff > 1 && 'highlight-1', row.diff < -1 && 'highlight-2', !row.diff && 'bold-text']">
          {{ row.text }}
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  justify-content: space-between;
  user-select: none;
}
.news-feed {
  background-color: lightgray;
  color: black;
  height: calc(100vh - 6rem);
  border-radius: 1.1rem;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 0.5rem;
}

.feed {
  padding: 0.3rem;
  font-size: 0.9rem;
  line-height: 1;
  background-color: white;
  display: flex;
  flex-direction: column;
  width: 97%;
  overflow-y: auto;
  border: 1px solid black;
}

.site-selector {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 1rem;
}

.collapse-button {
  background-color: transparent;
  border: 1px solid black;
  cursor: pointer;
  border-radius: 0.5rem;
}

.ping-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 0.2rem;
  margin-right: 0.1rem;
  visibility: hidden;

}

.dot-and-title {
  display: flex;
  align-items: center;
}

@keyframes rotateCube {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(180deg);
    }
}

.animate-cube {
    animation: rotateCube 2s ease-in-out;
    visibility: visible !important;
}

.highlight-1 {
  /* color: green; */
  background-color: rgba(144, 238, 144, 0.657);
}

.highlight-2 {
  /* color: red; */
  background-color: rgba(240, 128, 128, 0.461);
}

.bold-text {
  font-weight: bold;
  text-decoration: underline;
}

/* Styling for the scrollbar */
.feed::-webkit-scrollbar {
  width: 12px; /* Width of the scrollbar */
}

.feed::-webkit-scrollbar-track {
  background: #f1f1f1; /* Color of the track */
}

.feed::-webkit-scrollbar-thumb {
  background: #888; /* Color of the scrollbar thumb */
}

.feed::-webkit-scrollbar-thumb:hover {
  background: #555; /* Color of the scrollbar thumb when hovered */
}
</style>