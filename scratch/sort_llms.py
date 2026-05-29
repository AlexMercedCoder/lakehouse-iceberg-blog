import re

new_terms = [
    "- [catalog-namespaces](https://iceberglakehouse.com/iceberg/catalog-namespaces/)",
    "- [glue-catalog-iam-policies](https://iceberglakehouse.com/iceberg/glue-catalog-iam-policies/)",
    "- [glue-catalog-lake-formation](https://iceberglakehouse.com/iceberg/glue-catalog-lake-formation/)",
    "- [iceberg-dynamodb-catalog](https://iceberglakehouse.com/iceberg/iceberg-dynamodb-catalog/)",
    "- [iceberg-hive-catalog-lock-manager](https://iceberglakehouse.com/iceberg/iceberg-hive-catalog-lock-manager/)",
    "- [iceberg-jdbc-catalog-locks](https://iceberglakehouse.com/iceberg/iceberg-jdbc-catalog-locks/)",
    "- [iceberg-metadata-pruning](https://iceberglakehouse.com/iceberg/iceberg-metadata-pruning/)",
    "- [iceberg-partition-level-compaction](https://iceberglakehouse.com/iceberg/iceberg-partition-level-compaction/)",
    "- [iceberg-rollback-snapshot-procedures](https://iceberglakehouse.com/iceberg/iceberg-rollback-snapshot-procedures/)",
    "- [nessie-git-like-branching](https://iceberglakehouse.com/iceberg/nessie-git-like-branching/)",
    "- [nessie-merging](https://iceberglakehouse.com/iceberg/nessie-merging/)",
    "- [nessie-tagging](https://iceberglakehouse.com/iceberg/nessie-tagging/)",
    "- [polaris-catalog-sharing](https://iceberglakehouse.com/iceberg/polaris-catalog-sharing/)",
    "- [polaris-rbac-model](https://iceberglakehouse.com/iceberg/polaris-rbac-model/)",
    "- [polaris-service-principals](https://iceberglakehouse.com/iceberg/polaris-service-principals/)",
    "- [rest-catalog-credential-vending](https://iceberglakehouse.com/iceberg/rest-catalog-credential-vending/)",
    "- [rest-catalog-oauth2-token-flow](https://iceberglakehouse.com/iceberg/rest-catalog-oauth2-token-flow/)",
    "- [snowflake-external-table-catalog-sync](https://iceberglakehouse.com/iceberg/snowflake-external-table-catalog-sync/)",
    "- [snowflake-managed-iceberg-tables](https://iceberglakehouse.com/iceberg/snowflake-managed-iceberg-tables/)",
    "- [unity-catalog-delta-iceberg-compatibility](https://iceberglakehouse.com/iceberg/unity-catalog-delta-iceberg-compatibility/)"
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
    # Keep header lines
    if not line_str.startswith("- [") or "Knowledge Base Index" in line_str:
        # If it's a pillar page (which is also `- [`, but we check if we are before ## Knowledge Base Terms)
        if "## Knowledge Base Terms" in header or any("Knowledge Base Terms" in l for l in header):
            if "Knowledge Base Index" in line_str:
                header.append(line_str)
            else:
                terms.append(line_str)
        else:
            header.append(line_str)
            if "## Knowledge Base Terms" in line_str:
                pass
    else:
        # It's a term
        # Let's distinguish between Pillar Pages list and Knowledge Base Terms.
        # Pillar Pages is under "## Pillar Pages"
        # Knowledge Base Terms is under "## Knowledge Base Terms"
        is_pillar = True
        # Let's see if we passed the "## Knowledge Base Terms" line
        for h in header:
            if "## Knowledge Base Terms" in h:
                is_pillar = False
                break
        if is_pillar:
            header.append(line_str)
        else:
            terms.append(line_str)

# Clean up terms duplicates and add new terms
terms_set = set(terms)
for t in new_terms:
    terms_set.add(t)

sorted_terms = sorted(list(terms_set))

# Write back
with open(llms_path, "w", encoding="utf-8") as f:
    for h in header:
        f.write(h + "\n")
    for t in sorted_terms:
        f.write(t + "\n")

print("llms.txt sorted and updated successfully!")
