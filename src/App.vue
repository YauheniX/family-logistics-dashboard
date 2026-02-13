<template>
  <nav>
    <h1>Family Logistics</h1>
    <ul>
      <li><router-link to="/home">Home</router-link></li>
      <li><router-link to="/tasks">Tasks</router-link></li>
      <li><router-link to="/events">Events</router-link></li>
    </ul>
  </nav>
  <main>
    <div class="container">
      <router-view></router-view>
    </div>
  </main>
</template>

<script>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  setup() {
    const router = useRouter();

    onMounted(() => {
      // Any action to perform on mount
    });
  }
};
</script>

<style>
.container {
  max-width: 1200px;
  margin: 0 auto;
}
nav {
  background-color: #eee;
  padding: 1rem;
}
nav h1 {
  display: inline;
  margin-right: 20px;
}
nav ul {
  list-style: none;
  display: inline;
}
nav ul li {
  display: inline;
  margin-right: 15px;
}
</style>