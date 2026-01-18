// ------------------------------------------------------------------------------
// RequestQueue.js
// Rate-limited request queue for external API calls
// Prevents overwhelming APIs with concurrent requests and provides controlled
// request pacing with configurable delays
// ------------------------------------------------------------------------------

const logger = require('./logger');

class RequestQueue {
    constructor(options = {}) {
        this.minDelay = options.minDelay || 100; // Minimum delay between requests (ms)
        this.maxConcurrent = options.maxConcurrent || 5; // Max concurrent requests
        this.name = options.name || 'RequestQueue';
        this.adaptive = options.adaptive !== false; // Enable adaptive rate limiting by default
        
        // Store initial values for adaptive scaling
        this.initialMinDelay = this.minDelay;
        this.initialMaxConcurrent = this.maxConcurrent;
        this.minAllowedDelay = Math.max(25, Math.floor(this.minDelay * 0.25)); // Can go down to 25% of initial (min 25ms)
        this.maxAllowedDelay = this.minDelay * 10; // Don't exceed 10x initial delay
        this.minAllowedConcurrent = 1;
        this.maxAllowedConcurrent = this.maxConcurrent * 4; // Can scale up to 4x initial
        
        this.queue = [];
        this.activeRequests = 0;
        this.lastRequestTime = 0;
        this.totalProcessed = 0;
        this.totalErrors = 0;
        
        // Progress tracking for large queues
        this.lastProgressLog = 0;
        this.progressInterval = 100; // Log every 100 requests
        this.queueStartTime = 0;
        this.peakQueueSize = 0;
        
        // Adaptive rate limiting tracking
        this.recentErrors = []; // Track recent errors with timestamps
        this.recentSuccesses = []; // Track recent successes
        this.windowSize = 100; // Consider last 100 requests for adaptation
        this.lastAdaptation = 0;
        this.adaptationInterval = 5000; // Adjust every 5 seconds at most
    }

