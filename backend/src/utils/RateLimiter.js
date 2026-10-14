
class RateLimiter {
    constructor(limit, windowMs) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    allow(key) {
        const now = Date.now();
        const entry = this.requests.get(key);

        if (!entry || now >= entry.resetAt) {
            this.requests.set(key, {
                count: 1,
                resetAt: now + this.windowMs
            });
            return true;
        }

        if (entry.count >= this.limit) {
            return false;
        }

        entry.count++;
        return true;
    }

    remove(key) {
        this.requests.delete(key);
    }

    cleanup() {
        const now = Date.now();

        for (const [key, entry] of this.requests) {
            if (now >= entry.resetAt) {
                this.requests.delete(key);
            }
        }
    }
}

module.exports = RateLimiter;
