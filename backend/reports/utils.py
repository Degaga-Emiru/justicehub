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
        writer = csv.writer(output)
        
        def write_recursive(d, prefix=""):
            if isinstance(d, dict):
                for k, v in d.items():
                    new_prefix = f"{prefix}{k}." if prefix else f"{k}."
                    if isinstance(v, (dict, list)):
                        write_recursive(v, new_prefix)
                    else:
                        writer.writerow([prefix + k, v])
            elif isinstance(d, list):
                for i, item in enumerate(d):
                    write_recursive(item, f"{prefix}[{i}].")
            else:
                writer.writerow([prefix[:-1] if prefix.endswith('.') else prefix, d])

        if isinstance(data, (dict, list)):
            write_recursive(data)
        return output.getvalue().encode('utf-8')

    @staticmethod
    def to_json(data):
        return json.dumps(data, indent=4, default=str).encode('utf-8')

    @staticmethod
    def to_pdf(data, title):
        if not REPORTLAB_AVAILABLE:
            output = f"--- {title} ---\n\n"
            output += json.dumps(data, indent=4, default=str)
            return output.encode('utf-8')

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, height - 80, title)
        p.setFont("Helvetica", 10)
        p.drawString(100, height - 95, f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        y = height - 120
        
        def draw_data(obj, indent=100, label=None):
            nonlocal y
            if y < 50:
                p.showPage()
                y = height - 80
                p.setFont("Helvetica", 10)

            prefix = f"{label}: " if label else ""
            
            if isinstance(obj, dict):
                if label:
                    p.setFont("Helvetica-Bold", 10)
                    p.drawString(indent, y, f"{label}:")
                    p.setFont("Helvetica", 10)
                    y -= 15
                    indent += 15
                for k, v in obj.items():
                    draw_data(v, indent, k)
            elif isinstance(obj, list):
                if label:
                    p.setFont("Helvetica-Bold", 10)
                    p.drawString(indent, y, f"{label}:")
                    p.setFont("Helvetica", 10)
                    y -= 15
                    indent += 15
                for item in obj:
                    draw_data(item, indent)
            else:
                text = f"{prefix}{obj}"
                # Handle long text wrap simple way
                if len(text) > 80:
                    lines = [text[i:i+80] for i in range(0, len(text), 80)]
                    for line in lines:
                        p.drawString(indent, y, line)
                        y -= 15
                        if y < 50:
                            p.showPage()
                            y = height - 80
                else:
                    p.drawString(indent, y, text)
                    y -= 15

        draw_data(data)
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
