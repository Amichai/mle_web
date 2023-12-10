<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import dklogo from '@/assets/draftkings.png'
import fdlogo from '@/assets/fanduel.png'
  
const props = defineProps({
  availableSlates: {
    type: Array,
    required: true
  },
  isFirstSlateAsDefault: {
    type: Boolean,
    default: true
  },
  selected: {
    type: String,
    default: ''
  }
})
const selectedSlate = ref(props.selected)

watch(() => props.selected, (newVal) => {
  selectedSlate.value = newVal
})


watch(() => props.availableSlates, (newVal) => {
  if(props.isFirstSlateAsDefault) {
    selectedSlate.value = newVal[0]
  }
})

const selectedSlateChanged = () => {
  emits('selectedSlateChanged', selectedSlate.value)
}

const emits = defineEmits(['selectedSlateChanged'])
</script>

<template>
  <div class="slate-selector">
    <img :src="dklogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('DK')">
    <img :src="fdlogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('FD')">
    <div v-show="!selectedSlate" style="width: 20px;"></div>

    <select v-model="selectedSlate" placeholder="slate" @change="selectedSlateChanged">
      <option v-for="(slate, index) in availableSlates" :key="index" :value="slate">
        {{ slate }}
      </option>
    </select>
  </div>
</template>

<style scoped>
select {
  width: 200px;
  padding: 10px;
  margin: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  font-family: Arial, sans-serif;
}

option {
  padding: 5px;
  font-family: Arial, sans-serif;
}

.slate-selector {
  display: flex;
  direction: row;
  align-items: center;
  margin-left: 1rem;
}

</style>