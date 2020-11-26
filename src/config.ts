import convict from 'convict';

const config = convict({
  imap: {
    user: {
      doc: 'IMAP user',
      format: String,
      env: 'SCILABS_IMAP_USER',
      default: '',
    },
    password: {
      doc: 'IMAP password',
      format: String,
      env: 'SCILABS_IMAP_PASSWORD',
      default: '',
      sensitive: true,
    },
    host: {
      doc: 'IMAP host',
      format: String,
      env: 'SCILABS_IMAP_HOST',
      default: '',
    },
    port: {
      doc: 'IMAP port',
      format: 'port',
      env: 'SCILABS_IMAP_PORT',
      default: 993,
    },
    tls: {
      doc: 'IMAP TLS active',
      format: Boolean,
      env: 'SCILABS_IMAP_TLS',
      default: true,
    },
    markSeen: {
      doc: 'Mark processed mails as seen',
      format: Boolean,
      env: 'SCILABS_IMAP_MARK_SEEN',
      default: false,
    },
  },

  database: {
    database: {
      doc: 'DB name',
      format: String,
      env: 'SCILABS_DB_NAME',
      default: '',
    },
    user: {
      doc: 'DB user',
      format: String,
      env: 'SCILABS_DB_USER',
      default: '',
    },
    password: {
      doc: 'DB password',
      format: String,
      env: 'SCILABS_DB_PASSWORD',
      default: '',
      sensitive: true,
    },
    host: {
      doc: 'DB host',
      format: String,
      env: 'SCILABS_DB_HOST',
      default: '',
    },
    port: {
      doc: 'DB port',
      format: 'port',
      env: 'SCILABS_DB_PORT',
      default: 5432,
    },
    connectionMilliseconds: {
      doc: 'Milliseconds connection',
      format: Number,
      env: 'SCILABS_DB_MILLISECONDS',
      default: 2000,
    },
  },
});

config.validate({ allowed: 'strict' });

export default config;
