import Config from './config/config.js';
import Logger from './lib/logger.js';
import Server from './server.js';
import Manager from './manager.js';


/**
  * Class representing the app
  * @class App
  */
class App {
  private server;
  private logger;
  private log;
  private config;
  private cache;
  private queueManager;
  private queueService: any;

  constructor() {
    this.logger = {};
    this.log = {};
  }

  // ****************************************************************************
  //  Application Shutdown Logic
  // ***************************************************************************/
  private handleSIGTERM(): void {
    this.close(15);
    return;
  }

  private handleSIGINT(): void {
    this.close(2);
    return;
  }

  private close(code): void {
    let sigCode;
    code = code || 0;
    switch (code) {
      case 2:
        sigCode = 'SIGINT';
        break;
      case 15:
        sigCode = 'SIGTERM';
        break;
      default:
        sigCode = code;
        break;
    }

    // Perform gracful shutdown here
    this.log.info(`Received exit code ${sigCode}, performing graceful shutdown`);
    if (!this?.server && !(this.server)) {
      this.server.close();
    }
    // Shutdown the server
    // End the process after allowing time to close cleanly
    setTimeout(
      (errCode) => {
        process.exit(errCode);
      },
      Config.server.shutdownTime,
      code
    );
    return;
  }

  private async setupLogging(): Promise<void> {
    this.logger = new Logger(Config);
    this.log = this.logger.log;
    return;
  }

  // ****************************************************************************
  // Server Initialization Logic
  // ***************************************************************************/
  private async setupCaches(): Promise<void> {
  }    

  // ****************************************************************************
  // Application Initialization Logic
  // ***************************************************************************/
  public async init(): Promise<void> {
    // Setup graceful exit for SIGTERM and SIGINT
    process.on('SIGTERM', this.handleSIGTERM.bind(this));
    process.on('SIGINT', this.handleSIGINT.bind(this));


    // Start Logging
    await this.setupLogging();
    
    // Start Cache
    await this.setupCaches();

    // Create and start queue manager
    // TODO: Add some magic that loads the configuration to the database.
    this.queueManager = new Manager({ queueConfigs: []}, this.queueService);

    // TODO: Add a longrunning interval time that periodically pushes the current configuration and state back to a database.
    
    // Hoist HTTP REST server
    this.server = new Server(Config, this.logger, this.queueManager);
    this.server.init();    
    return;
  }
}

// Prevent application from simply dying on uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(err);
});

// Extend stacktrace outputs in non-production environments
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'prod') {
  Error.stackTraceLimit = Infinity;
}

const app = new App();
app.init();
