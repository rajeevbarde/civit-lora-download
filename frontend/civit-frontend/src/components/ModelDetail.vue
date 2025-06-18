<template>
  <div class="app-container">
    <h1>Model Version Details</h1>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="model-detail">
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loop through all model properties -->
          <tr v-for="(value, key) in model" :key="key">
            <td>{{ key }}</td>
            <td>

              <div v-if="typeof value === 'string' && value.includes('<')">
                <div v-html="value"></div>
              </div>
              <div v-else>{{ value }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script>
import axios from 'axios';

export default {
  //props: ['modelVersionId'],
  data() {
    return {
      model: {},
      loading: false,
      error: null
    };
  },
  mounted() {
    console.log("Route ID:", this.$route.params.id);
    this.fetchModelDetails();
  },
  methods: {
async fetchModelDetails() {
  this.loading = true;
  this.error = null;

  const modelVersionId = Number(this.$route.params.id); // ✅ Convert to number

  try {
    console.log("Fetching data for ID:", modelVersionId);

    const response = await axios.get(`http://localhost:3000/api/models`, {
      params: { modelVersionId } 
    });

    console.log("API Response:", response.data);

    // Find the first matching model
    const foundModel = response.data.data.find(model => 
      model.modelVersionId === modelVersionId // ✅ Both are numbers now!
    );

    if (!foundModel) {
      throw new Error('No model found with the provided version ID.');
    }

    this.model = foundModel;
  } catch (err) {
    console.error(err);
    this.error = 'Failed to fetch model details.';
  } finally {
    this.loading = false;
  }
}


  }
};
</script>

<style scoped>
.app-container {
  max-width: 100%;
  margin: auto;
  padding: 20px;
}

.model-detail table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.model-detail th,
.model-detail td {
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
}

.model-detail tr:hover {
  background-color: #f8f8f8;
}
</style>
