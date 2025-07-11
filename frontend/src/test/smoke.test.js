import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from '@/App.vue';

// Create a minimal router for testing
const createTestRouter = () => {
  const routes = [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/summary', component: { template: '<div>Summary</div>' } },
    { path: '/file-scanner', component: { template: '<div>Scanner</div>' } },
    { path: '/civit-data-fetcher', component: { template: '<div>Fetcher</div>' } },
    { path: '/metadata', component: { template: '<div>Metadata</div>' } },
    { path: '/setting', component: { template: '<div>Settings</div>' } },
    { path: '/lora-hub', component: { template: '<div>LoRA Hub</div>' } }
  ];

  return createRouter({
    history: createWebHistory(),
    routes
  });
};

describe('Smoke Tests', () => {
  let router;

  beforeEach(() => {
    router = createTestRouter();
  });

  it('should mount the App component without crashing', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('#app').exists()).toBe(true);
  });

  it('should render the navigation menu', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    // Check if navigation exists
    expect(wrapper.find('.main-nav').exists()).toBe(true);
    expect(wrapper.find('.nav-brand').exists()).toBe(true);
    expect(wrapper.find('.nav-links').exists()).toBe(true);

    // Check if brand text is present
    expect(wrapper.text()).toContain('LoRA Organiser');
  });

  it('should have all navigation links', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    const expectedLinks = [
      'Summary',
      'LoRA Hub', 
      'Scanner',
      'Orphan LoRA',
      'Metadata',
      'Setting'
    ];

    expectedLinks.forEach(linkText => {
      expect(wrapper.text()).toContain(linkText);
    });
  });

  it('should render main content area', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.find('.main-content').exists()).toBe(true);
  });

  it('should include notification system', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.findComponent({ name: 'NotificationSystem' }).exists()).toBe(true);
  });

  it('should include error boundary', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.findComponent({ name: 'ErrorBoundary' }).exists()).toBe(true);
  });
}); 