---
title: Composable Analytics with Agents: Leveraging Virtual Datasets and the Semantic Layer
date: 2025-09-017T09:00:00Z
description: "The power of Dremio's Semantic Layer for Agentic AI"
author: "Alex Merced"
category: "Data Engineering"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - Data Lakehouse
  - Data Engineering
  - Agentic AI
  - Apache Iceberg
slug: 2025-09-composable-analytics-with-agents
draft: false
image: "/images/blog.png"
---

- **[Free Apache Iceberg Course](https://hello.dremio.com/webcast-an-apache-iceberg-lakehouse-crash-course-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=semantic_layer&utm_content=alexmerced&utm_term=semantic_layer)**  
- **[Free Copy of “Apache Iceberg: The Definitive Guide”](https://hello.dremio.com/wp-apache-iceberg-the-definitive-guide-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=semantic_layer&utm_content=alexmerced&utm_term=semantic_layer)**  
- **[Free Copy of “Apache Polaris: The Definitive Guide”](https://hello.dremio.com/wp-apache-polaris-guide-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=semantic_layer&utm_content=alexmerced&utm_term=semantic_layer)** 
- **[Purchase "Architecting an Apache Iceberg Lakehouse"](https://www.manning.com/books/architecting-an-apache-iceberg-lakehouse?utm_source=merced&utm_medium=affiliate&utm_campaign=book_merced&a_aid=merced&a_bid=7eac4151)**
- **[2025 Apache Iceberg Architecture Guide](https://medium.com/data-engineering-with-dremio/2025-guide-to-architecting-an-iceberg-lakehouse-9b19ed42c9de)**  
- **[Iceberg Lakehouse Engineering Video Playlist](https://youtube.com/playlist?list=PLsLAVBjQJO0p0Yq1fLkoHvt2lEJj5pcYe&si=WTSnqjXZv6Glkc3y)**  
- **[Ultimate Apache Iceberg Resource Guide](https://medium.com/data-engineering-with-dremio/ultimate-directory-of-apache-iceberg-resources-e3e02efac62e)** 


The promise of AI in analytics isn’t just faster answers, it’s **smarter, more flexible insights**. For that to happen, AI agents need not only access to data but also the ability to compose, extend, and recombine datasets on the fly. This is where Dremio’s **semantic layer** and **virtual datasets** come into play, providing the foundation for what AtScale calls *composable analytics*.

## The Challenge: Static Models in a Dynamic World

Traditional analytics models are rigid. Business intelligence teams define metrics in dashboards or cubes, and changing them often requires IT involvement. This creates bottlenecks when business needs evolve, leaving AI agents with limited flexibility to adjust their workflows.  

For agentic AI, which thrives on **iterative reasoning and adaptive workflows**, rigid models are a barrier.

## Virtual Datasets: Building Blocks for Composable Analytics

Dremio addresses this challenge with **virtual datasets (VDSs)**:  

- **No physical copies**: VDSs are views defined in the semantic layer, not duplicated data.  
- **Composable**: VDSs can be combined, extended, or refined into new virtual models.  
- **Governed**: Every dataset inherits security and lineage from the semantic layer.  

Agents interacting through Dremio’s MCP server can query these VDSs directly, creating new analytic combinations without breaking governance or requiring new pipelines.

## Agents + MCP: Extending Models on Demand

With MCP exposing tools like *Run SQL Query* and *Run Semantic Search*, agents can:  

- Discover governed VDSs in **plain business language**.  
- Combine datasets to answer multi-dimensional questions.  
- Extend existing models with new calculations or filters.  

For example, an agent could take a “Customer Revenue” VDS and extend it with a churn prediction metric, producing a new analytic model for marketing, all governed by Dremio’s semantic layer.

## Composable Analytics Meets Composable Modeling

The AtScale community describes *composable analytics* as the ability to assemble insights from modular building blocks. Dremio’s semantic layer aligns perfectly with this vision:  

- **Reusability**: Metrics and datasets defined once can be reused everywhere.  
- **Cross-functional consistency**: Finance, marketing, and operations share the same definitions.  
- **Agent empowerment**: AI systems don’t just query data — they can compose new insights dynamically.  

This brings composability from the human analyst’s world into the AI agent’s world.

## Real-World Benefits

- **Faster iteration**: Agents adapt models to new questions without waiting for IT.  
- **Democratized insights**: Business teams get answers in language they understand, grounded in governed metrics.  
- **Cross-functional alignment**: Everyone — human or agent — works from the same semantic foundation.  

The result is analytics that are not only AI-ready but also **flexible, governed, and consistent across the enterprise**.

## Conclusion

Composable analytics is the future of data-driven decision-making. By leveraging **virtual datasets** and the **semantic layer**, Dremio makes it possible for both humans and AI agents to build and extend insights in real time.  

With MCP providing the bridge and the semantic layer ensuring governance, enterprises can embrace a world where **analytics are adaptive, modular, and truly agentic**.