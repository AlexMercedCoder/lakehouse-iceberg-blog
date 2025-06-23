---
title: What is an API? And Why Data Architecture Depends on Them
date: 2025-06-23T09:00:00Z
description: "Hive, Glue, Iceberg Rest and so many more!"
author: "Alex Merced"
category: "Data Engineering"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - Data Lakehouse
  - Data Engineering
slug: 2025-06-what-is-an-api
draft: false
image: "/images/blog.png"
---

## Free Resources  
- **[Free Apache Iceberg Course](https://hello.dremio.com/webcast-an-apache-iceberg-lakehouse-crash-course-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=what-is-an-api&utm_content=alexmerced&utm_term=external_blog)**  
- **[Free Copy of “Apache Iceberg: The Definitive Guide”](https://hello.dremio.com/wp-apache-iceberg-the-definitive-guide-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=what-is-an-api&utm_content=alexmerced&utm_term=external_blog)**  
- **[Free Copy of “Apache Polaris: The Definitive Guide”](https://hello.dremio.com/wp-apache-polaris-guide-reg.html?utm_source=ev_external_blog&utm_medium=influencer&utm_campaign=what-is-an-api&utm_content=alexmerced&utm_term=external_blog)**  
- **[2025 Apache Iceberg Architecture Guide](https://medium.com/data-engineering-with-dremio/2025-guide-to-architecting-an-iceberg-lakehouse-9b19ed42c9de)**  
- **[How to Join the Iceberg Community](https://medium.alexmerced.blog/guide-to-finding-apache-iceberg-events-near-you-and-being-part-of-the-greater-iceberg-community-0c38ae785ddb)**  
- **[Iceberg Lakehouse Engineering Video Playlist](https://youtube.com/playlist?list=PLsLAVBjQJO0p0Yq1fLkoHvt2lEJj5pcYe&si=WTSnqjXZv6Glkc3y)**  
- **[Ultimate Apache Iceberg Resource Guide](https://medium.com/data-engineering-with-dremio/ultimate-directory-of-apache-iceberg-resources-e3e02efac62e)** 

Imagine walking into a restaurant in a foreign country where you don’t speak the language. You point at things, gesture wildly, maybe even draw pictures — anything to communicate what you want. But if you and the server spoke a common language like English or Spanish, things would go a lot smoother.

That’s exactly what APIs do for software systems. They are shared languages that define how software components talk to each other. Without a shared API, systems can't collaborate easily, leading to miscommunication, friction, or total breakdown.

In this post, we'll unpack what APIs are and why they’re critical in data architecture. We'll explore the different types of APIs, how they've shaped modern data workflows, and the standards that have emerged in key areas like storage, data transport, and cataloging. Whether you're a developer building integrations or a data architect planning your stack, understanding these APIs is essential for navigating today's complex data ecosystem.

## What is an API?

An API, or Application Programming Interface, is like a contract that defines how different software components can interact. Think of it as a language specification — if two programs speak the same API, they can communicate effectively, even if they're written in different languages or run on different platforms.

Just like a language has rules for grammar and vocabulary, an API defines the rules for how requests are made, what data is expected, and how responses are structured. When software follows these rules, integration becomes smooth and predictable.

It's important to recognize that the term "API" can mean different things depending on context:

- In software development, an API can refer to the functions and methods exposed by a library or class. If one class implements the same method signatures as another, it can serve as a drop-in replacement.
- In system integration, APIs more commonly refer to how different applications or services communicate over a network, especially using HTTP. This includes how data is sent, what endpoints exist, and how authentication is handled.

In essence, APIs enable modularity and collaboration in software. They allow teams to build components independently, knowing they can connect through a well-defined interface.

## The Four Horsemen of HTTP APIs

When most people talk about APIs in modern software systems, they’re usually referring to HTTP-based APIs — interfaces that allow software to communicate over the web or internal networks. Over time, four main styles of HTTP APIs have emerged, each with its own strengths and trade-offs.

### 1. SOAP (Simple Object Access Protocol)

SOAP is a protocol-based API style that uses XML to encode messages and enforces strict standards for how messages are structured. It includes built-in specifications for things like security and error handling. While powerful, SOAP is often seen as heavyweight and complex, which has led to a decline in its use for most new applications.

### 2. REST (Representational State Transfer)

REST is more lightweight and flexible. It uses standard HTTP methods like GET, POST, PUT, and DELETE to perform operations on resources, which are identified via URLs. REST APIs are stateless, meaning each request contains all the information needed to process it. REST's simplicity and widespread adoption have made it the go-to style for many web services.

### 3. RPC (Remote Procedure Call)

RPC is all about invoking functions remotely. Instead of thinking in terms of resources, you think in terms of actions — like calling a method named `getUserDetails`. RPC can use different serialization formats (like JSON-RPC or gRPC) and tends to be more efficient for certain tasks, especially internal service communication.

### 4. GraphQL

GraphQL allows clients to request exactly the data they need and nothing more. Instead of multiple endpoints, there’s typically a single endpoint that interprets a query language. This can reduce over-fetching and under-fetching of data and provides a more dynamic interface, especially useful for frontend applications.

Each of these API types has its place in the ecosystem. Understanding their differences helps you pick the right tool for the job depending on complexity, flexibility, and performance needs.

## Why APIs Matter in Modern Data Architecture

The modern data stack is a vibrant and diverse ecosystem. From ingestion tools and storage layers to transformation engines and visualization platforms, each component often comes from a different vendor or open-source project. The glue that holds this ecosystem together is the API.

With so many tools available, the ability to integrate them seamlessly becomes a competitive advantage. Instead of reinventing the wheel, software platforms that adopt well-known APIs can plug into existing workflows and leverage established tooling. This interoperability allows teams to mix and match components without being locked into a single vendor or technology stack.

For example, if two different tools both understand the same API for reading from a data catalog or writing to object storage, they can work together out of the box. This eliminates the need for custom connectors or fragile workarounds.

APIs also encourage specialization. A tool can focus on doing one thing well — like cataloging metadata or transporting data — and expose an API that others can build upon. This modularity is what makes today's data architectures more flexible and scalable than ever before.

In short, APIs are the foundation of composability in data systems. They allow different parts of the stack to evolve independently while still working together in harmony.

## Case Study – The Ubiquity of the S3 API

Amazon S3 wasn't just a game changer because it offered scalable cloud storage. It also introduced a clean, consistent API that made storing and retrieving objects over the web straightforward. This API became so widely adopted that it evolved into a de facto standard for cloud object storage.

As other cloud providers and storage platforms emerged, they faced a choice: create their own APIs or adopt the S3 API. Many chose the latter. Why? Because the S3 API already had a massive ecosystem of integrations. Backup tools, data lakes, ETL pipelines, and analytics platforms already knew how to talk to S3. By supporting the S3 API, new storage services could plug into these tools without requiring any custom development.

This is a powerful example of how API adoption fuels interoperability. Instead of forcing users to learn a new interface or rebuild their workflows, S3-compatible services ride the wave of existing infrastructure. As a result, users get flexibility and choice without sacrificing compatibility.

The takeaway: when an API reaches critical mass, it becomes more than a technical interface — it becomes an ecosystem enabler.

## Data Transport APIs – From JDBC/ODBC to ADBC

Moving data between systems has always been a core challenge in data architecture. For decades, the standard approach involved using JDBC (Java Database Connectivity) and ODBC (Open Database Connectivity). These APIs allowed applications to connect to relational databases in a consistent way, abstracting the underlying database-specific protocols.

While JDBC and ODBC have served well, they come with limitations. These APIs were designed for transactional systems and row-based data access. As analytics workloads became more complex and data volumes grew, these traditional interfaces began to show performance bottlenecks.

It’s also important to note that JDBC and ODBC are not HTTP-based APIs. They operate over lower-level network protocols tailored to database drivers and client libraries. This can make them harder to integrate in cloud-native or language-agnostic environments.

Enter ADBC (Arrow Database Connectivity), a modern alternative designed for analytical use cases. ADBC builds on Arrow Flight, which is a gRPC-based protocol optimized for high-throughput data transport. Instead of transferring rows one by one, Arrow Flight sends columnar batches over a persistent connection, dramatically improving efficiency for analytical queries.

With ADBC, the API is designed for today’s needs: fast, language-agnostic, and cloud-friendly. It embraces open standards like Apache Arrow and gRPC to deliver performance without sacrificing interoperability.

As analytics platforms grow more distributed and data-hungry, APIs like ADBC represent a forward-looking approach to data transport — one that matches the scale and speed of modern data systems.

## Data Catalog APIs – Hive, Glue, and Iceberg REST

Lakehouse Data catalogs store metadata about datasets — such as schema, location, and partitioning — allowing tools to discover and manage data assets consistently. But for this ecosystem to function, catalogs need APIs that other tools can understand.

Three primary catalog APIs have emerged in the lakehouse and analytics space:

### 1. Hive Metastore API

The Hive API was one of the earliest standards for metadata management in Hadoop-based systems. Because Apache Hive gained significant adoption early on, its metastore API became widely supported. Even tools that don’t use Hive for querying often support its API for interoperability.

### 2. AWS Glue Catalog API

As AWS became a dominant platform for cloud-native analytics, its Glue Catalog gained traction. Glue offered a managed alternative to Hive with cloud-native scalability and tight integration with AWS services. Many tools added support for Glue to integrate seamlessly within AWS ecosystems.

### 3. Apache Iceberg REST Catalog API

The Iceberg project initially struggled with catalog integration due to varying implementations. To solve this, the community introduced a REST-based catalog API that standardizes how tools interact with Iceberg catalogs regardless of the underlying backend. This REST interface provides a clear contract and enables broader compatibility. Catalogs that support the Iceberg REST Catalog (IRC) API include Apache Polaris (incubating), Apache Gravitino, Dremio Catalog, Open Catalog, AWS Glue Catalog, Lakekeeper, Nessie, Unity Catalog and many more. Most specialized Iceberg tooling uses this as the main catalog API for discovering your Apache Iceberg datasets while catalogs like Polaris, Gravitino and Unity also adopt other APIs to make additional datasets discoverable.

Today, most lakehouse tools support one or more of these APIs to ensure compatibility across different environments. Whether you're working with on-prem systems using Hive, cloud-native stacks using Glue, or modern lakehouse engines built around Iceberg, API adoption remains the key to ecosystem integration.

Choosing catalog tools that support these APIs ensures you're building on a foundation that promotes interoperability, flexibility, and future-proofing.

## Conclusion

APIs are more than just technical interfaces — they are the connective tissue of modern software. In data architecture, where tools span a wide range of functions and vendors, APIs enable these components to work together smoothly.

We’ve seen how APIs act like shared languages, allowing software to communicate efficiently. From foundational HTTP-based APIs like REST and GraphQL, to specialized data interfaces like the S3 API, JDBC, ADBC, and various catalog APIs, each plays a role in shaping the data landscape.

By adopting established APIs, tools become more compatible, easier to integrate, and more valuable within the broader ecosystem. And for data teams, aligning on common APIs means less time wrestling with custom connectors and more time delivering insights.

As the data world continues to evolve, understanding and leveraging key APIs is essential. They’re not just part of the plumbing — they’re a strategic asset for building robust, scalable, and flexible data systems.