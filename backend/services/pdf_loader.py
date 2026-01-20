import pdfplumber
import pytesseract
from PIL import Image
import io
from pdfminer.pdfdocument import PDFPasswordIncorrect, PDFTextExtractionNotAllowed
from pdfminer.psparser import PSSyntaxError

class PasswordRequiredException(Exception):
    pass

from pdfplumber.utils.exceptions import PdfminerException

def extract_title_upload(pdf_file, password=None):
    title = ""
    try:
        with pdfplumber.open(pdf_file, password=password or "") as pdf:
            all_pages = pdf.pages
            if len(all_pages) <= 4:
                pages_to_read = all_pages
            else:
                pages_to_read = all_pages[:2] + all_pages[-2:]
            for page in pages_to_read:
                text = page.extract_text()
                if text:
                    title += text + "\n"
    except PdfminerException as e:
        # pdfplumber wraps PDFPasswordIncorrect in PdfminerException
        # Check if the cause is a password error
        if hasattr(e, '__cause__'):
            cause_name = type(e.__cause__).__name__
            if 'Password' in cause_name or cause_name == 'PDFPasswordIncorrect':
                raise PasswordRequiredException("File is password protected")
        raise PasswordRequiredException("File is password protected")
    except (PDFPasswordIncorrect, PDFTextExtractionNotAllowed, PSSyntaxError):
        raise PasswordRequiredException("File is password protected")
    except Exception as e:
        error_str = str(e).lower()
        if "password" in error_str or "encrypt" in error_str:
            raise PasswordRequiredException("File is password protected")
        raise e
    return title

def extract_text(pdf_file, password=None):
    text = ""
    
    try:
        # Attempt to open with password (default empty string if None)
        with pdfplumber.open(pdf_file, password=password or "") as pdf:
            
            # --- INTELLIGENT STRATEGY SELECTION (The Fix) ---
            # We peek at the first page to determine the best extraction method.
            # SIB works best with Visual Layout (layout=True).
            # SBI works best with Grid Tables (extract_tables).
            
            use_visual_mode = False # Default to Table Mode (better for SBI)
            
            if len(pdf.pages) > 0:
                try:
                    first_page_text = pdf.pages[0].extract_text() or ""
                    # Check for SIB identifiers
                    if "South Indian Bank" in first_page_text or "SIB" in first_page_text or "SIBL" in first_page_text:
                        use_visual_mode = True
                except:
                    pass # Fallback to default if first page read fails

            for page in pdf.pages:
                # --- STRATEGY A: SIB (Visual Layout) ---
                # If we identified this as SIB, we strictly use visual layout.
                # This prevents Table Extraction from mangling the data.
                if use_visual_mode:
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        text += page_text + "\n"
                    continue

                # --- STRATEGY B: SBI / Generic (Grid Tables) ---
                # For SBI, we prefer extracting grid tables to handle column alignment.
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
                    # Fallback for pages without tables (even in SBI)
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        text += page_text + "\n"

    except PDFPasswordIncorrect:
        raise PasswordRequiredException("File is password protected")
    except Exception as e:
        # Catch generic pypdf/pdfminer errors related to encryption
        if "password" in str(e).lower() or "encrypt" in str(e).lower():
             raise PasswordRequiredException("File is password protected")
        raise e

    # OCR Fallback
    if len(text.strip()) < 50:
        pdf_file.seek(0)
        text = ocr_pdf(pdf_file)

    return text

def extract_title(pdf_file):
    title = ""
    try:
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
    except:
        pass
    return title

def ocr_pdf(pdf_file):
    extracted_text = ""
    try:
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                image = page.to_image(resolution=300).original
                ocr_text = pytesseract.image_to_string(image)
                extracted_text += ocr_text + "\n"
    except:
        return ""
    return extracted_text