import { createRouter, createWebHistory } from 'vue-router';
import ModelTable from '../components/ModelTable.vue';
import ModelDetail from '../components/ModelDetail.vue';
import Summary from '../components/Summary.vue';

const routes = [
  {
    path: '/',
    name: 'ModelTable',
    component: ModelTable,
  },
  {
    path: '/model/:id',
    name: 'ModelDetail',
    component: ModelDetail,
  },
  {
    path: '/summary',
    name: 'Summary',
    component: Summary,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
