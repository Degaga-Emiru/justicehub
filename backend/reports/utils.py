import csv
import json
import io
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

class ExportGenerator:
    @staticmethod
    def to_csv(data, filename):
        output = io.StringIO()
        if isinstance(data, dict):
            # Flatten or handle specific dict structure
            writer = csv.writer(output)
            for key, value in data.items():
                if isinstance(value, dict):
                    writer.writerow([key])
                    for k, v in value.items():
                        writer.writerow(['', k, v])
                else:
                    writer.writerow([key, value])
        return output.getvalue().encode('utf-8')

    @staticmethod
    def to_json(data):
        return json.dumps(data, indent=4, default=str).encode('utf-8')

    @staticmethod
    def to_pdf(data, title):
        if not REPORTLAB_AVAILABLE:
            # Fallback to plain text with .pdf extension for demonstration
            output = f"--- {title} ---\n\n"
            output += json.dumps(data, indent=4, default=str)
            return output.encode('utf-8')

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, height - 100, title)
        
        p.setFont("Helvetica", 12)
        y = height - 130
        
        def draw_dict(d, indent=100):
            nonlocal y
            for key, value in d.items():
                if y < 100:
                    p.showPage()
                    y = height - 100
                    p.setFont("Helvetica", 12)
                
                if isinstance(value, dict):
                    p.drawString(indent, y, f"{key}:")
                    y -= 20
                    draw_dict(value, indent + 20)
                else:
                    p.drawString(indent, y, f"{key}: {value}")
                    y -= 20

        if isinstance(data, dict):
            draw_dict(data)
            
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
