/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

export default {
  device: {
    preDiscoveryServices: {
      metricsServiceUrl: process.env.METRICS_SERVICE_URL || `https://metrics-a.wbx2.com/metrics/api/v1`
    }
  },
  metrics: {
    appType: typeof window === `undefined` ? `nodejs` : `browser`,
    batcherWait: 500,
    batcherMaxCalls: 50,
    batcherMaxWait: 1500,
    batcherRetryPlateau: 32000
  }
};
