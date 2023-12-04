<script setup>
import HeaderBar from '../components/HeaderBar.vue';
import NewsFeed from '../components/NewsFeed.vue';
</script>

<template>
  <main>
    <HeaderBar />
    <div class="root">
      <div class="root-table">
        <div class="column-1">
          <NewsFeed />
          test
        </div>
        <div class="column-2">
          <NewsFeed />
        </div>
      </div>
    </div>
  </main>
</template>


<style scoped>
.root {
  display: flex;
  justify-content: center;
  align-items: center;
}

.root-table {
  margin: 1rem;
  display: grid;
  gap: 1.2rem;
  grid-template-columns: 2.5fr 1fr;
  width: clamp(300px, 100%, 77rem);
}

.column-1 {
}
</style>