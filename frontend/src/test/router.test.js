import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import router from '@/router';

describe('Router Configuration', () => {
  let testRouter;

  beforeEach(() => {
    // Create a fresh router instance for each test
    testRouter = createRouter({
      history: createWebHistory(),
      routes: router.options.routes
    });
  });

  it('should have all required routes defined', () => {
    const routes = testRouter.getRoutes();
    
    const expectedRoutes = [
      { path: '/', name: undefined },
      { path: '/model/:modelId/:modelVersionId', name: 'ModelDetail' },
      { path: '/summary', name: 'LoRASummary' },
      { path: '/file-scanner', name: 'LoRAScanner' },
      { path: '/civit-data-fetcher', name: 'CivitDataFetcher' },
      { path: '/metadata', name: 'Metadata' },
      { path: '/setting', name: 'Setting' },
      { path: '/lora-hub', name: 'ModelTable' }
    ];

    expectedRoutes.forEach(expectedRoute => {
      const foundRoute = routes.find(route => route.path === expectedRoute.path);
      expect(foundRoute).toBeDefined();
      
      if (expectedRoute.name) {
        expect(foundRoute.name).toBe(expectedRoute.name);
      }
    });
  });

  it('should redirect root path to summary', async () => {
    await testRouter.push('/');
    await testRouter.isReady();
    
    expect(testRouter.currentRoute.value.path).toBe('/summary');
  });

  it('should handle dynamic routes with parameters', () => {
    const routes = testRouter.getRoutes();
    const modelDetailRoute = routes.find(route => route.path === '/model/:modelId/:modelVersionId');
    
    expect(modelDetailRoute).toBeDefined();
    expect(modelDetailRoute.name).toBe('ModelDetail');
    expect(modelDetailRoute.path).toBe('/model/:modelId/:modelVersionId');
  });

  it('should have proper route names', () => {
    const routes = testRouter.getRoutes();
    
    const routeNames = routes
      .filter(route => route.name)
      .map(route => route.name);
    
    const expectedNames = [
      'ModelDetail',
      'LoRASummary', 
      'LoRAScanner',
      'CivitDataFetcher',
      'Metadata',
      'Setting',
      'ModelTable'
    ];

    expectedNames.forEach(name => {
      expect(routeNames).toContain(name);
    });
  });

  it('should have components defined for all routes', () => {
    const routes = testRouter.getRoutes();
    
    routes.forEach(route => {
      if (route.path !== '/') { // Skip redirect route
        // Check if component exists (either as component or as redirect)
        // Some routes might be lazy-loaded or have other configurations
        const hasComponent = route.component || route.redirect || route.children;
        expect(hasComponent).toBeTruthy();
      }
    });
  });

  it('should handle navigation to valid routes', async () => {
    const testRoutes = [
      '/summary',
      '/file-scanner', 
      '/civit-data-fetcher',
      '/metadata',
      '/setting',
      '/lora-hub'
    ];

    for (const routePath of testRoutes) {
      await testRouter.push(routePath);
      await testRouter.isReady();
      
      expect(testRouter.currentRoute.value.path).toBe(routePath);
    }
  });

  it('should handle dynamic route navigation', async () => {
    const modelId = '123';
    const modelVersionId = '456';
    const dynamicPath = `/model/${modelId}/${modelVersionId}`;
    
    await testRouter.push(dynamicPath);
    await testRouter.isReady();
    
    expect(testRouter.currentRoute.value.path).toBe(dynamicPath);
    expect(testRouter.currentRoute.value.params.modelId).toBe(modelId);
    expect(testRouter.currentRoute.value.params.modelVersionId).toBe(modelVersionId);
  });
}); 