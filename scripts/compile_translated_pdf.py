# -*- coding: utf-8 -*-
"""
Compiler script to generate canh-tay-robot-7dof-bao-cao-ky-thuat-tieng-viet.pdf
Translates all text elements to professional Vietnamese while preserving 100% of:
- Math formulas, equations, matrices (CMMI, CMR, etc.)
- All 54 embedded images and diagrams
- Code snippets (MATLAB, C++)
- Vector graphics, line drawings, borders
- Visual layout and page numbers
"""

import os
import json
import fitz

from translations_part1 import TRANSLATIONS_PART1
from translations_part2 import TRANSLATIONS_PART2
from translations_part3 import TRANSLATIONS_PART3
from translations_part4 import TRANSLATIONS_PART4

MASTER_TRANSLATIONS = {}
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART1)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART2)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART3)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART4)

FONT_REGULAR = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_ITALIC = r"C:\Windows\Fonts\ariali.ttf"

def color_to_rgb(col_int):
    if col_int is None or col_int == 0:
        return (0, 0, 0)
    r = ((col_int >> 16) & 0xFF) / 255.0
    g = ((col_int >> 8) & 0xFF) / 255.0
    b = (col_int & 0xFF) / 255.0
    return (r, g, b)

def find_best_font_size(rect, text, fontfile, start_fs, min_fs=7.0):
    dummy_doc = fitz.open()
    dummy_page = dummy_doc.new_page(width=600, height=900)
    fs = start_fs
    best_fs = min_fs
    while fs >= min_fs:
        dummy_page.clean_contents()
        rc = dummy_page.insert_textbox(
            rect,
            text,
            fontsize=fs,
            fontfile=fontfile,
            fontname="font"
        )
        if rc >= 0:
            best_fs = fs
            break
        fs -= 0.2
    return round(best_fs, 2)

