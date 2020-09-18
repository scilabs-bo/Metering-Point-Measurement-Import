import convict from 'convict';

const config = convict({
  imap: {
    user: {
      doc: 'IMAP user',
      format: String,
      env: 'SCILABS_IMAP_USER',
      default: ''
    },
    password: {
      doc: 'IMAP password',
      format: String,
      env: 'SCILABS_IMAP_PASSWORD',
      default: '',
      sensitive: true
    },
    host: {
      doc: 'IMAP host',
      format: String,
      env: 'SCILABS_IMAP_HOST',
      default: ''
    },
    port: {
      doc: 'IMAP port',
      format: 'port',
      env: 'SCILABS_IMAP_PORT',
      default: 993
    },
    tls: {
      doc: 'IMAP TLS active',
      format: Boolean,
      env: 'SCILABS_IMAP_TLS',
      default: true
    }
  }
});

config.loadFile('src/development.json');
config.validate({ allowed: 'strict' });

export default config;