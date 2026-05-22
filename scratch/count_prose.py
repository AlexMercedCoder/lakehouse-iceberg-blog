import re
import sys

def count_words(file_path):
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

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(f"Word count for {sys.argv[1]}: {count_words(sys.argv[1])}")
    else:
        print("Please provide a file path")
