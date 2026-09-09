import json
from docx import Document
from docx.shared import Cm, Pt, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

with open("/tmp/shuffled_50.json", encoding="utf-8") as f:
    questions = json.load(f)

doc = Document()

# Set default font Times New Roman 11pt via docDefaults + Normal style
style = doc.styles['Normal']
style.font.name = 'Times New Roman'
style.font.size = Pt(11)
rpr = style.element.get_or_add_rPr()
rFonts = rpr.find(qn('w:rFonts'))
if rFonts is None:
    rFonts = OxmlElement('w:rFonts')
    rpr.append(rFonts)
rFonts.set(qn('w:ascii'), 'Times New Roman')
rFonts.set(qn('w:hAnsi'), 'Times New Roman')
rFonts.set(qn('w:cs'), 'Times New Roman')

section = doc.sections[0]
section.page_width = Cm(21.0)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.0)
section.bottom_margin = Cm(0.5)
section.left_margin = Cm(1.0)
section.right_margin = Cm(0.5)

# 2 columns, space 720 twips (0.5in)
sectPr = section._sectPr
cols = OxmlElement('w:cols')
cols.set(qn('w:num'), '2')
cols.set(qn('w:space'), '720')
sectPr.append(cols)

def add_run(p, text, bold=False, size=11):
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(size)
    r.bold = bold
    return r

# Header
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(2)
add_run(p, "TRUTH CLASS — TRACK SBY", bold=True)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(2)
add_run(p, "ROMA-KORINTUS (MESSAGE 7-9)", bold=True)

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(6)
add_run(p, "Nama:", bold=True)
add_run(p, "_______________________________________")

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(6)
add_run(p, "Angkatan:", bold=True)
add_run(p, "____________")
add_run(p, "Tanggal:", bold=True)
add_run(p, "________________")

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(6)
add_run(p, "Total Benar: ", bold=True)
add_run(p, "___ / 50", bold=True)

# Questions
for i, q in enumerate(questions, start=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(11)
    p.paragraph_format.space_after = Pt(0)
    add_run(p, f"{i}. ", bold=True)
    add_run(p, q["stem"], bold=False)

    for letter, opt in zip("ABCD", q["final_options"]):
        po = doc.add_paragraph()
        po.paragraph_format.left_indent = Emu(266700)
        po.paragraph_format.space_before = Pt(0)
        po.paragraph_format.space_after = Pt(0)
        add_run(po, f"{letter}. ")
        add_run(po, opt)

# Naming convention: [Tahun ke-] - [SUBJECT TEST (sequence)] - [Period Tahun] - [Cabang]
# e.g. "1ST YR - TRUTH TEST (2) - JULDES 2026 - SURABAYA.docx"
doc.save("/tmp/1ST YR - TRUTH TEST (2) - JULDES 2026 - SURABAYA.docx")
print("saved exam")
