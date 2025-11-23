module.exports = function (config) {
  if (!config.android) config.android = {};
  config.android.minSdkVersion = 26;
  return config;
};
