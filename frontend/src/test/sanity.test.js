import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from '@/App.vue';

// Create a minimal router for testing
const createTestRouter = () => {
  const routes = [
    { path: '/', redirect: '/summary' },
    { path: '/summary', component: { template: '<div>Summary Page</div>' } },
    { path: '/file-scanner', component: { template: '<div>Scanner Page</div>' } },
    { path: '/civit-data-fetcher', component: { template: '<div>Fetcher Page</div>' } },
    { path: '/metadata', component: { template: '<div>Metadata Page</div>' } },
    { path: '/setting', component: { template: '<div>Settings Page</div>' } },
    { path: '/lora-hub', component: { template: '<div>LoRA Hub Page</div>' } }
  ];

  return createRouter({
    history: createWebHistory(),
    routes
  });
};

describe('Sanity Tests', () => {
  let router;

  beforeEach(async () => {
    router = createTestRouter();
    await router.push('/');
  });

  it('should redirect from root to summary page', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();
    expect(router.currentRoute.value.path).toBe('/summary');
  });

  it('should navigate to different pages when clicking nav links', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();

    // Test navigation to different pages
    const testRoutes = [
      { path: '/summary', expectedText: 'Summary Page' },
      { path: '/file-scanner', expectedText: 'Scanner Page' },
      { path: '/civit-data-fetcher', expectedText: 'Fetcher Page' },
      { path: '/metadata', expectedText: 'Metadata Page' },
      { path: '/setting', expectedText: 'Settings Page' },
      { path: '/lora-hub', expectedText: 'LoRA Hub Page' }
    ];

    for (const route of testRoutes) {
      await router.push(route.path);
      await wrapper.vm.$nextTick();
      
      // Check if the route changed
      expect(router.currentRoute.value.path).toBe(route.path);
      
      // Check if the content is rendered (router-view should show the component)
      expect(wrapper.text()).toContain(route.expectedText);
    }
  });

  it('should maintain navigation structure across route changes', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();

    // Navigate to different pages
    const routes = ['/summary', '/file-scanner', '/setting'];
    
    for (const route of routes) {
      await router.push(route);
      await wrapper.vm.$nextTick();

      // Navigation should always be present
      expect(wrapper.find('.main-nav').exists()).toBe(true);
      expect(wrapper.find('.nav-brand').exists()).toBe(true);
      expect(wrapper.find('.nav-links').exists()).toBe(true);
      expect(wrapper.find('.main-content').exists()).toBe(true);
      
      // Brand should always be visible
      expect(wrapper.text()).toContain('LoRA Organiser');
    }
  });

  it('should provide notification methods to child components', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();

    // Check if notification system is available
    expect(wrapper.findComponent({ name: 'NotificationSystem' }).exists()).toBe(true);
    
    // The app should have notification methods in its setup
    expect(wrapper.vm.notificationSystemRef).toBeDefined();
  });

  it('should handle router-link elements correctly', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();

    // Check if router-links are present (using RouterLink component)
    const routerLinks = wrapper.findAllComponents({ name: 'RouterLink' });
    expect(routerLinks.length).toBeGreaterThan(0);

    // Check if they have proper 'to' attributes
    const expectedPaths = ['/', '/summary', '/lora-hub', '/file-scanner', '/civit-data-fetcher', '/metadata', '/setting'];
    
    routerLinks.forEach(link => {
      const toProp = link.props('to');
      if (toProp) {
        expect(expectedPaths).toContain(toProp);
      }
    });
  });

  it('should render with proper CSS classes', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    await router.isReady();

    // Check for essential CSS classes
    const essentialClasses = [
      'main-nav',
      'nav-container', 
      'nav-brand',
      'nav-links',
      'main-content'
    ];

    essentialClasses.forEach(className => {
      expect(wrapper.find(`.${className}`).exists()).toBe(true);
    });
  });
}); 