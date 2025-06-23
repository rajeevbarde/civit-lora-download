<template>
  <div class="pagination">
    <button 
      :disabled="currentPage === 1"
      @click="changePage(currentPage - 1)"
      class="btn-pagination"
    >
      Previous
    </button>
    <span class="page-info">Page {{ currentPage }}</span>
    <button 
      @click="changePage(currentPage + 1)"
      class="btn-pagination"
    >
      Next
    </button>
  </div>
</template>

<script>
export default {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      default: 1
    }
  },
  emits: ['page-change'],
  methods: {
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.totalPages) {
        this.$emit('page-change', newPage);
      }
    }
  }
};
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
}

.btn-pagination {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-pagination:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.page-info {
  font-weight: 500;
  color: #495057;
  min-width: 80px;
  text-align: center;
}
</style> 