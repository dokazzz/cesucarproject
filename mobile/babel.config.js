module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated's plugin has to stay last in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};
