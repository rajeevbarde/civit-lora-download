<template>
  <div class="settings-main-header">
    <span class="settings-main-icon">⚙️</span>
    <div>
      <h2 class="settings-main-title">Settings</h2>
      <p class="settings-main-subtitle">Configure your application and manage logs</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsHeader'
};
</script>

<style scoped>
.settings-main-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2.5rem 0 2rem 0;
  max-width: 900px;
  margin: 0 auto 2rem auto;
  border-radius: 0 0 24px 24px;
  background: linear-gradient(90deg, #667eea 0%, #5eead4 100%);
  box-shadow: 0 2px 12px 0 rgba(102, 126, 234, 0.08);
}

.settings-main-icon {
  font-size: 2.5rem;
  background: white;
  border-radius: 50%;
  padding: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(102, 126, 234, 0.10);
}

.settings-main-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #22223b;
  margin: 0;
}

.settings-main-subtitle {
  font-size: 1.1rem;
  color: #334155;
  margin: 0;
}

@media (max-width: 700px) {
  .settings-main-header {
    padding-left: 1rem;
    padding-right: 1rem;
    max-width: 100vw;
  }
}
</style> 