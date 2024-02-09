<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
  
const emits = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

const maxExposure = ref(props.modelValue)

const sliderClicked = (evt) => {
    evt.stopPropagation()
}

watch(() => maxExposure.value, (newVal) => {
  emits('update:modelValue', newVal)
})

</script>

<template>
  <div class="exposure-slider">
    <p class="title">max exp {{ maxExposure }}</p>
    <div class="exposure-slider-component">
      <p class="slider-label">0.5</p>
      <div class="exposure-slider">
        <input
          @click="sliderClicked"
          orient="vertical"
          type="range"
          min="0.5"
          max="1"
          v-model="maxExposure"
          class="slider"
          id="myRange"
          step="0.05"
        />
      </div>
      <p class="slider-label">1.0</p>
      <p class="slider-label"></p>
    </div>
  </div>
</template>

<style scoped>
.slider-label {
  font-size: 0.9rem;
  width: 1.5rem;
}

.exposure-slider {
  display: flex;
  align-items: center;
}

.slider {
  width: 4rem;
}

.exposure-slider {
  display: flex;
  flex-direction: column;
}

.exposure-slider-component {
  display: flex;
}

.title {
  font-size: 0.8rem;
  text-align: left;
  width: 8rem;
}
</style>