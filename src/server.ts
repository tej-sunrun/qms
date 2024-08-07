import http from 'node:http';
import https from 'node:https';
import os from 'node:os';

import express from 'express';
import timeout from 'connect-timeout';
import cors from 'cors';
import multer from 'multer';
import bodyParser from 'body-parser';

import RequestTimer from './lib/request-timers.js';
import RequestHandlers from './lib/request-handlers.js';
import Manager from './manager.js';
import ManagerController from './controllers/manager.js';
import constants from './lib/constants.js';
import handleRoutes from './routes.js';

const router = express.Router;

class Server {
  private app;
  private httpServer;
  private httpsServer;
  private hostname: string;
  private port: number;
  private logger;
  private isActive: boolean;
  private timeout: number
  private sslOnly: boolean;
  private sslEnabled: boolean;
  private sslCert;
  private sslKey;
  private sslPort;
  private log
  private requestLog;
  private config;
  private cache
  private responseCache;
  private cacheNamespaces;
  private router;
  private manager;
  private managerController;
  private requestHandler;

  constructor(config, logger, manager: Manager) {
    this.app = express();
    // Setup Express
    this.httpServer = null;
    this.httpsServer = null;
    this.config = config;
    this.hostname = process.env.HOST ?? config?.server?.hostname ?? os.hostname ?? 'localhost';

    // Set the server base configuration
    this.isActive = false;
    this.port = process.env.PORT ? Number(process.env.PORT) : config?.server?.port ?? 8080;  

    // Configure the server timeout mechanic
    this.timeout = config.server.timeout ?? 5;

    this.logger = logger;
    this.log = this.logger.log;

    // this.requestLog = this.logger.requestLog;
    this.router = {};
    this.manager = manager;
    
    this.managerController = new ManagerController(this.manager, this.logger);
    
    // const env = process.env.NODE_ENV ?? 'local';
    // const baseNamespace = `${cache.BASENAME}-${env}`;
    // this.cacheNamespaces = {
    //   response: config.cache.namespace.response ?? `${baseNamespace}-${cache.RESPONSE}`,
    //   sql: config.cache.namespace.sql ?? `${baseNamespace}-${cache.DATABASE}`,
    //   ratelimit: config.cache.namespace.rateLimit ??  `${baseNamespace}-${cache.RATE_LIMIT}`,
    //   ipBlacklist: config.cache.namespace.ipBlacklist ??  `${baseNamespace}-${cache.IP_BLACKLIST}`,
    // };    
    // this.responseCache = null;
  } 

  // ****************************************************************************
  //  Server Shutdown Logic
  // ***************************************************************************/
  public async close(): Promise<void> {
    // Perform gracful shutdown here
    if (this.cache) {
      this.log.debug('Closing connection to Cache');
      await this.cache.close()
    }

    if (this.httpServer) {
      this.log.debug('Shutting down HTTP listener');
      this.httpServer.close();
    }

    if (this.httpsServer) {
      this.log.debug('Shutting down HTTPS listener');
      this.httpsServer.close();
    }
    this.isActive = false;
    return;
  }  

  // ****************************************************************************
  //  Core Middleware functions
  // ***************************************************************************/
  stopAllTimers(req, res, next) {
    RequestTimer.stopTimers(req, 'route', 'response', 'responseCache');
    next();
  }

  // Setups the Cache bypass
  cacheBypassHandler(req, res, next) {
    if (req.headers['cache-control'] && req.headers['cache-control'] === 'no-cache') {
      req.bypassCache = true;
    }
    next();
  }

  // Returns headers needed for proper Cross-Origin Resource Sharing
  // This is needed so browsers applications can properly request data
  handleCORSHeaders(req, res, next) {
    if (!res.locals.headers) {
      res.locals.headers = {};
    }
    res.locals.headers['Access-Control-Allow-Origin'] = '*';
    res.locals.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, PUT, OPTIONS';
    res.locals.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
    next();
  }  

  /* =========================================================================
   * This initializes the express request stack which causes each request to
   * be routed through the each of the following app.* methods below. Requests
   * are passed through each app.* method in the order they are declared below
   * and continue through to the next method as long as the 'next' method is
   * invoked within the handler. If a response has been sent then 'next'
   * should not be invoked.
   * ========================================================================*/
  private setupServer(app) {
    this.log.debug('Starting server');
    this.router = router();
    this.requestHandler = new RequestHandlers({
      hostname: this.hostname,
      debugMode: this?.config?.server?.debug ?? false,
      requestLog: this.requestLog,
      log: this.log,
    });

    app.use(this.cacheBypassHandler.bind(this));

    this.router = router();
    app.use(RequestTimer.initialize('response', 'route', 'respCache'));

    // Start Metrics Gathering on Response processing
    app.use(RequestTimer.start('response'));
    // app.use(timeout(`${this.timeout}s`));

    // configure app to use bodyParser()
    // this will let us get the data from a POST x-www-form-urlencode
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // configure app to use multer()
    // this will let us get the data from multipart/form-data
    app.use(multer().array());

    // Handle CORS requests
    app.use(this.handleCORSHeaders.bind(this));
    app.options('*', cors({ origin: true, method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));

    // bind middleware to use for all requests
    // The 'bind' statements are there to preserve the scope of this class
    app.use(this.requestHandler.attachCallId.bind(this.requestHandler));

    // Setup the base server application namespace, if it has one
    // This is '/site' in local testing
    if (this.config?.server?.namespace) {
      app.use(this.config.server.namespace, this.router);
    }

    // Setup Routes here
    handleRoutes(app, this.managerController);

    // middleware for general handling of route responses
    //app.use(this.requestHandler.timeoutHandler.bind(this.requestHandler));

    // no data from above routes -- 404 error
    app.use(this.requestHandler.handle404Error.bind(this.requestHandler));

    // Stop Metrics Gathering on Response processing
    app.use(this.stopAllTimers.bind(this));

    app.use(this.requestHandler.errorHandler.bind(this.requestHandler));
    app.use(this.requestHandler.responseHandler.bind(this.requestHandler));

    // For security, remove the 'x-powered-by: expressJS' header
    app.disable('x-powered-by');

    // Finally output response
    app.use(this.requestHandler.sendResponse.bind(this.requestHandler));

    // Start the HTTP server
    if (!this.sslOnly) {
      this.httpServer = http.createServer(app).listen(this.port);
      this.log.debug(`Listening for HTTP on port ${this.port}`);
    }

    // Start the HTTPS server
    if (this.sslEnabled) {
      this.httpsServer = https.createServer({ key: this.sslKey, cert: this.sslCert }, app).listen(this.sslPort);
      this.log.debug(`Listening for HTTPS on port ${this.sslPort}`);
    }    
  }

  public async init() {
    // Server is initialize asyncronously in order as events need to happen
    // This is to ensure that database and cache are completely setup before
    // the express stack (which is depenedent on them) is initialized
    try {
      //await this.setupDbConnections();
      this.setupServer(this.app);
      this.isActive = true;
    }
    catch (err) {
      this.log.error(err);
    }
  }  
}

export default Server;