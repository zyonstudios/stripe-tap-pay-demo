module.exports = function configureMinSdkVersion(config) {
  config.android = config.android || {};
  config.android.minSdkVersion = 26;
  return config;
};
