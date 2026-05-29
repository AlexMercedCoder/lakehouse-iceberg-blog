import re
import os
import sys

files = [
    "src/content/iceberg/velodb.md",
    "src/content/iceberg/clickhouse.md",
    "src/content/iceberg/bauplan.md",
    "src/content/iceberg/spiceai.md",
    "src/content/iceberg/vortex-file-format.md",
    "src/content/iceberg/apache-datafusion.md",
    "src/content/iceberg/puppygraph.md",
    "src/content/iceberg/google-cloud-biglake.md",
    "src/content/iceberg/microsoft-fabric-onelake.md"
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
            
    # 5. Check for SQL comments using double hyphens inside code blocks
    code_blocks = re.findall(r'```sql(.*?)```', prose, flags=re.DOTALL)
    for block in code_blocks:
        if "--" in block:
            findings.append(f"Contains '--' comment style inside SQL code block -> {block.strip()}")
            
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
    print("\nSUCCESS: All 9 files passed validation!")
    sys.exit(0)
else:
    print(f"\nFAILURE: {failures} files failed validation.")
    sys.exit(1)
