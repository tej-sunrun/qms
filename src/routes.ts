import { Router } from 'express';
import ManagerController from './controllers/manager.js';

function handleRoutes(app: Router, controller: ManagerController) {
    app.post('/queue', controller.createQueue.bind(controller));
    app.get('/queue', controller.getQueue.bind(controller));
    app.patch('/queue', controller.updateQueue.bind(controller));
    app.delete('/queue', controller.deleteQueue.bind(controller));
    app.get('/queue/search', controller.findQueue.bind(controller));
    app.post('/queue/{id}/drain', controller.drainQueue.bind(controller));
    app.get('/queue/{id}/tasks', controller.getQueueTasks.bind(controller));
    app.post('/queue/{id}/pause', controller.pauseQueue.bind(controller));
    app.post('/queue/{id}/unpause', controller.unpauseQueue.bind(controller));

    app.post('/task', controller.enqueueTask.bind(controller));
    app.get('/task/{id}', controller.getTask.bind(controller));
    app.patch('/task/{id}', controller.updateTask.bind(controller));
    app.delete('/task/{id}', controller.cancelTask.bind(controller));    

    app.post('/tasks', controller.enqueueTasks.bind(controller));
}

export default handleRoutes;