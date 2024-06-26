<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import addIcon from '@/assets/add.png'
import SlateBuilder from '../components/SlateBuilder.vue'

const emits = defineEmits(['slateGotFocus'])

const props = defineProps({
  availableSlates: {
    type: Array,
    required: true
  },
  playerData: {
    type: Object,
    required: true
  },
  selectedTab: {
    type: String,
    required: true
  },
  teamData: {
    type: Array,
    required: true
  }
})

const slateIds = ref([])

const addSlate = () => {
  slateIds.value.push(lowestAvailableId())
  localStorage.setItem(`slateIds`, slateIds.value.join(','))
}

const removeSlate = (index) => {
  slateIds.value.splice(index, 1)
  console.log("Remove slate slateIds", slateIds.value)
  localStorage.setItem(`slateIds`, slateIds.value.join(','))
}

onMounted(async () => {
  const slateIdsString = localStorage.getItem(`slateIds`)
  slateIds.value = slateIdsString === '' ? [] :
    slateIdsString?.split(',')?.map(s => parseInt(s)) ?? []

  console.log("slateIds", slateIds.value)
})

const lowestAvailableId = () => {
  let id = 0
  while (slateIds.value.filter(slateId => slateId === id).length) {
    id += 1
  }

  console.log("lowestAvailableId", id)
  return id
}

const gotFocus = (slate) => {
  emits('slateGotFocus', slate)
}

</script>

<template>
  <div v-for="(slateId, index) in slateIds" :key="slateId">
      <SlateBuilder
        :index="index"
        :id="slateId"
        :availableSlates="availableSlates"
        :playerData="playerData"
        :selectedTab="selectedTab"
        :teamData="teamData"
        @delete="() => removeSlate(index)"
        @gotFocus="(slate) => gotFocus(slate)"
      />
    </div>
    <button class="add-button" @click="addSlate">
      <img :src="addIcon" alt="add slate" width="30">
    </button>
    Add slate
</template>

<style scoped>
.add-button {
  bottom: 1rem;
  right: 1rem;
  border-radius: 50%;
  border: none;
  padding: 0.5rem;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.add-button:active {
  background-color: gray;
  box-shadow: none;
}

</style>