<template>
  <div class="header-section">
    <h1 class="page-title">LoRA Dashboard</h1>
    <p class="page-subtitle">Comprehensive overview of your LoRA model collection and file organization</p>
  </div>
</template>

<script>
export default {
  name: 'SummaryHeader'
};
</script>

<style scoped>
.header-section {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.025em;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 400;
  margin: 0;
  line-height: 1.6;
}
</style> 