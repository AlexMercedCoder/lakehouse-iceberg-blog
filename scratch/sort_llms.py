import re

new_terms = [
    "- [apache-xtable-translations](https://iceberglakehouse.com/iceberg/apache-xtable-translations/)",
    "- [catalog-federation](https://iceberglakehouse.com/iceberg/catalog-federation/)",
    "- [cdc-log-ingestion-pipelines](https://iceberglakehouse.com/iceberg/cdc-log-ingestion-pipelines/)",
    "- [columnar-memory-layouts](https://iceberglakehouse.com/iceberg/columnar-memory-layouts/)",
    "- [data-lineage-tracking](https://iceberglakehouse.com/iceberg/data-lineage-tracking/)",
    "- [debezium-cdc-engines](https://iceberglakehouse.com/iceberg/debezium-cdc-engines/)",
    "- [decoupled-compute-and-storage](https://iceberglakehouse.com/iceberg/decoupled-compute-and-storage/)",
    "- [delta-lake-uniform-metadata](https://iceberglakehouse.com/iceberg/delta-lake-uniform-metadata/)",
    "- [dynamic-filter-pushdown](https://iceberglakehouse.com/iceberg/dynamic-filter-pushdown/)",
    "- [modern-data-stack-mds](https://iceberglakehouse.com/iceberg/modern-data-stack-mds/)",
    "- [object-storage-prefix-hashing](https://iceberglakehouse.com/iceberg/object-storage-prefix-hashing/)",
    "- [read-amplification](https://iceberglakehouse.com/iceberg/read-amplification/)",
    "- [single-source-of-truth-ssot](https://iceberglakehouse.com/iceberg/single-source-of-truth-ssot/)",
    "- [space-amplification](https://iceberglakehouse.com/iceberg/space-amplification/)",
    "- [split-planning-loops](https://iceberglakehouse.com/iceberg/split-planning-loops/)",
    "- [time-to-first-byte-ttfb](https://iceberglakehouse.com/iceberg/time-to-first-byte-ttfb/)",
    "- [write-amplification](https://iceberglakehouse.com/iceberg/write-amplification/)",
    "- [zero-copy-cloning](https://iceberglakehouse.com/iceberg/zero-copy-cloning/)"
]

llms_path = "public/llms.txt"

with open(llms_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

header = []
terms = []

for line in lines:
    line_str = line.strip()
    if not line_str:
        continue
    if not line_str.startswith("- [") or "Knowledge Base Index" in line_str:
        if "## Knowledge Base Terms" in header or any("Knowledge Base Terms" in l for l in header):
            if "Knowledge Base Index" in line_str:
                header.append(line_str)
            else:
                terms.append(line_str)
        else:
            header.append(line_str)
    else:
        is_pillar = True
        for h in header:
            if "## Knowledge Base Terms" in h:
                is_pillar = False
                break
        if is_pillar:
            header.append(line_str)
        else:
            terms.append(line_str)

terms_set = set(terms)
for t in new_terms:
    terms_set.add(t)

sorted_terms = sorted(list(terms_set))

with open(llms_path, "w", encoding="utf-8") as f:
    for h in header:
        f.write(h + "\n")
    for t in sorted_terms:
        f.write(t + "\n")

print("llms.txt sorted and updated successfully with final batch!")
