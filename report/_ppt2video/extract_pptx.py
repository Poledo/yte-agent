# -*- coding: utf-8 -*-
"""Rút nội dung từ file .pptx ra JSON: mỗi slide gồm chữ trên slide + ghi chú (notes).
Dùng: python extract_pptx.py <file.pptx>  -> in JSON ra stdout."""
import sys, json
from pptx import Presentation

def slide_text(slide):
    parts = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            t = shape.text_frame.text.strip()
            if t:
                parts.append(t)
    return "\n".join(parts)

def notes_text(slide):
    if not slide.has_notes_slide:
        return ""
    tf = slide.notes_slide.notes_text_frame
    return (tf.text if tf is not None else "").strip()

def main():
    prs = Presentation(sys.argv[1])
    out = []
    for i, slide in enumerate(prs.slides, 1):
        out.append({"n": i, "text": slide_text(slide), "notes": notes_text(slide)})
    sys.stdout.buffer.write(json.dumps(out, ensure_ascii=False, indent=2).encode("utf-8"))

if __name__ == "__main__":
    main()
