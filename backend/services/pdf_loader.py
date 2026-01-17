import pdfplumber
import pytesseract
from PIL import Image
import io

def extract_text(pdf_file):
    text = ""
    
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            # --- STRATEGY 1: Grid Tables (Perfect for SBI) ---
            tables = page.extract_tables()
            
            # Check if we found a valid table (at least 3 columns)
            is_valid_table = False
            if tables and len(tables) > 0:
                if len(tables[0]) > 0 and len(tables[0][0]) >= 3:
                    is_valid_table = True

            if is_valid_table:
                for table in tables:
                    for row in table:
                        # Clean each cell
                        clean_row = [
                            str(cell).replace("\n", " ").strip() if cell is not None else "" 
                            for cell in row
                        ]
                        # USE PIPES '|' FOR SBI (Reliable Column Splitting)
                        text += " | ".join(clean_row) + "\n"
            else:
                # --- STRATEGY 2: Visual Layout (Perfect for SIB) ---
                # SIB has no grid lines, so we read text visually
                page_text = page.extract_text(layout=True)
                if page_text:
                    text += page_text + "\n"

    # OCR Fallback
    if len(text.strip()) < 50:
        pdf_file.seek(0)
        text = ocr_pdf(pdf_file)

    return text

def extract_title(pdf_file):
    title = ""
    with pdfplumber.open(pdf_file) as pdf:
        all_pages = pdf.pages
        if len(all_pages) <= 4:
            pages_to_read = all_pages
        else:
            pages_to_read = all_pages[:2] + all_pages[-2:]
        for page in pages_to_read:
            text = page.extract_text()
            if text:
                title += text + "\n"
    return title

def ocr_pdf(pdf_file):
    extracted_text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            image = page.to_image(resolution=300).original
            ocr_text = pytesseract.image_to_string(image)
            extracted_text += ocr_text + "\n"
    return extracted_text
