<template>
  <div class="metadata-page">
    <div class="page-header">
      <h1>Metadata</h1>
      <p>Manage and view metadata information</p>
    </div>
    
    <div class="page-content">
      <div class="content-card">
        <h2>Metadata Management</h2>
        <p>This page is under development. Metadata management features will be added here.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MetadataPage',
  setup() {
    // Component logic will be added here
    return {};
  }
};
</script>

<style scoped>
.metadata-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

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

.page-header p {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin: 0;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
}

.content-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.content-card p {
  color: #7f8c8d;
  line-height: 1.6;
  margin: 0;
}
</style> 