<template>
  <div class="header-section">
    <h1 class="page-title">Orphan & Duplicate LoRA Identifier</h1>
    <p class="page-description">
      Identify and manage orphan LoRA files by checking with CivitAI, updating the database, and renaming files as needed.
    </p>
  </div>
</template>

<script>
export default {
  name: 'CivitDataFetcherHeader'
}
</script>

<style scoped>
/* Enhanced Header Section Styles */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-description {
  font-size: 1.2rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Responsive design */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-description {
    font-size: 1.1rem;
  }
}
</style> 