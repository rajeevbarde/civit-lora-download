import { createRouter, createWebHistory } from 'vue-router';
import ModelTable from '../components/ModelTable.vue';
import ModelDetail from '../components/ModelDetail.vue';
import Summary from '../components/Summary.vue';
import FileScanner from '../components/FileScanner.vue';

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
  },
  {
    path: '/file-scanner',
    name: 'FileScanner',
    component: FileScanner,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
