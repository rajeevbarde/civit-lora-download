<template>
  <div v-if="show" class="sample-db-warning">
    <span class="warning-icon">❗</span>
    <span class="warning-text">
      <b>Warning:</b> The application is currently using a <b>sample database</b> (less than 500 models).<br>
      Please download the full database and provide all details in the <router-link to="/setting">Setting</router-link> page.<br>
      <span class="readme-note">Full database details and instructions can be found in the README.</span>
    </span>
  </div>
</template>

<script>
export default {
  name: 'SampleDbWarning',
  props: {
    show: {
      type: Boolean,
      required: true
    }
  }
};
</script>

<style scoped>
.sample-db-warning {
  display: flex;
  align-items: center;
  background: #fff1f0;
  color: #cf1322;
  border: 2px solid #ff4d4f;
  border-radius: 6px;
  padding: 18px;
  margin-bottom: 24px;
  font-size: 1.15em;
  font-weight: 500;
  box-shadow: 0 2px 12px rgba(255, 77, 79, 0.15);
  animation: pulse-red 1.5s infinite alternate;
}
@keyframes pulse-red {
  from { box-shadow: 0 2px 12px rgba(255, 77, 79, 0.15); }
  to { box-shadow: 0 4px 24px rgba(255, 77, 79, 0.35); }
}
.warning-icon {
  font-size: 2.2em;
  margin-right: 16px;
  flex-shrink: 0;
}
.warning-text {
  flex: 1;
  line-height: 1.6;
}
.readme-note {
  display: block;
  margin-top: 8px;
  font-size: 0.98em;
  color: #a8071a;
}
</style> 