/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.{ts,tsx}',
  defaultStory: 'welcome--overview',
  addons: {
    a11y: { enabled: true },
    theme: { enabled: true, defaultState: 'light' },
    rtl: { enabled: false },
    width: {
      enabled: true,
      options: {
        mobile: 375,
        tablet: 768,
        desktop: 1280,
      },
      defaultState: 0,
    },
  },
};
