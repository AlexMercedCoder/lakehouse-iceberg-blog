---
term: "Iceberg Date/Time Partition Transforms"
description: "A set of native partition transforms in Apache Iceberg that partition data by year, month, day, or hour using source date or timestamp values."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-identity-partition-transform"
keywords:
  - iceberg time partitioning
  - days transform
  - years months hours transforms
lastUpdated: 2026-05-29
---

## Iceberg Date/Time Partition Transforms

**Iceberg Date/Time Partition Transforms** are specialized partitioning functions defined by the Apache Iceberg table specification. They convert date or timestamp values into integer partition values representing time periods elapsed since the Unix epoch (1970-01-01). They support partitioning by year, month, day, or hour, providing the foundation for Iceberg's hidden partitioning capabilities.

### Supported Time Transforms

Iceberg defines four primary time-based partition transforms:

- **`years(col)`**: Partitions data by the calendar year of the source date or timestamp. The physical partition value is stored as the number of years since 1970.
- **`months(col)`**: Partitions data by the calendar month. The physical value is stored as the number of months since January 1970.
- **`days(col)`**: Partitions data by the calendar day. The physical value is stored as the number of days since 1970-01-01.
- **`hours(col)`**: Partitions data down to the specific hour of the day. The physical value is stored as the number of hours since 1970-01-01 00:00:00.

### Syntax and Implementation

To write time-partitioned data, specify the transform inside the `PARTITIONED BY` clause when creating a table:

```sql
/* Partition the events table by day using the days transform */
CREATE TABLE analytics.events (
    event_id bigint,
    event_name string,
    created_at timestamp
)
USING iceberg
PARTITIONED BY (days(created_at));
```

The write engine automatically extracts the date from the timestamp, computes the days elapsed since the epoch, and writes the data to the appropriate folder:

```
s3://my-bucket/analytics/events/data/created_at_day=2026-05-29/
```

### Hidden Partitioning Benefits

Because Iceberg associates the partition logic with the source column inside the table metadata, users do not need to alter their queries to get the benefits of partition pruning:

```sql
/* The engine automatically prunes files based on the days() transform */
SELECT * FROM analytics.events WHERE created_at >= '2026-05-01 00:00:00';
```

Query engines parse the filter on the source column, compute the corresponding epoch day values, and skip scanning partition directories outside the target date range.
