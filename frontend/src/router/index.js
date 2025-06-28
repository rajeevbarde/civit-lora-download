import { createRouter, createWebHistory } from 'vue-router';
import ModelTable from '../components/ModelTable.vue';
import ModelDetail from '../components/ModelDetail.vue';
import LoRASummary from '../components/Summary.vue';
import LoRAScanner from '../components/FileScanner.vue';
import CivitDataFetcher from '../components/CivitDataFetcher.vue';

const routes = [
  {
    path: '/',
    redirect: '/summary'
  },
  {
    path: '/model/:modelId/:modelVersionId',
    name: 'ModelDetail',
    component: ModelDetail,
  },
  {
    path: '/summary',
    name: 'LoRASummary',
    component: LoRASummary,
  },
  {
    path: '/file-scanner',
    name: 'LoRAScanner',
    component: LoRAScanner,
  },
  {
    path: '/civit-data-fetcher',
    name: 'CivitDataFetcher',
    component: CivitDataFetcher,
  },
  {
    path: '/lora-hub',
    name: 'ModelTable',
    component: ModelTable,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
