import re
import os
import sys

files = [
    "src/content/iceberg/iceberg-file-path-spec.md",
    "src/content/iceberg/iceberg-spec-v3-object-store-storage-layout.md",
    "src/content/iceberg/iceberg-spec-v3-file-encryption.md",
    "src/content/iceberg/iceberg-optimistic-concurrency-control-occ.md",
    "src/content/iceberg/iceberg-lock-manager.md",
    "src/content/iceberg/iceberg-metadata-table-history.md",
    "src/content/iceberg/iceberg-metadata-table-snapshots.md",
    "src/content/iceberg/iceberg-metadata-table-files.md",
    "src/content/iceberg/iceberg-spark-procedure-rewrite-data-files.md",
    "src/content/iceberg/iceberg-spark-procedure-rewrite-manifests.md",
    "src/content/iceberg/iceberg-spark-procedure-expire-snapshots.md",
    "src/content/iceberg/iceberg-spark-procedure-remove-orphan-files.md",
    "src/content/iceberg/iceberg-spark-procedure-rewrite-position-deletes.md",
    "src/content/iceberg/iceberg-spark-procedure-add-files.md",
    "src/content/iceberg/iceberg-spark-procedure-register-table.md",
    "src/content/iceberg/iceberg-bin-packing-compaction.md",
    "src/content/iceberg/iceberg-sort-based-compaction.md",
    "src/content/iceberg/iceberg-z-order-compaction.md",
    "src/content/iceberg/iceberg-orphan-files-penalty.md",
    "src/content/iceberg/iceberg-manifest-merging.md"
]

forbidden_ai_isms = [
    r"\bdelve\b",
    r"\btapestry\b",
    r"\btestament\b",
    r"\bmoreover\b",
    r"\bfurthermore\b",
    r"\brealm\b",
    r"\bpivotal\b",
    r"\bin conclusion\b"
]

def check_file(file_path):
    if not os.path.exists(file_path):
        return ["File does not exist"]
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    findings = []
    
    # 1. Check frontmatter
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not frontmatter_match:
        findings.append("Missing frontmatter")
    else:
        fm = frontmatter_match.group(1)
        for field in ["term:", "description:", "category:", "relatedTerms:", "keywords:", "lastUpdated:"]:
            if field not in fm:
                findings.append(f"Missing frontmatter field: {field}")
                
    # 2. Extract prose (exclude frontmatter and code blocks)
    prose = content
    if frontmatter_match:
        prose = prose[frontmatter_match.end():]
        
    # Strip code blocks
    prose_clean = re.sub(r'```.*?```', ' ', prose, flags=re.DOTALL)
    # Strip inline code
    prose_clean = re.sub(r'`[^`]+`', ' ', prose_clean)
    
    # 3. Check for em-dashes or double hyphens
    # Remove table divider hyphens and markdown dividers
    prose_check_dashes = re.sub(r'-{3,}', ' ', prose_clean)
    prose_check_dashes = re.sub(r'\|', ' ', prose_check_dashes)
    
    lines = prose_check_dashes.split('\n')
    for idx, line in enumerate(lines):
        line_num = idx + 1
        if "—" in line:
            findings.append(f"Line {line_num}: Contains em-dash (—) -> '{line.strip()}'")
        if "--" in line:
            findings.append(f"Line {line_num}: Contains double hyphen (--) -> '{line.strip()}'")
            
    # 4. Check for AI-isms
    for pattern in forbidden_ai_isms:
        matches = re.findall(pattern, prose_clean, re.IGNORECASE)
        if matches:
            findings.append(f"Contains AI-ism pattern '{pattern}': found {len(matches)} times")
            
    return findings

failures = 0
for f_path in files:
    errs = check_file(f_path)
    if errs:
        print(f"FAIL: {f_path}")
        for err in errs:
            print(f"  - {err}")
        failures += 1
    else:
        print(f"PASS: {f_path}")

if failures == 0:
    print("\nSUCCESS: All 20 files passed validation!")
    sys.exit(0)
else:
    print(f"\nFAILURE: {failures} files failed validation.")
    sys.exit(1)
