import re
import sys
import os

files = [
    "src/pages/apache-iceberg.astro",
    "src/pages/apache-iceberg-vs-delta-lake-vs-hudi.astro",
    "src/pages/apache-iceberg-schema-evolution.astro",
    "src/content/blog/2026/2026-05-22-apache-iceberg-spark-dml-evolution.md",
    "src/content/blog/2024/2024-05-deep-dive-into-iceberg-partitioning.md",
    "src/pages/apache-iceberg-snapshots-and-time-travel.astro",
    "src/content/blog/2026/2026-05-22-apache-iceberg-catalogs-explained.md",
    "src/content/blog/2026/2026-05-22-apache-iceberg-aws-athena-glue.md",
    "src/content/blog/2026/2026-05-22-apache-iceberg-maintenance-compaction.md",
    "src/content/blog/2026/2026-05-22-apache-iceberg-scd-type-2-cdc-patterns.md",
    "src/content/blog/2026/2026-05-22-open-table-format-benchmarks-guide.md"
]

def count_words(file_path):
    if not os.path.exists(file_path):
        return -1
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Strip HTML tags
    content_clean = re.sub(r'<[^>]+>', ' ', content)
    # Strip code blocks
    content_clean = re.sub(r'```.*?```', ' ', content_clean, flags=re.DOTALL)
    # Strip markdown headers, lists, etc., just keep text
    content_clean = re.sub(r'#+\s+', ' ', content_clean)
    content_clean = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content_clean) # markdown links
    content_clean = re.sub(r'`[^`]+`', ' ', content_clean) # inline code
    
    words = content_clean.split()
    return len(words)

def check_dashes(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Strip code blocks and inline code
    content_prose = re.sub(r'```.*?```', ' ', content, flags=re.DOTALL)
    content_prose = re.sub(r'`[^`]+`', ' ', content_prose)
    # Also strip script tags or style tags if they exist in Astro files
    content_prose = re.sub(r'<script>.*?</script>', ' ', content_prose, flags=re.DOTALL)
    content_prose = re.sub(r'<style>.*?</style>', ' ', content_prose, flags=re.DOTALL)
    
    # Check for em-dash (—) or "--" in the remaining prose
    # We allow `--` if it's within a frontmatter separator, i.e., "---" or similar, 
    # but not standalone " -- " or "--" inside sentences.
    # To avoid counting frontmatter separators or table dividers, let's clean any sequence of 3 or more hyphens.
    content_prose = re.sub(r'-{3,}', ' ', content_prose)
    # Also clean markdown table separators (pipes) to avoid parsing weird residues
    content_prose = re.sub(r'\|', ' ', content_prose)
    
    findings = []
    lines = content_prose.split('\n')
    for idx, line in enumerate(lines):
        line_num = idx + 1
        if "—" in line:
            findings.append((line_num, line.strip(), "em-dash"))
        # Match "--" but only if not part of a word boundary or double-dashes in code/frontmatter.
        # Let's check for "--" specifically as an em-dash replacement.
        # A simple check: if "--" exists in the line.
        if "--" in line:
            findings.append((line_num, line.strip(), "--"))
    return findings

failures = 0
for f_path in files:
    wc = count_words(f_path)
    if wc == -1:
        print(f"ERROR: {f_path} does not exist!")
        failures += 1
        continue
    
    dashes = check_dashes(f_path)
    print(f"{f_path}: Word count = {wc}")
    if wc < 4000:
        print(f"  WARNING: Word count is below 4000!")
        failures += 1
    
    if dashes:
        print(f"  WARNING: Found forbidden dash characters:")
        for line_num, text, char_type in dashes:
            print(f"    Line {line_num}: {char_type} -> {text}")
        failures += 1

if failures == 0:
    print("\nSUCCESS: All files verified successfully!")
    sys.exit(0)
else:
    print(f"\nFAILURE: {failures} checks failed.")
    sys.exit(1)
