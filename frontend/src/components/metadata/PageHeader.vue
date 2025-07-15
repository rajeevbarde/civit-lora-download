<template>
  <div class="page-header">
    <h1>Metadata <span class="bracket-text">(includes trigger words)</span></h1>
  </div>
</template>

<script>
export default {
  name: 'PageHeader'
};
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.bracket-text {
  font-size: 1.2rem;
  font-weight: 400;
  color: #7f8c8d;
}

.page-header p {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin: 0;
}
</style> 