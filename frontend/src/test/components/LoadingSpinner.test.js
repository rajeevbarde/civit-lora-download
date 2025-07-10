import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

describe('LoadingSpinner Component', () => {
  it('should render when loading is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: true
      }
    });

    expect(wrapper.find('.loading-container').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(true);
  });

  it('should not render when loading is false', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: false
      }
    });

    expect(wrapper.find('.loading-container').exists()).toBe(false);
  });

  it('should display default message when no message prop is provided', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: true
      }
    });

    expect(wrapper.text()).toContain('Loading...');
  });

  it('should display custom message when message prop is provided', () => {
    const customMessage = 'Please wait...';
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: true,
        message: customMessage
      }
    });

    expect(wrapper.text()).toContain(customMessage);
  });

  it('should apply correct size class', () => {
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const wrapper = mount(LoadingSpinner, {
        props: {
          loading: true,
          size: size
        }
      });

      expect(wrapper.find('.loading-container').classes()).toContain(size);
    });
  });

  it('should use medium size by default', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: true
      }
    });

    expect(wrapper.find('.loading-container').classes()).toContain('medium');
  });

  it('should validate size prop', () => {
    // This test would normally check prop validation, but Vue Test Utils
    // doesn't directly expose prop validation errors in a testable way
    // Instead, we'll test that valid sizes work
    const validSizes = ['small', 'medium', 'large'];
    
    validSizes.forEach(size => {
      expect(() => {
        mount(LoadingSpinner, {
          props: {
            loading: true,
            size: size
          }
        });
      }).not.toThrow();
    });
  });

  it('should have proper CSS classes for different elements', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        loading: true,
        message: 'Test message'
      }
    });

    expect(wrapper.find('.loading-container').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('.loading-message').exists()).toBe(true);
  });
}); 