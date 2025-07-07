import { createRouter, createWebHistory } from 'vue-router';
import ModelTable from '../pages/ModelTablePage.vue';
import ModelDetail from '../pages/ModelDetailPage.vue';
import LoRASummary from '../pages/SummaryPage.vue';
import LoRAScanner from '../pages/FileScannerPage.vue';
import CivitDataFetcher from '../pages/CivitDataFetcherPage.vue';
import Setting from '../pages/SettingPage.vue';

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
    path: '/setting',
    name: 'Setting',
    component: Setting,
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
