import RateLimitUtil from './rate-limit.js';
import { RateLimitConfig } from './rate-limit.js'

enum QueueMode {
    FIFO,
    Priority,
    Scheduled,
};

const QueueModeMap = {
    'fifo': QueueMode.FIFO,
    'priority': QueueMode.Priority,
    'scheduled': QueueMode.Scheduled,
}

interface QueueConfig {
    name: string;
    mode: QueueMode;
    rateLimits: RateLimitConfig[];
    workerTimeout?: number;
    batchSize?: number;
    useDeadLetter?: boolean;
    enablePriority?: boolean;
    enableScheduling?: boolean;
}

interface ManagerParameters {
    queueConfigs: QueueConfig[];
}

class Manager {
    private params: ManagerParameters;
    private queueMap = {};
    private queueServiceConnection;

    constructor(params: ManagerParameters, queueServiceConnection:any) {
        this.params = params;
        this.initQueues();
    }

    private getQueueByName(queueName: string, queueServiceConnection: any): any {
    }

    public static lookupMode(mode: string) {
        return QueueModeMap?.[mode];
    }  

    public static createProcessorConfigFromQueueConfig(config: QueueConfig): any {
        const effectiveRateLimit = RateLimitUtil.calculateEffectiveRate(config.rateLimits);

    }

    public async initQueues(): Promise<void> {
    };

    public async startQueue(queueName: string): Promise<void> {
    }

    public async stopQueue(queueName: string): Promise<void> {
    }    

    public async createQueue(queueConfig: QueueConfig): Promise<void> {
    };

    public async destroyQueue(queueName: string): Promise<void> {
    }

    public async drainQueue(queueName: string): Promise<void> {
    }

    public async pauseQueue(queueName: string): Promise<void> {
    }

    public async unpauseQueue(queueName: string): Promise<void> {
    }    

    public async enqueueJob(queueName: string, job: any): Promise<any> {
    }

    public async cancelJob(queueName: string, jobId: string): Promise<any> {}
}

export default Manager;