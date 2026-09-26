const envFile = process.env.ENVFILE || '.env';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: envFile,
      blacklist: null,
      whitelist: null,
      safe: false,
      allowUndefined: true,
    }]
  ]
};