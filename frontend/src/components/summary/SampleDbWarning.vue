<template>
  <div v-if="show" class="sample-db-warning">
    <span class="warning-icon">⚠️</span>
    <span class="warning-text">
      This app is currently using a <b>sample database</b> with limited models.<br><br>
      <b>To get started with your own data:</b>
      <ol style="margin: 8px 0 0 18px; padding: 0;">
        <li><b>Register:</b> Add your Existing LoRA folder paths (see <router-link to='/file-scanner'><u>Register</u></router-link>).</li>
        <li><b>Settings:</b> Set your <u>download folder</u> and <u>Civitai token</u> in <router-link to='/setting'>Settings</router-link>.</li>
        <li><b>Save:</b> Click <b>Save All Settings</b>.</li>
        <li><b>Restart:</b>
          <ol type="a" style="margin: 4px 0 0 18px; padding: 0;">
            <li>Close both server windows.</li>
            <li>Double-click <code>start_servers.bat</code> to restart the app.</li>
          </ol>
        </li>
      </ol>
      <div style="margin-top: 12px;">
        <b>Next:</b> See the <b>README</b> for full database setup instructions.
      </div>
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
  background: #fff7e6;
  color: #ad6800;
  border: 2px solid #faad14;
  border-radius: 6px;
  padding: 18px;
  margin-bottom: 24px;
  font-size: 1em;
  font-weight: 500;
  box-shadow: 0 2px 12px rgba(250, 173, 20, 0.15);
  animation: pulse-orange 1.5s infinite alternate;
}
@keyframes pulse-orange {
  from { box-shadow: 0 2px 12px rgba(250, 173, 20, 0.15); }
  to { box-shadow: 0 4px 24px rgba(250, 173, 20, 0.35); }
}
.warning-icon {
  font-size: 2em;
  margin-right: 16px;
  flex-shrink: 0;
}
.warning-text {
  flex: 1;
  line-height: 1.5;
  font-size: 0.98em;
}
.readme-note {
  display: none;
}
</style> 