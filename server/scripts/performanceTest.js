#!/usr/bin/env node

const axios = require('axios');
const { performance } = require('perf_hooks');

// Performance testing script for NASA System 7 Portal
class PerformanceTest {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.testEndpoints = [
      '/api/nasa/planetary/apod',
      '/api/nasa/neo/browse?page=0&size=20',
      '/health',
      '/metrics'
    ];
  }

  async runSingleTest(endpoint, iterations = 10) {
    console.log(`\n🧪 Testing endpoint: ${endpoint}`);
    console.log(`📊 Running ${iterations} iterations...`);

    const testResults = {
      endpoint,
      iterations,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      successRate: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      statusCodes: {}
    };

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();

        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000,
          validateStatus: () => true // Accept all status codes
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Update metrics
        testResults.totalTime += responseTime;
        testResults.minTime = Math.min(testResults.minTime, responseTime);
        testResults.maxTime = Math.max(testResults.maxTime, responseTime);

        // Track status codes
        const statusCode = response.status;
        testResults.statusCodes[statusCode] = (testResults.statusCodes[statusCode] || 0) + 1;

        // Track cache hits
        if (response.headers['x-cache'] === 'HIT') {
          testResults.cacheHits++;
        }

        // Log slow requests
        if (responseTime > 2000) {
          console.warn(`⚠️  Slow request detected: ${responseTime.toFixed(2)}ms`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        testResults.errors++;
        console.error(`❌ Request failed: ${error.message}`);
      }
    }

    // Calculate final metrics
    const successfulRequests = iterations - testResults.errors;
    testResults.successRate = (successfulRequests / iterations) * 100;
    testResults.avgResponseTime = successfulRequests > 0 ? testResults.totalTime / successfulRequests : 0;
    testResults.cacheHitRate = successfulRequests > 0 ? (testResults.cacheHits / successfulRequests) * 100 : 0;

    return testResults;
  }

  async runAllTests() {
    console.log('🚀 Starting NASA System 7 Portal Performance Tests');
    console.log('📍 Testing server:', this.baseUrl);
    console.log('⏰ Started at:', new Date().toISOString());

    const overallResults = {
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      endpoints: [],
      summary: {}
    };

    // Test each endpoint
    for (const endpoint of this.testEndpoints) {
      const result = await this.runSingleTest(endpoint);
      overallResults.endpoints.push(result);
      this.logTestResult(result);
    }

    overallResults.endTime = Date.now();
    overallResults.totalDuration = overallResults.endTime - overallResults.startTime;

    // Generate summary
    overallResults.summary = this.generateSummary(overallResults.endpoints);

    // Log summary
    this.logSummary(overallResults.summary, overallResults.totalDuration);

    // Save results to file
    await this.saveResults(overallResults);

    return overallResults;
  }

  logTestResult(result) {
    console.log(`\n📈 Results for ${result.endpoint}:`);
    console.log(`✅ Success Rate: ${result.successRate.toFixed(1)}%`);
    console.log(`⚡ Avg Response Time: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`🐌 Max Response Time: ${result.maxTime.toFixed(2)}ms`);
    console.log(`🚀 Min Response Time: ${result.minTime.toFixed(2)}ms`);
    console.log(`💾 Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%`);
    console.log(`❌ Errors: ${result.errors}`);

    if (Object.keys(result.statusCodes).length > 0) {
      console.log(`📊 Status Codes:`, result.statusCodes);
    }
  }

  generateSummary(endpoints) {
    const totalRequests = endpoints.reduce((sum, ep) => sum + ep.iterations, 0);
    const totalSuccessfulRequests = endpoints.reduce((sum, ep) => sum + (ep.iterations - ep.errors), 0);
    const avgResponseTime = endpoints.reduce((sum, ep) => sum + ep.avgResponseTime, 0) / endpoints.length;
    const avgCacheHitRate = endpoints.reduce((sum, ep) => sum + ep.cacheHitRate, 0) / endpoints.length;

    return {
      totalRequests,
      successfulRequests: totalSuccessfulRequests,
      overallSuccessRate: (totalSuccessfulRequests / totalRequests) * 100,
      avgResponseTime,
      avgCacheHitRate,
      slowestEndpoint: endpoints.reduce((slowest, ep) =>
        ep.avgResponseTime > slowest.avgResponseTime ? ep : slowest
      ),
      fastestEndpoint: endpoints.reduce((fastest, ep) =>
        ep.avgResponseTime < fastest.avgResponseTime ? ep : fastest
      ),
      performanceGrade: this.calculatePerformanceGrade(avgResponseTime, avgCacheHitRate)
    };
  }

  calculatePerformanceGrade(avgResponseTime, cacheHitRate) {
    if (avgResponseTime < 200 && cacheHitRate > 50) return 'A+';
    if (avgResponseTime < 500 && cacheHitRate > 30) return 'A';
    if (avgResponseTime < 1000 && cacheHitRate > 20) return 'B';
    if (avgResponseTime < 2000) return 'C';
    return 'D';
  }

  logSummary(summary, totalDuration) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Test Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Total Requests: ${summary.totalRequests}`);
    console.log(`✅ Success Rate: ${summary.overallSuccessRate.toFixed(1)}%`);
    console.log(`⚡ Average Response Time: ${summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`💾 Average Cache Hit Rate: ${summary.avgCacheHitRate.toFixed(1)}%`);
    console.log(`🏆 Performance Grade: ${summary.performanceGrade}`);
    console.log(`🐌 Slowest Endpoint: ${summary.slowestEndpoint.endpoint} (${summary.slowestEndpoint.avgResponseTime.toFixed(2)}ms)`);
    console.log(`🚀 Fastest Endpoint: ${summary.fastestEndpoint.endpoint} (${summary.fastestEndpoint.avgResponseTime.toFixed(2)}ms)`);

    // Performance recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (summary.avgResponseTime > 1000) {
      console.log('⚠️  Consider optimizing API response times');
    }
    if (summary.avgCacheHitRate < 30) {
      console.log('💾 Implement better caching strategies');
    }
    if (summary.overallSuccessRate < 95) {
      console.log('🔧 Investigate and fix failed requests');
    }
    if (summary.performanceGrade === 'A+') {
      console.log('🎉 Excellent performance! Keep up the good work!');
    }
  }

  async saveResults(results) {
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-test-${timestamp}.json`;

    try {
      await fs.writeFile(filename, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
    }
  }

  async testLoadConcurrency(endpoint, concurrency = 10, duration = 10000) {
    console.log(`\n🔥 Load testing: ${endpoint} with ${concurrency} concurrent users for ${duration/1000}s`);

    const startTime = Date.now();
    const endTime = startTime + duration;
    let totalRequests = 0;
    let successfulRequests = 0;
    const responseTimes = [];

    const makeRequest = async () => {
      while (Date.now() < endTime) {
        try {
          const requestStart = performance.now();
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
          const requestEnd = performance.now();

          responseTimes.push(requestEnd - requestStart);
          successfulRequests++;
        } catch (error) {
          // Log errors but continue
        }
        totalRequests++;
      }
    };

    // Start concurrent requests
    const promises = Array(concurrency).fill().map(() => makeRequest());
    await Promise.all(promises);

    const actualDuration = Date.now() - startTime;
    const requestsPerSecond = (totalRequests / actualDuration) * 1000;
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    console.log(`📊 Load Test Results:`);
    console.log(`⚡ Requests per second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`✅ Success rate: ${((successfulRequests / totalRequests) * 100).toFixed(1)}%`);
    console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`📈 Total requests: ${totalRequests}`);

    return {
      endpoint,
      concurrency,
      duration: actualDuration,
      requestsPerSecond,
      successRate: (successfulRequests / totalRequests) * 100,
      avgResponseTime,
      totalRequests
    };
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3001';
  const tester = new PerformanceTest(baseUrl);

  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Performance tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceTest;