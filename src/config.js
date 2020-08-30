var convict = require('convict');

// Schema with defined values -- file should be excluded from uploads
var config = convict({
    env: {
      doc: 'The application environment.',
      format: ['production', 'development', 'test'],
      default: 'development',
      env: 'NODE_ENV'
    },
    user: {
      format: '*',
      default: 'stwh.data@scilabs.de',
      sensitive: true
    },
    password: {
      format: '*',
      default: 'LoiB8V62sJ6Y3HLfL3X2',
      sensitive: true
    },
    host: {
      format: '*',
      default: 'imap.scilabs.de'
    },
    port: {
      doc: 'The port to bind.',
      format: 'port',
      default: 993
    }
  });
  
  export default config;