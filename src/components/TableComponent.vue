<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
  
const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  rows: {
    type: Array,
    required: true
  },
})

const emits = defineEmits([])
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
        >
          {{ cell }}
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
</style>