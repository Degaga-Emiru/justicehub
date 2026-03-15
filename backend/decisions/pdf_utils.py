import io
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from pypdf import PdfWriter, PdfReader

def append_visual_signature(input_pdf_path, output_pdf_path, judge_name, date_signed, signature_id, algorithm="RSA-SHA256"):
    """
    Appends a visual signature box to the bottom of the last page of a PDF.
    """
    # 1. Read the existing PDF
    reader = PdfReader(input_pdf_path)
    writer = PdfWriter()
    
    # Copy all pages to the writer
    for page in reader.pages:
        writer.add_page(page)
    
    # Get the last page to determine dimensions
    last_page = reader.pages[-1]
    width = float(last_page.mediabox.width)
    height = float(last_page.mediabox.height)
    
    # 2. Create the signature box overlay using ReportLab
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(width, height))
    
    # Draw signature box at the bottom
    box_width = 400
    box_height = 120
    x_offset = (width - box_width) / 2
    y_offset = 30  # Margin from bottom
    
    # Draw border
    can.setStrokeColor(colors.black)
    can.setLineWidth(1)
    can.rect(x_offset, y_offset, box_width, box_height)
    
    # Content
    can.setFont("Helvetica-Bold", 10)
    can.drawString(x_offset + 10, y_offset + box_height - 15, "DIGITAL SIGNATURE")
    
    can.setFont("Helvetica", 9)
    can.drawString(x_offset + 10, y_offset + box_height - 35, f"Digitally Signed by: {judge_name}")
    can.drawString(x_offset + 10, y_offset + box_height - 50, f"Date Signed: {date_signed}")
    can.drawString(x_offset + 10, y_offset + box_height - 65, f"Signature ID: {signature_id}")
    can.drawString(x_offset + 10, y_offset + box_height - 80, f"Algorithm: {algorithm}")
    
    can.setFont("Helvetica-Oblique", 8)
    can.drawString(x_offset + 10, y_offset + 25, "This court decision has been digitally signed.")
    can.drawString(x_offset + 10, y_offset + 15, "Any modification to this document will invalidate the signature.")
    
    can.save()
    packet.seek(0)
    
    # 3. Merge overlay onto the last page
    overlay_reader = PdfReader(packet)
    overlay_page = overlay_reader.pages[0]
    
    # Merge overlay with the last page of the writer
    writer.pages[-1].merge_page(overlay_page)
    
    # 4. Write the result
    with open(output_pdf_path, "wb") as f:
        writer.write(f)
    
    return output_pdf_path
