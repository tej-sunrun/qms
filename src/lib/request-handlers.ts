import url from 'node:url';

import { v7 as uuidv7 } from 'uuid';
import { formatISO, getUnixTime } from 'date-fns';
import omit from 'lodash.omit';

import constants from './constants.js';

class RequestHandlers {
    private hostname;
    private debugMode;
    private requestLog;
    private log;

    constructor(params) {
        this.hostname = params.hostname;
        this.debugMode = params?.debugMode;
        this.requestLog = params?.requestLog;
        this.log = params?.log;
    }

    attachCallId(req, res, next) {
        // Generate CallId attach to the request object
        const now = new Date();
        req.callId = uuidv7();
        req.time = formatISO(now);
        req.timestamp = getUnixTime(now);
        req.oshost = this.hostname;
        req.urlpath = url.parse(req.url).pathname;
        req.hasData = false;
        req.hasError = false;
        req.timedout = false;
        next();
    }
    
    flattenError(err) {
        if (err instanceof Error) {
            return JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        }
        return err;
    }

    normalizeError(err) {
        let retVal;
        if (err instanceof Error) {
            retVal = this.flattenError(err);
        } else {
            retVal = {
                message: err.msg ?? err.message ?? err.toString(),
                stack: err.stack ?? null,
                details: err.details
            };
        }
        return retVal;
    }

    getStatusCode(respCode) {
        const statusCode = parseInt(respCode.toString().padStart(6, '0').substr(0, 3));
        return statusCode;
    }

    setError(err, req, res) {
        const code = req.respCode ?? 501000;
        const errorBlock = { 
            message: err.message,
            details: undefined,
            stack: undefined,
        };
        if (err) {
            const errDetails = this.normalizeError(err);
            errorBlock.details = errDetails.details ?? errDetails.message;
            if (this.debugMode) {
                errorBlock.stack = errDetails.stack;
            }
        }
        req.hasError = true;
        req.error = errorBlock;
        req.respCode = code;
        this.setResponse(req, res);
    }
    
    setResponse(req, res) {
        const code = req.respCode ?? 200000;
        const statusCode = this.getStatusCode(code);
        const respInfo = ''   
        const respBlock = {
            respCode: code,
            status: statusCode,
            callId: req.callId,
            time: req.time,
            timestamp: req.timestamp,
            server: req.oshost,
            ip: req.ip,
            ipForwarding: req.ips,
            data: req?.data ?? undefined,
            count: req?.count ?? undefined,
            totalCount: req?.totalCount ?? undefined,
            error: req?.error ?? undefined
        };
        res.locals.status = statusCode;
        res.locals.body = respBlock; 
    }

    sendResponse(req, res, next) {
        this.setResponse(req, res);
        if (!res.headersSent) {
            for (const header in res.locals.headers) {
                if (Object.prototype.hasOwnProperty.call(res.locals.headers, header)) {
                    res.header(header, res.locals.headers[header]);
                }
            }
            res.status(res.locals.status);
            const bodyData = omit(res.locals.body, ['cacheExpiration']);
            switch (req.outputMode) {
                case 'json':
                default: {
                    res.set('Content-Type', 'application/json');
                    res.json(bodyData);
                    break;
                }
            }

            const code = req.respCode ?? 200000;
            if (code === 200000) {
            const respMsg = {
                mode: req.outputMode,
                status: res.locals.status,
                respCode: code,
                protocol: req.secure ? 'HTTPS' : 'HTTP',
                method: req.method,
                endpoint: req.urlpath,
                actualIP: req.connection.remoteAddress,
                ip: req.headers['x-forwarded-for'] ?? req.connection.remoteAddress,
                callId: req.callId,
                server: req.oshost,
                apiKey: req.apiKey,
                secret: req.hasSecret,
                params: req.locals,
                headers: req.headers,
                performance: { response: req.timers.response, route: req.timers.route, respCache: req.timers.respCache },
                cache: { response: { needs: req.needsCache, used: req.usedCache, key: req.cacheKey } },
                body: JSON.stringify(bodyData)
            };
            this.requestLog.info(respMsg);
            }
        }
        next();
    }

    errorHandler(err, req, res, next) {
        this.log.debug('Error Handler');
        this.setError(err, req, res);
        const errorMsg = {
          mode: req.outputMode,
          status: res.locals.status,
          respCode: req.respCode ?? 200000,
          protocol: req.secure ? 'HTTPS' : 'HTTP',
          method: req.method,
          endpoint: req.urlpath,
          actualIP: req.connection.remoteAddress,
          ip: req.headers['x-forwarded-for'] ?? req.connection.remoteAddress,
          callId: req.callId,
          server: req.oshost,
          apiKey: req.apiKey,
          secret: req.hasSecret,
          params: req.locals,
          headers: req.headers,
          performance: { response: req.timers.response, route: req.timers.route, respCache: req.timers.respCache },
          cache: { response: { needs: req.needsCache, used: req.usedCache, key: req.cacheKey } },
          error: err
        };
        this.requestLog.error(errorMsg);
        next();
    }
    
    responseHandler(req, res, next) {
        this.log.debug('Response Handler');
        if (req.hasData === true && req.data) {
          this.setResponse(req, res);
        }
        next();
    }
    
    handle404Error(req, res, next) {
        if (!req.hasData && !req.hasError) {
            req.respCode = 404000;
            req.hasError = true;
            next(constants.errorMessages.MISSING_ENDPOINT);
        } else {
            next();
        }
    }
    
    timeoutHandler(req, res, next) {
        if (req.timedout) {
            req.respCode = 408000;
            req.hasError = true;
            next(constants.errorMessages.REQUEST_TIMEOUT);
        } else {
            next();
        }
    }       
}

export default RequestHandlers;