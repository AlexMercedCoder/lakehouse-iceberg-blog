import re

new_terms = [
    "- [apache-datafusion](https://iceberglakehouse.com/iceberg/apache-datafusion/)",
    "- [bauplan](https://iceberglakehouse.com/iceberg/bauplan/)",
    "- [clickhouse](https://iceberglakehouse.com/iceberg/clickhouse/)",
    "- [google-cloud-biglake](https://iceberglakehouse.com/iceberg/google-cloud-biglake/)",
    "- [microsoft-fabric-onelake](https://iceberglakehouse.com/iceberg/microsoft-fabric-onelake/)",
    "- [puppygraph](https://iceberglakehouse.com/iceberg/puppygraph/)",
    "- [spiceai](https://iceberglakehouse.com/iceberg/spiceai/)",
    "- [velodb](https://iceberglakehouse.com/iceberg/velodb/)",
    "- [vortex-file-format](https://iceberglakehouse.com/iceberg/vortex-file-format/)"
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

print("llms.txt sorted and updated successfully with product integrations!")
