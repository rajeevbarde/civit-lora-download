<template>
  <div class="lora-summary-page">
    <h1>LoRA Summary Page</h1>
    <p>This is the LoRA summary page. Add your LoRA summary content here.</p>
    
    <div class="summary-content">
      <div class="summary-card">
        <h2>Summary Information</h2>
        <p>This page provides an overview of your LoRA models and downloads.</p>
        <p>Matrix functionality has been removed as requested.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoRASummary',
  data() {
    return {
      // Empty data object - no matrix data needed
    };
  },
  mounted() {
    // No matrix fetching needed
  },
  methods: {
    // No matrix methods needed
  },
};
</script>

<style scoped>
.lora-summary-page {
  width: 100%;
  padding: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 16px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

h2 {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #374151;
}

p {
  margin-bottom: 24px;
  color: #6b7280;
}

.summary-content {
  margin-top: 32px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .lora-summary-page {
    padding: 8px;
  }
  
  h1 {
    font-size: 24px;
    margin-bottom: 12px;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }
  
  .summary-card {
    padding: 16px;
  }
}
</style> 