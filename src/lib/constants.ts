const constants = {
    cache: {
        BASENAME: 'sunrun-qms',
        DATABASE: 'db',
        RESPONSE: 'response',
        RATE_LIMIT: 'ratelimit',
        IP_BLACKLIST: 'ipblacklist',
    },
    errorMessages: {
        MISSING_ENDPOINT: 'Endpoint not found',
        REQUEST_TIMEOUT: 'Request timed out',
    }
}
Object.freeze(constants);

export default constants;