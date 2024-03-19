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
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
})
const selectedSlate = ref(props.selected)

/// set first as default
/// check local storage
/// check if a slate was passed to props
const setSelectedSlate = () => {
  if (props.isFirstSlateAsDefault && !selectedSlate.value && props.availableSlates.length > 0) {
    selectedSlate.value = props.availableSlates[0][0]
    emits('selectedSlateChanged', props.availableSlates[0])
  }

  // selectedSlate.value = localStorage.getItem('selectedSlate') || ''
}

onMounted(() => {
  console.log("Selected slate", selectedSlate.value)
  setSelectedSlate()
})

watch(() => props.selected, (newVal) => {
  selectedSlate.value = newVal
  setSelectedSlate()
})

watch(() => props.isFirstSlateAsDefault, (newVal) => {
  setSelectedSlate()
})

watch(() => props.availableSlates, (newVal) => {
  setSelectedSlate()
})

const selectedSlateChanged = () => {
  const selected = props.availableSlates.find(s => s[0] === selectedSlate.value)
  emits('selectedSlateChanged', selected)
}

const emits = defineEmits(['selectedSlateChanged'])
</script>

<template>
  <div class="slate-selector">
    <img :src="dklogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('DK')">
    <img :src="fdlogo" alt="dk logo" height="20" v-show="selectedSlate?.includes('FD')">
    <div v-show="!selectedSlate" style="width: 20px;"></div>

    <select v-model="selectedSlate" placeholder="slate" 
    @change="selectedSlateChanged" :disabled="!props.isEnabled">
      <option v-for="(slate, index) in availableSlates" :key="index" :value="slate[0]">
        {{ slate[0] }}
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

select {
  width: 19.5rem;
}
</style>