module.exports = function configureMinSdkVersion(config) {
  config.android = config.android || {};
  config.android.minSdk = 26;
  return config;
};
