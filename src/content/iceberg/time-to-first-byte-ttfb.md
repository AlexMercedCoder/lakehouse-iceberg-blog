---
term: "Time To First Byte (TTFB)"
description: "A latency metric measuring the duration from when a client engine initiates an object storage read request to when the storage starts returning data."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "decoupled-compute-and-storage"
  - "dremio-columnar-cloud-cache-c3"
keywords:
  - time to first byte
  - ttfb
  - storage latency
  - object storage speed
lastUpdated: 2026-05-29
---

## Time To First Byte (TTFB)

**Time To First Byte (TTFB)** is a performance metric that measures the latency of cloud object storage (such as Amazon S3, Google Cloud Storage, or Azure Blob Storage). Specifically, it tracks the duration between when a query engine sends a request to read a file block and when the storage service sends the first byte of data back to the engine.

### Impact of TTFB on Query Latency

In decoupled compute and storage architectures, TTFB is a primary performance bottleneck. Cloud object storage has higher latency than local NVMe SSDs:

- **Local SSD Latency**: Under 0.1 milliseconds.
- **Object Storage TTFB**: Typically ranges from 5 to 50 milliseconds.

If a query requires scanning thousands of files, and each file read encounters a 10 ms TTFB delay, the query spends more time waiting for connections to establish than actually reading data.

### Mitigation Strategies

Data architects use several techniques to bypass object storage TTFB limitations:

- **Local Caching**: Query engines like Dremio use local SSD caching (such as Columnar Cloud Cache, or C3) on executor nodes. Hot data blocks are cached locally, bypassing the remote storage TTFB entirely on subsequent queries.
- **File Sizing**: Keeping target file sizes large (e.g. 128 MB or 256 MB) ensures that the engine makes fewer, larger read requests. This maximizes the data retrieved per connection, reducing the impact of TTFB overhead.
- **Parallel Execution**: Running multi-threaded split planning reads data blocks concurrently, offsetting connection latencies across multiple executor threads.
