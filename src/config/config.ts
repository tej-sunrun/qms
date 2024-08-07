import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const Config = {
    server: {
      debug: true,
      port: 8080,
      shutdownTime: 1000,
      pollingTimer: 10000,
      namespace: '',
      timeout: 5,
      sslEnabled: true,
      sslPort: 8443,
      sslOnly: true,
      sslKey: `${__dirname}/ssl/localhost.key`,
      sslCert: `${__dirname}/ssl/localhost.pem`,
      hostWhitelist: [
        'localhost',
        'localhost:443',
        'localhost:8080',
        'localhost:8443',
        'localhost:8888',
        'localhost:9243',
        '127.0.0.1',
        '127.0.0.1:443',
        '127.0.0.1:8080',
        '127.0.0.1:8443',
        '127.0.0.1:8888',
        '127.0.0.1:9243'
      ]
    },
    logging: {
      // Logging Configuration
      logDir: './logs',
      options: { json: false, maxsize: '10000000', maxFiles: '10', level: 'silly', exitOnError: false },
      verbose: true
    },
    analytics: '',
    session: { expiration: 12 * 60 * 60 * 1000 }, // 12-hours in milliseconds
    credentials: {
      aws: {
        accessKeyId: null,
        secretAccessKey: null,
        region: null
      },
      datastore: {
        singlestore: {
          host: "localhost",
          user: "user",
          pass: "password",
          port: "3306",
          dbname: "test"
        }, //`${__dirname}/singlestore.credentials.json`,
      },
      redis: {
        host: "localhost",
        port: "6379"
      }, // `${__dirname}/redis.credentials.json`,
      sendgrid: null
    },
    connectionManager: { interval: 300000 },
    db: { pool: { max: 30, min: 1, idle: 10000 } },
    cache: {
      failover: true,
      ttl: 5,
      namespace: {
        sql: 'api-db',
        response: 'api-express',
        rateLimit: 'api-ratelimit',
        ipBlacklist: 'api-ipblacklist'
      }
    },
    rateLimit: {
      expire: 300000,
      total: 250,
      whitelist: [
        // Localhost
        '127.0.0.1',
        '::ffff:127.0.0.1',
        '::1',
      ]
    },
    ipBlacklist: {
      expire: 3600000,
      total: 10,
      whitelist: [
        // Localhost IPs
        '127.0.0.1',
        '::ffff:127.0.0.1',
        '::1',
      ],
      restrictedPaths: [
        /.*[Mm]y[Aa]dmin.*/,
        /.*[Ss][Qq][Ll].*/,
        /.*[Pp][Mm][Aa].*/,
        /.*[Dd][Bb].*/,
        /.*[Pp][Hh][Pp].*/,
        /.*[Aa]dministrator.*/,
        /.*[Dd][Aa][Tt][Aa][Bb][Aa][Ss][Ee].*/,
        /.*[Ff][Cc][Kk][Ee][Dd][Ii][Tt][Oo][Rr].*/,
        /.*manager.*/,
        /.*script.*/,
        /.*program.*/,
      ]
    },
    statsd: {
      host: '',
      port: 8125,
      name: 'sunrunQmsApi',
      attachHostName: true,
      telegraf: true,
      tags: ['appName:sunrunQmsApi-local']
    },
    sendgrid: { mock: true, test: true, testEmail: 'data-platform@sunrun.com', replyTo: 'noreply@sunrun.com' },
};

export default Config;