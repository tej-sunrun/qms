enum RateLimitDuration {
    Second,
    Minute,
    Hour,
    Day,
};

interface RateLimitConfig {
    frequency: number;
    rate: RateLimitDuration;
};

interface RateLimitConfigDeserialized {
    frequency: number;
    rate: string;
};

const RateMap = {
    [RateLimitDuration.Day]: { value: 86400000, str: 'day' },
    [RateLimitDuration.Hour]: { value: 3600000, str: 'hour' },
    [RateLimitDuration.Minute]: { value: 60000, str: 'minute' },
    [RateLimitDuration.Second]: { value: 1000, str: 'second' },
}

const RateNameMap = {
    day: RateLimitDuration.Day,
    hour: RateLimitDuration.Hour,
    minute: RateLimitDuration.Minute,
    second: RateLimitDuration.Second,
}

class RateLimitUtil {
    public static lookupRate(rate: string) {
        return RateNameMap?.[rate];       
    }

    public static lookupName(rate: RateLimitDuration) {
        return RateMap?.[rate].str;
    }    

    public static calculateEffectiveRate(configs: RateLimitConfig[]) {
        let rate = 0;
        let frequency = 1;
        let effectiveRate = Number.POSITIVE_INFINITY;
        for (const config of configs) {
            const rateVale = RateMap[config.rate].value;
            const calcEffRate = config.frequency / rateVale;
            if (calcEffRate < effectiveRate) {
                effectiveRate = calcEffRate;
                frequency = config.frequency;
                rate = RateMap[config.rate].value;
            }
        }
        return { frequency, rate };
    }

    public static deserializeRateLimit(rateLimitObj: RateLimitConfigDeserialized): RateLimitConfig {
        return {
            frequency: rateLimitObj.frequency,
            rate: RateLimitUtil.lookupRate(rateLimitObj.rate)
        };
    }

    public static serializeRateLimit(rateLimit: RateLimitConfig): RateLimitConfigDeserialized {
        return {
            frequency: rateLimit.frequency,
            rate: RateLimitUtil.lookupName(rateLimit.rate)
        };
    }    
}

export default RateLimitUtil;
export { RateLimitConfig, RateLimitConfigDeserialized, RateLimitDuration, RateMap, RateNameMap };