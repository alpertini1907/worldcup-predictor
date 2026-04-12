import zipfile
import xml.etree.ElementTree as ET
import os
import sys

docx_path = r'C:\Users\user\Downloads\WorldCupPredictor_PRD.docx'
extract_dir = r'C:\Users\user\Desktop\dunya kupası\docx_extracted'

# Extract the docx (it's a zip)
with zipfile.ZipFile(docx_path, 'r') as z:
    z.extractall(extract_dir)

# Parse document.xml
doc_xml_path = os.path.join(extract_dir, 'word', 'document.xml')
tree = ET.parse(doc_xml_path)
root = tree.getroot()

# Define namespace
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

# Extract all text
paragraphs = []
for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = []
    for t in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if t.text:
            texts.append(t.text)
    if texts:
        paragraphs.append(''.join(texts))

print('\n'.join(paragraphs))
