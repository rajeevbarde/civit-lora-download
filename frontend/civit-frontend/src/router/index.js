import { createRouter, createWebHistory } from 'vue-router';
import ModelTable from '../components/ModelTable.vue';
import ModelDetail from '../components/ModelDetail.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: ModelTable,
  },
  {
    path: '/model/:id',
    name: 'ModelDetail',
    component: ModelDetail,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
