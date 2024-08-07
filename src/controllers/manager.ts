import Manager from "../manager.js";

class ManagerController {
    private manager: Manager;

    constructor(manager: Manager, logger) {
        this.manager = manager;
    }

    public async createQueue(req, res, next) {
    }

    public getQueue(req, res, next) {
    }

    public updateQueue(req, res, next) {
    }

    public deleteQueue(req, res, next) {
    }

    public findQueue(req, res, next) {
    }

    public drainQueue(req, res, next) {
    }

    public getQueueTasks(req, res, next) {
    }

    public pauseQueue(req, res, next) {

    }

    public unpauseQueue(req, res, next) {

    }

    private buildJobDetails(payload, callId: string) {
       
    }

    public async enqueueTask(req, res, next) {
    }

    public async enqueueTasks(req, res, next) {
    }

    public getTask(req, res, next) {

    }

    public updateTask(req, res, next) {

    }    

    public cancelTask(req, res, next) {

    }
}

export default ManagerController;
