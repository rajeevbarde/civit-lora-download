<template>
  <div id="app">
    <nav>
      <router-link to="/summary">Summary</router-link> |
      <router-link to="/file-scanner">File Scanner</router-link> |
      <router-link to="/">Model Table</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
};
</script>

<style scoped>
nav {
  padding: 1rem;
  background: #f8f8f8;
  margin-bottom: 1rem;
}
nav a {
  margin-right: 1rem;
  text-decoration: none;
  color: #333;
}
nav a.router-link-exact-active {
  font-weight: bold;
  color: #007bff;
}
</style>
