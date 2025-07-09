<template>
  <div class="header-section">
    <h1 class="page-title">LoRA Hub</h1>
    <p class="page-subtitle">Browse, filter, and manage your LoRA collection</p>
  </div>
</template>

<script>
export default {
  name: 'ModelTableHeader',
  setup() {
    // No reactive data needed for this simple component
    return {};
  }
}
</script>

<style scoped>
/* Enhanced Header Section Styles */
.header-section {
  text-align: center;
  margin-bottom: 1.2rem;
  padding: 1rem 0;
}

.page-title {
  font-size: 2.1rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.05rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.4;
  padding-bottom: 0.2rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
}
</style> 