    /**
     * Add a request to the queue
     * @param {Function} requestFn - Async function that performs the request
     * @param {Object} options - Optional metadata for logging
     * @returns {Promise} Resolves with the request result
     */
    async enqueue(requestFn, options = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                requestFn,
                resolve,
                reject,
                metadata: options.metadata || {},
                addedAt: Date.now()
            });
            
            // Track peak queue size and start time for progress estimation
            // Total work = already processed + currently queued + currently active
            const totalKnownWork = this.totalProcessed + this.queue.length + this.activeRequests;
            if (totalKnownWork > this.peakQueueSize) {
                this.peakQueueSize = totalKnownWork;
                if (this.queueStartTime === 0 && totalKnownWork > 100) {
                    this.queueStartTime = Date.now();
                }
            }
            
            // Start processing if we're not at max concurrency
            this.processNext();
        });
    }

    /**
     * Process the next item in the queue
     */
    async processNext() {
        // Check if we can process more requests
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        // Enforce minimum delay between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minDelay && this.lastRequestTime > 0) {
            const delayNeeded = this.minDelay - timeSinceLastRequest;
            setTimeout(() => this.processNext(), delayNeeded);
            return;
        }

        // Get next request from queue
        const item = this.queue.shift();
        if (!item) return;

        this.activeRequests++;
        this.lastRequestTime = Date.now();

        try {
            const result = await item.requestFn();
            this.totalProcessed++;
            item.resolve(result);
            
            // Track success for adaptive rate limiting
            if (this.adaptive) {
                this.recentSuccesses.push(Date.now());
                if (this.recentSuccesses.length > this.windowSize) {
                    this.recentSuccesses.shift();
                }
                this.adaptRateLimit(false);
            }
            
            // Log progress for large queues
            this.logProgressIfNeeded();
        } catch (error) {
            this.totalErrors++;
            
            // Track error for adaptive rate limiting
            if (this.adaptive) {
                const isRateLimit = error.response?.status === 429 || error.response?.status === 403;
                this.recentErrors.push({ timestamp: Date.now(), isRateLimit });
                if (this.recentErrors.length > this.windowSize) {
                    this.recentErrors.shift();
                }
                this.adaptRateLimit(isRateLimit);
            }
            
            item.reject(error);
        } finally {
            this.activeRequests--;
            
            // Process next item
            setImmediate(() => this.processNext());
        }
    }

    /**
     * Adapt rate limiting based on recent success/error rates
     */
    adaptRateLimit(isRateLimitError) {
        const now = Date.now();
        
        // Immediate response to rate limit errors
        if (isRateLimitError) {
            const oldDelay = this.minDelay;
            const oldConcurrent = this.maxConcurrent;
            
            // Aggressive backoff on rate limit
            this.minDelay = Math.min(this.maxAllowedDelay, this.minDelay * 2);
            this.maxConcurrent = Math.max(this.minAllowedConcurrent, Math.floor(this.maxConcurrent / 2));
            
            logger.warn(`[${this.name}] Rate limit hit - backing off: delay ${oldDelay}ms→${this.minDelay}ms, concurrent ${oldConcurrent}→${this.maxConcurrent}`);
            this.lastAdaptation = now;
            return;
        }
        
        // Only adapt periodically for normal adjustments
        if (now - this.lastAdaptation < this.adaptationInterval) {
            return;
        }
        
        // Calculate error rate from recent history
        const recentCount = this.recentSuccesses.length + this.recentErrors.length;
        if (recentCount < 20) return; // Need enough data
        
        const errorRate = this.recentErrors.length / recentCount;
        const oldDelay = this.minDelay;
        const oldConcurrent = this.maxConcurrent;
        let adapted = false;
        
        // If error rate is high (>5%), slow down
        if (errorRate > 0.05) {
            this.minDelay = Math.min(this.maxAllowedDelay, Math.floor(this.minDelay * 1.5));
            this.maxConcurrent = Math.max(this.minAllowedConcurrent, Math.floor(this.maxConcurrent * 0.8));
            adapted = true;
        }
        // If error rate is very low (<1%) and we're not at max speed, speed up
        else if (errorRate < 0.01 && this.minDelay > this.minAllowedDelay) {
            this.minDelay = Math.max(this.minAllowedDelay, Math.floor(this.minDelay * 0.9));
            this.maxConcurrent = Math.min(this.maxAllowedConcurrent, Math.ceil(this.maxConcurrent * 1.1));
            adapted = true;
        }
        
        // Only log if error rate is significant (>1%) to reduce noise
        if (adapted && errorRate > 0.01 && (oldDelay !== this.minDelay || oldConcurrent !== this.maxConcurrent)) {
            logger.info(`[${this.name}] Adapted: delay ${oldDelay}ms→${this.minDelay}ms, concurrent ${oldConcurrent}→${this.maxConcurrent} (error rate: ${(errorRate * 100).toFixed(1)}%)`);
        }
        
        this.lastAdaptation = now;
    }

    /**
     * Log progress for large queues
     */
    logProgressIfNeeded() {
        // Only log if we're processing a significant number of requests
        if (this.totalProcessed < 50) return;
        
        // Log every N requests
        if (this.totalProcessed - this.lastProgressLog >= this.progressInterval) {
            this.lastProgressLog = this.totalProcessed;
            
            const remaining = this.queue.length + this.activeRequests;
            logger.info(`[${this.name}] Processed ${this.totalProcessed} requests`);
            // logger.info(`[${this.name}] Processed ${this.totalProcessed} requests (${remaining} remaining in queue)`);
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const recentCount = this.recentSuccesses.length + this.recentErrors.length;
        const errorRate = recentCount > 0 ? (this.recentErrors.length / recentCount) : 0;
        
        return {
            queueLength: this.queue.length,
            activeRequests: this.activeRequests,
            totalProcessed: this.totalProcessed,
            totalErrors: this.totalErrors,
            peakQueueSize: this.peakQueueSize,
            errorRate: this.totalProcessed > 0 
                ? (this.totalErrors / this.totalProcessed * 100).toFixed(2) + '%'
                : '0%',
            // Adaptive stats
            currentDelay: this.minDelay,
            currentConcurrent: this.maxConcurrent,
            recentErrorRate: (errorRate * 100).toFixed(1) + '%'
        };
    }

    /**
     * Wait for all queued and active requests to complete
     */
    async drain() {
        while (this.queue.length > 0 || this.activeRequests > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Clear the queue and reset stats
     */
    clear() {
        // Reject all pending requests
        for (const item of this.queue) {
            item.reject(new Error('Queue cleared'));
        }
        this.queue = [];
        this.totalProcessed = 0;
        this.totalErrors = 0;
        this.lastProgressLog = 0;
        this.queueStartTime = 0;
        this.peakQueueSize = 0;
        this.recentErrors = [];
        this.recentSuccesses = [];
        this.lastAdaptation = 0;
        
        // Reset to initial values
        this.minDelay = this.initialMinDelay;
        this.maxConcurrent = this.initialMaxConcurrent;
    }
}

module.exports = RequestQueue;
