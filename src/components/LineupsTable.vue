<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { convertTimeStringToDecimal } from '../utils.js'
  
const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  rows: {
    type: Array,
    required: true
  },
  currentTime: {
    type: Number,
    required: true
  },
})

const emits = defineEmits([])

const isPlayerLocked = (startTime) => {
  const currentTime = props.currentTime
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  const toReturn = decimalStartTime < currentTime
  return toReturn
}

watch(() => props.rows, (newVal) => {
})
</script>

<template>
  <table>
    <thead>
      <tr>
        <th></th>
        <th v-for="(column, index) in props.columns" :key="index" v-show="column">{{ column }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in rows" :key="index">
        <td><b>{{ index + 1 }}</b></td>
        <td v-for="(cell, cellIndex) in row" :key="cellIndex"
        v-show="props.columns[cellIndex] || cell"
        :class="[cell?.override !== cell?.projection && 'overriden']"
        >
          <div v-if="(typeof cell === 'object')" :class="['tooltip', isPlayerLocked(cell?.startTime) && 'is-locked']">
            {{ cell?.name }}
            <span class="tooltiptext">{{ cell?.override }}
              <br>
            {{ cell?.team }}
            <br>
            {{ `$${cell?.cost}` }}
            </span>
          </div>
          <div v-else :class="[cellIndex === 0 && columns[0] === 'Contest' && 'contest-name']">
            {{ cell }}
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto', Arial, Helvetica, sans-serif;
  font-weight: 300;
  overflow-x: auto;
}

th, td {
  border: 1px solid darkgray;
  padding: 0.2rem;
  text-align: left;
}

tr {
  line-height: 1rem;
  font-size: 1rem;
  background-color: #f2f2f2;
}

table tr:nth-child(odd)
{
  background-color: lightgray;
}

.tooltip {
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
}

/* Tooltip text */
.tooltip .tooltiptext {
  visibility: hidden;
  width: 120px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
 
  /* Position the tooltip text - see examples below! */
  position: absolute;
  z-index: 1000;

  top: 1rem;
  left: 0rem;
}

/* Show the tooltip text when you mouse over the tooltip container */
.tooltip:hover .tooltiptext {
  visibility: visible;
}

table tr:nth-child(odd) .overriden
{
  background-color: #E9E983 !important;
}

table tr:nth-child(even) .overriden
{
  background-color: #FFFF33 !important;
}

.contest-name {
  font-size: 0.75rem
}

.is-locked {
  color: #6b0c0c !important;
}
</style>