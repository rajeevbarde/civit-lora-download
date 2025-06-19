<template>
  <div class="summary-page">
    <h1>Summary Page</h1>
    <p>This is the summary page. Add your summary content here.</p>
    <div v-if="loading">Loading matrix...</div>
    <div v-else>
      <table v-if="matrix.length" class="summary-matrix">
        <thead>
          <tr>
            <th>NSFW Level \ Base Model</th>
            <th v-for="bm in baseModels" :key="bm">{{ bm }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in matrix" :key="row.modelVersionNsfwLevel">
            <td>{{ row.modelVersionNsfwLevel }}</td>
            <td v-for="bm in baseModels" :key="bm">
              {{ row[bm] }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else>No data available.</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Summary',
  data() {
    return {
      baseModels: [],
      nsfwLevels: [],
      matrix: [],
      loading: true,
    };
  },
  mounted() {
    this.fetchMatrix();
  },
  methods: {
    async fetchMatrix() {
      this.loading = true;
      try {
        const res = await fetch('http://localhost:3000/api/summary-matrix');
        const data = await res.json();
        this.baseModels = data.baseModels;
        this.nsfwLevels = data.nsfwLevels;
        this.matrix = data.matrix;
      } catch (e) {
        this.baseModels = [];
        this.nsfwLevels = [];
        this.matrix = [];
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.summary-page {
  padding: 2rem;
}
.summary-matrix {
  border-collapse: collapse;
  margin-top: 2rem;
}
.summary-matrix th, .summary-matrix td {
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  text-align: center;
}
.summary-matrix th {
  background: #f0f0f0;
}
</style> 