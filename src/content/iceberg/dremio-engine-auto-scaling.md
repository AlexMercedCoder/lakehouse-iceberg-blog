---
term: "Dremio Engine Auto-scaling"
description: "The automated process of dynamically scaling Dremio execution engine pods in a Kubernetes cluster to optimize performance and control resource costs."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "dremio-acceleration-engine"
keywords:
  - dremio engine auto-scaling
  - dremio autoscaling
  - k8s auto-scaling dremio
lastUpdated: 2026-05-29
---

## Dremio Engine Auto-scaling

**Dremio Engine Auto-scaling** refers to the native ability of Dremio clusters deployed on Kubernetes (such as Amazon EKS or Azure AKS) to automatically adjust the number of running executor pods in response to query workloads. By scaling up when user query volume rises and scaling down to zero when idle, auto-scaling optimizes compute costs while maintaining performance for interactive analytics.

In modern Dremio environments, administrators configure execution engines with auto start and auto stop parameters. When a query is routed to an engine that is stopped, Dremio coordinates with the Kubernetes control plane to provision the executor pods. After a specified period of inactivity (idle timeout), Dremio automatically terminates the pods to prevent paying for unused compute.

### Multi-Engine Routing and Isolation

Auto-scaling is most effective when combined with workload isolation. Instead of running a single large cluster, administrators define multiple execution engines tailored for specific workloads:

```sql
/* Route queries from the finance department to the finance engine */
/* This engine starts automatically and stops when idle */
ALTER ENGINE finance_engine SET AUTO_START = true, AUTO_STOP_TIMEOUT_SECONDS = 600;
```

Routing rules automatically direct queries to the appropriate engine. For example, a heavy data reflection refresh query can run on a dedicated engine that scales up for the task and terminates immediately upon completion, leaving the primary ad-hoc engine unaffected.

### Dynamic Downscaling and Graceful Shutdown

To prevent active queries from failing when an engine downsizes or shuts down, Dremio utilizes Kubernetes graceful deletion policies. During a downscale operation, Dremio coordinator nodes mark targeted executor pods as terminating, preventing new queries from routing to them while allowing active jobs to complete within the configured grace period.
