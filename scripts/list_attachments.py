import os
from pathlib import Path

drafts_dir = Path("drafts")
with_att = []
for d in drafts_dir.iterdir():
    if d.is_dir():
        att_dir = d / "attachments"
        if att_dir.exists():
            files = list(att_dir.iterdir())
            if files:
                with_att.append((d.name, [f.name for f in files]))

print(f"Total drafts with attachments: {len(with_att)}")
for d_name, files in sorted(with_att):
    print(f"📦 {d_name}")
    for f in files:
        print(f"   └── {f}")
