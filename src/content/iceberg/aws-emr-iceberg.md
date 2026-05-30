---
term: "Amazon EMR and Apache Iceberg"
description: "Amazon EMR (Elastic MapReduce) is AWS's managed Spark and Flink cluster service that supports Apache Iceberg as a first-class table format, commonly used for large-scale batch ETL, compaction, and CDC processing on Iceberg tables stored in S3 with the Glue Data Catalog."
category: "Cloud-Specific Integrations"
relatedTerms:
  - "aws-glue-catalog"
  - "spark-apache-iceberg"
  - "flink-apache-iceberg"
  - "iceberg-compaction"
  - "amazon-s3-tables"
keywords:
  - amazon emr iceberg
  - emr spark iceberg
  - aws emr apache iceberg
  - emr iceberg glue catalog
  - emr flink iceberg
lastUpdated: 2026-05-14
---

## Amazon EMR and Apache Iceberg

**Amazon EMR** (Elastic MapReduce) is AWS's managed cluster service for running Apache Spark, Apache Flink, Presto, Trino, and other distributed compute frameworks. EMR is a primary execution environment for Iceberg workloads on AWS: particularly for large-scale batch ETL, Iceberg table maintenance (compaction), and streaming CDC ingestion.

EMR integrates natively with the AWS Glue Data Catalog (the most common Iceberg catalog on AWS) and Amazon S3 for storage, making it a natural fit for the standard AWS Iceberg architecture.

## EMR Iceberg Setup

### EMR Release Configuration

EMR releases 6.x and later include Iceberg pre-installed. Configure Iceberg in your EMR cluster's classification:

```json
[
  {
    "Classification": "iceberg-defaults",
    "Properties": {
      "iceberg.enabled": "true"
    }
  },
  {
    "Classification": "spark-hive-site",
    "Properties": {
      "hive.metastore.client.factory.class": "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"
    }
  }
]
```

### PySpark Script on EMR

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("IcebergEMRJob") \
    .config("spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.glue_catalog.catalog-impl",
            "org.apache.iceberg.aws.glue.GlueCatalog") \
    .config("spark.sql.catalog.glue_catalog.io-impl",
            "org.apache.iceberg.aws.s3.S3FileIO") \
    .config("spark.sql.catalog.glue_catalog.warehouse",
            "s3://my-lakehouse-bucket/warehouse/") \
    .getOrCreate()

# Create Iceberg table
spark.sql("""
    CREATE TABLE IF NOT EXISTS glue_catalog.analytics.orders (
        order_id BIGINT,
        customer_id BIGINT,
        total DOUBLE,
        order_date DATE
    ) USING iceberg
    PARTITIONED BY (months(order_date))
    LOCATION 's3://my-lakehouse-bucket/warehouse/analytics/orders/'
""")

# Read from source, write to Iceberg
df = spark.read.parquet("s3://raw-bucket/orders/2026/05/14/")
df.writeTo("glue_catalog.analytics.orders").append()
```

## EMR Serverless for Iceberg

**EMR Serverless** is a serverless variant that eliminates cluster provisioning: jobs start without pre-provisioned clusters:

```bash
# Submit an Iceberg compaction job via EMR Serverless
aws emr-serverless start-job-run \
    --application-id app-12345 \
    --execution-role-arn arn:aws:iam::123456789:role/emr-serverless-role \
    --job-driver '{
        "sparkSubmit": {
            "entryPoint": "s3://my-scripts/iceberg_compaction.py",
            "sparkSubmitParameters": "--conf spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"
        }
    }'
```

EMR Serverless is ideal for Iceberg maintenance jobs (compaction, snapshot expiration) that run on a schedule without requiring a persistent cluster.

## EMR and Iceberg Compaction

Running compaction as a scheduled EMR job is a common production pattern:

```python
# iceberg_compaction.py: EMR Serverless script
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("IcebergCompaction") \
    .getOrCreate()

tables_to_compact = [
    "glue_catalog.analytics.orders",
    "glue_catalog.analytics.events",
    "glue_catalog.analytics.customers",
]

for table in tables_to_compact:
    print(f"Compacting {table}...")
    spark.sql(f"""
        CALL system.rewrite_data_files(
            table => '{table}',
            strategy => 'binpack',
            options => map(
                'target-file-size-bytes', '268435456',
                'min-input-files', '5'
            )
        )
    """)
    spark.sql(f"""
        CALL system.expire_snapshots(
            table => '{table}',
            older_than => TIMESTAMP '{retention_cutoff}',
            retain_last => 10
        )
    """)
    print(f"  ✅ {table} compaction complete")
```

## EMR vs. Dremio for Iceberg Workloads

| Workload                       | EMR (Spark)         | Dremio                    |
| ------------------------------ | ------------------- | ------------------------- |
| Large-scale ETL (TB+)          | Excellent           | Moderate                  |
| Iceberg compaction/maintenance | Primary tool        | Auto-optimization (Cloud) |
| Interactive analytics          | Poor (slow startup) | Excellent (sub-second)    |
| Streaming ingestion            | Yes (Flink on EMR)  | No                        |
| AI Semantic Layer              | No                  | Yes                       |
| Cost model                     | Per cluster-hour    | Per compute-hour (Cloud)  |

EMR and Dremio are complementary: EMR handles the heavy ETL and maintenance workloads, Dremio serves the analytics and AI query workloads against the resulting Iceberg tables.
