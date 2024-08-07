import winston from 'winston';
import { format } from 'winston';
import assign from 'lodash.assign'
import fs from 'node:fs';
import util from 'node:util';
import EventEmitter from 'node:events';

class Logger extends EventEmitter {
  private loggers;
  private loggingConfig;
  private logDir;
  private log;
  private requestLog;
  private options;

  constructor(config = { logging: {} }) {
    super();
    const defaultLogging = {
      logDir: './logs',
      options: {},
      verbose: false
    };
    this.loggingConfig = assign({}, defaultLogging, config?.logging ?? {});
    this.logDir = this.loggingConfig .logDir || './logs';        

    const transports = [];
    // Optimization -- Add console logging and debug file if not in production
    const env = process.env.NODE_ENV;
    //if (env !== 'production' && env !== 'test') {
      const lvl = (this.loggingConfig.verbose) ? 'silly' : 'debug';
      transports.push(
        new winston.transports.Console(
          {
            level: lvl,
            format: format.printf(this.formatter)
          }
        )
      );
      transports.push(new winston.transports.File({
        filename: `${this.logDir}/debug.log`,
        level: 'debug',
        format: format.printf(this.formatter)
      }));
    //}
    transports.push(new winston.transports.File({
      filename: `${this.logDir}/info.log`,
      level: 'info',
      format: format.printf(this.formatter)
    }));
    transports.push(new winston.transports.File({
      filename: `${this.logDir}/error.log`,
      level: 'error',
      format: format.printf(this.formatter)
    }));    

    // Merge options from config into this object
    this.options = assign(this.options, this.loggingConfig.options);
    this.options.exitOnError = false;
    this.options.transports = transports.slice(0);

    // Create log folder if it does not already exist
    if (!fs.existsSync(this.loggingConfig.logDir)) {
      console.log('Creating log folder');
      fs.mkdirSync(this.loggingConfig.logDir);
    }
    
    this.loggers = new winston.Container();
    this.loggers.add('default', this.options);
    this.loggers.add('requests', this.options);
    this.log = this.loggers.get('default');
    this.addBetterLoggingMixins(this.log);
    this.requestLog = this.loggers.get('requests');
    this.addBetterLoggingMixins(this.requestLog);    
    //this.emit('connected-logger');
  }

  // Adds Mixin replacement to strip logs which contain empty string or objects
  addBetterLoggingMixins(log) {
    log.oldSilly = log.silly;
    log.oldInfo = log.info;
    log.oldDebug = log.debug;
    log.oldWarn = log.warn;
    log.oldError = log.error;
    log.genLog = ((replaceFn, ...params) => {
      if (params[0]) {
        const data = Object.assign({}, params[0]);
        if (typeof params[0] !== 'string') {
          if (params[0] instanceof Error) {
            params[0] = JSON.stringify(params[0], Object.getOwnPropertyNames(params[0]));
          } else {
            params[0] = JSON.stringify(params[0]);
          }
        }
        if (data !== '{}' && data !== '') {
          replaceFn(...params);
        }
      }
    });
    log.silly = ((...params) => {
      log.genLog(log.oldSilly, ...params);
    });
    log.info = ((...params) => {
      log.genLog(log.oldInfo, ...params);
    });
    log.debug = ((...params) => {
      log.genLog(log.oldDebug, ...params);
    });
    log.warn = ((...params) => {
      log.genLog(log.oldWarn, ...params);
    });
    log.error = ((...params) => {
      log.genLog(log.oldError, ...params);
    });
  }  

  formatter(options): string {
    let message = options.message;
    if (!message) {
      message = JSON.parse(options[Symbol.for('message')])['@message'];
    }
    return `${new Date().toISOString()} [${options.level.toUpperCase()}]: ${message}`;
  }

  lokiFormatter(options): string {
    let message = options.message;
    if (!message) {
      message = JSON.parse(options[Symbol.for('message')])['@message'];
    }
    const out = {};
    out['@message'] = message;
    out['@timestamp'] = new Date().toISOString();
    out['@fields'] = options;
    let outstr: string;
    try {
      outstr = JSON.stringify(out);
    } catch {
      outstr = util.inspect(out, { depth: null });
    }
    return outstr;
  }

  handleError(err) {
    if (this.log) {
      this.log.error(err);
    }
  }  
}

export default Logger;