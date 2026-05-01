export const QUEUES = {
    NOTIFICATION:'notification',
    PAYMENT:'payment',
    DB_UPADATE:'db.update',
    ELECTRICITY_BILLINNG:'electricity_billing',
    COMMAND:"command",
    CACHE_INVALIDATION:'cache.invalidation',
    METRICS:'cache.metrics'
}

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]




