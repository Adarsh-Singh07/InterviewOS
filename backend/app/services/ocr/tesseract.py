import os
import io
import pytesseract
from PIL import Image
import pdfplumber

# Make sure tesseract is installed on the host system.
# For local dev on windows, tesseract_cmd might need to be pointed to the executable.
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_image(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(image)
    return text

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
            else:
                # Fallback to OCR if page has no text layer
                im = page.to_image()
                # Get the PIL image and run OCR
                pil_im = im.original
                text += pytesseract.image_to_string(pil_im) + "\n"
    return text

def process_document(filename: str, file_bytes: bytes, mime_type: str) -> str:
    if "pdf" in mime_type:
        return extract_text_from_pdf(file_bytes)
    elif "image" in mime_type:
        return extract_text_from_image(file_bytes)
    elif "text" in mime_type or filename.endswith(".md") or filename.endswith(".txt"):
        return file_bytes.decode("utf-8")
    else:
        raise ValueError("Unsupported file type for OCR/extraction")