def compile_pdf(input_pdf_path, output_pdf_path, groups_json_path):
    print(f"Loading input PDF: {input_pdf_path}")
    doc = fitz.open(input_pdf_path)
    
    with open(groups_json_path, "r", encoding="utf-8") as f:
        pages_groups = json.load(f)
        
    print(f"Total pages in doc: {len(doc)}, total in groups: {len(pages_groups)}")
    
    for p_idx, page in enumerate(doc):
        pno = p_idx + 1
        p_data = pages_groups[p_idx]
        items = p_data["items"]
        p_trans = MASTER_TRANSLATIONS.get(pno, {})
        
        # 1. First pass: Apply redactions to all Chinese elements on this page
        for idx, it in enumerate(items):
            bbox = it["bbox"]
            rect = fitz.Rect(bbox)
            
            # Special adjustment for TOC title '目' and '录' on page 2
            if pno == 2 and idx in (2, 3):
                # Redact the whole 目 录 header region
                rect = fitz.Rect(250.0, 115.0, 360.0, 155.0)
            
            # Special adjustment for Cover Page title
            if pno == 1 and idx == 0:
                rect = fitz.Rect(55.0, 195.0, 545.0, 245.0)
            elif pno == 1 and idx == 1:
                rect = fitz.Rect(55.0, 275.0, 450.0, 305.0)
                
            page.add_redact_annot(rect, fill=(1, 1, 1))
            
        page.apply_redactions()
        
        # 2. Second pass: Insert translated Vietnamese text
        for idx, it in enumerate(items):
            if idx not in p_trans:
                continue
            vi_text = p_trans[idx]
            bbox = it["bbox"]
            orig_font = it["font"]
            orig_size = it["size"]
            orig_color = it["color"]
            
            rgb = color_to_rgb(orig_color)
            is_bold = "Bold" in orig_font or "bold" in orig_font.lower() or orig_size >= 12.0
            font_path = FONT_BOLD if is_bold else FONT_REGULAR
            font_name = "arialbd" if is_bold else "arial"
            
            # PAGE 1: COVER PAGE
            if pno == 1:
                if idx == 0:
                    # Main Title
                    rect = fitz.Rect(60.0, 195.0, 535.0, 260.0)
                    fs = find_best_font_size(rect, vi_text, FONT_BOLD, start_fs=20.0, min_fs=15.0)
                    page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=FONT_BOLD, fontname="arialbd", color=rgb)
                elif idx == 1:
                    # Subtitle
                    rect = fitz.Rect(60.0, 275.0, 500.0, 310.0)
                    fs = find_best_font_size(rect, vi_text, FONT_BOLD, start_fs=14.0, min_fs=11.0)
                    page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=FONT_BOLD, fontname="arialbd", color=rgb)
                elif idx == 2:
                    # Router architecture tag
                    rect = fitz.Rect(bbox[0], bbox[1], bbox[0] + 120.0, bbox[3] + 2.0)
                    page.insert_text(fitz.Point(bbox[0], bbox[3] - 1.0), vi_text, fontsize=10.0, fontfile=FONT_REGULAR, fontname="arial", color=rgb)
                elif idx == 3:
                    # Author
                    page.insert_text(fitz.Point(280.0, bbox[3] - 1.0), vi_text, fontsize=10.5, fontfile=FONT_REGULAR, fontname="arial", color=rgb)
                continue
                
            # RUNNING HEADERS on Pages 2 to 36
            if idx == 0 and pno >= 2:
                # Left header
                page.insert_text(
                    fitz.Point(68.0, 56.0),
                    vi_text,
                    fontname="arialbd",
                    fontfile=FONT_BOLD,
                    fontsize=8.0,
                    color=rgb
                )
                continue
            elif idx == 1 and pno >= 2:
                # Right header
                page.insert_text(
                    fitz.Point(365.0, 56.0),
                    vi_text,
                    fontname="arial",
                    fontfile=FONT_REGULAR,
                    fontsize=8.0,
                    color=rgb
                )
                continue
                
            # PAGE 2: MỤC LỤC Header
            if pno == 2 and idx in (2, 3):
                if idx == 2:
                    # Insert single centered MỤC LỤC
                    page.insert_text(
                        fitz.Point(260.0, 145.0),
                        "MỤC LỤC",
                        fontname="arialbd",
                        fontfile=FONT_BOLD,
                        fontsize=24.0,
                        color=rgb
                    )
                continue
                
            # TABLE OF CONTENTS (Pages 2 and 3)
            if (pno == 2 and idx >= 4) or (pno == 3 and idx >= 2):
                # Clean TOC entries
                rect = fitz.Rect(bbox[0], bbox[1] - 1.0, 510.0, bbox[3] + 1.0)
                fs = 9.0 if orig_size >= 10.0 else 8.5
                f_path = FONT_BOLD if is_bold else FONT_REGULAR
                f_name = "arialbd" if is_bold else "arial"
                page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=f_path, fontname=f_name, color=rgb)
                continue
                
            # HEADINGS & SECTION TITLES
            if is_bold or orig_size >= 11.2:
                # Expand rect to right margin so Vietnamese text can expand horizontally
                rect = fitz.Rect(bbox[0], bbox[1] - 1.0, 530.0, bbox[3] + 3.0)
                fs = orig_size * 0.95
                fs = find_best_font_size(rect, vi_text, FONT_BOLD, start_fs=fs, min_fs=9.0)
                page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=FONT_BOLD, fontname="arialbd", color=rgb)
                continue
                
            # CAPTIONS (Figures / Tables)
            if "图" in it["text"] or "表" in it["text"] or vi_text.startswith("Hình ") or vi_text.startswith("Bảng "):
                rect = fitz.Rect(bbox[0], bbox[1] - 1.0, max(bbox[2] + 40.0, 500.0), bbox[3] + 2.0)
                fs = orig_size * 0.95
                page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=FONT_BOLD, fontname="arialbd", color=rgb)
                continue
                
            # DIAGRAM SHORT LABELS (e.g. inside Fig 1, 2, 3)
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            if width < 120.0 and height < 30.0:
                rect = fitz.Rect(bbox[0] - 2.0, bbox[1] - 1.0, bbox[2] + 6.0, bbox[3] + 2.0)
                fs = find_best_font_size(rect, vi_text, font_path, start_fs=orig_size * 0.9, min_fs=6.5)
                page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=font_path, fontname=font_name, color=rgb)
                continue
                
            # GENERAL PARAGRAPHS & BULLET POINTS
            # Paragraphs generally span from x0 to 527.2 (or right margin)
            rect = fitz.Rect(bbox[0], bbox[1] - 0.5, max(bbox[2], 527.2), bbox[3] + 1.0)
            start_fs = orig_size * 0.92
            fs = find_best_font_size(rect, vi_text, font_path, start_fs=start_fs, min_fs=7.2)
            page.insert_textbox(rect, vi_text, fontsize=fs, fontfile=font_path, fontname=font_name, color=rgb)

    print(f"Saving compiled PDF to: {output_pdf_path}")
    doc.save(output_pdf_path, garbage=3, deflate=True)
    doc.close()
    print("Done!")

if __name__ == "__main__":
    in_pdf = r"published\1941628-canh-tay-robot-7dof-song-thu\attachments\canh-tay-robot-7dof-bao-cao-ky-thuat.pdf"
    out_pdf = r"published\1941628-canh-tay-robot-7dof-song-thu\attachments\canh-tay-robot-7dof-bao-cao-ky-thuat-tieng-viet.pdf"
    groups = "grouped_chinese.json"
    compile_pdf(in_pdf, out_pdf, groups)
