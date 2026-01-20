# from fastapi import FastAPI
# from api.parse import router
# from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI(title="Bank Statement Parser API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# def health_check():
#     return {
#         "status": "ok",
#         "service": "bank-statement-parser",
#         "message": "API is running"
#     }

# app.include_router(router)






import re
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from services.pdf_loader import extract_text, extract_title_upload, PasswordRequiredException
from services.sbi_parser import parse_sbi
from services.sib_parser import parse_sib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "bank-statement-parser",
        "message": "API is running"
    }

# @app.post("/parse")
# async def parse_statement(
#     file: UploadFile = File(...), 
#     password: str = Form("")
# ):
#     try:
#         # Read file content
#         content = await file.read()
        
#         # Create a file-like object
#         from io import BytesIO
#         pdf_file = BytesIO(content)
        
#         # 1. Extract Text (Pass password if provided)
#         try:
#             text = extract_title_upload(pdf_file, password=password)
#         except PasswordRequiredException:
#             return JSONResponse(
#                 status_code=422,
#                 content={
#                     "detail": {
#                         "code": "PASSWORD_REQUIRED",
#                         "message": "This file is password protected. Please provide a password."
#                     }
#                 }
#             )
        
#         # Reset file pointer for second read
#         pdf_file.seek(0)

#         # 2. Identify Bank

#         raw_text = text.upper()
#         normalized = re.sub(r"[^A-Z]", "", raw_text)

#         bank_type = "UNKNOWN"

#         # South Indian Bank detection
#         if "SOUTHINDIANBANK" in normalized:
#             bank_type = "SIB"

#         # SBI detection
#         elif "STATEBANKOFINDIA" in normalized:
#             bank_type = "SBI"


#         # 3. Parse Transactions
#         transactions = []
#         text = extract_text(pdf_file, password=password)
#         if bank_type == "SBI":
#             transactions = parse_sbi(text)
#         elif bank_type == "SIB":
#             transactions = parse_sib(text)
#         else:
#             pass

#         if not transactions:
#              return JSONResponse(
#                 status_code=422,
#                 content={"detail": {"code": "NO_TRANSACTIONS", "message": "No transactions found."}}
#             )

#         # 4. Analytics
#         total_credit = sum(t['credit'] or 0 for t in transactions)
#         total_debit = sum(t['debit'] or 0 for t in transactions)
        
#         return {
#             "bank": bank_type,
#             "transactions": transactions,
#             "analytics": {
#                 "totalCredit": total_credit,
#                 "totalDebit": total_debit,
#                 "netCashFlow": total_credit - total_debit,
#                 "flaggedCount": len([t for t in transactions if t['is_flagged']])
#             }
#         }

#     except Exception as e:
#         print(f"Error: {str(e)}")
#         raise HTTPException(status_code=500, detail={"message": str(e)})
#
@app.post("/parse")
async def parse_statement(
    file: UploadFile = File(...), 
    password: str = Form("")
):
    pdf_file = None
    try:
        # Read file content
        content = await file.read()
        print(f"[DEBUG] File received: {file.filename}, Size: {len(content)} bytes")
        
        # Create a file-like object
        from io import BytesIO
        pdf_file = BytesIO(content)
        
        # 1. Extract Text (Pass password if provided)
        print(f"[DEBUG] Attempting to extract title with password: {'Yes' if password else 'No'}")
        try:
            text = extract_title_upload(pdf_file, password=password)
            print(f"[DEBUG] Title extracted successfully. Length: {len(text)}")
        except PasswordRequiredException as e:
            print(f"[DEBUG] Password required error: {str(e)}")
            return JSONResponse(
                status_code=422,
                content={
                    "detail": {
                        "code": "PASSWORD_REQUIRED",
                        "message": "This file is password protected. Please provide a password."
                    }
                }
            )
        except Exception as e:
            print(f"[ERROR] Title extraction failed: {type(e).__name__}: {str(e)}")
            raise

        # Reset file pointer for second read
        pdf_file.seek(0)
        print("[DEBUG] File pointer reset to beginning")

        # 2. Identify Bank
        raw_text = text.upper()
        normalized = re.sub(r"[^A-Z]", "", raw_text)
        print(f"[DEBUG] Normalized text preview: {normalized[:100]}")

        bank_type = "UNKNOWN"

        #South Indian Bank detection
        if "SOUTHINDIANBANK" in normalized:
            bank_type = "SIB"
            print("[DEBUG] Detected bank: South Indian Bank (SIB)")

        # SBI detection
        elif "STATEBANKOFINDIA" in normalized:
            bank_type = "SBI"
            print("[DEBUG] Detected bank: State Bank of India (SBI)")
        else:
            print(f"[DEBUG] Bank not detected. Normalized text: {normalized[:200]}")

        # 3. Parse Transactions
        print(f"[DEBUG] Starting transaction parsing for {bank_type}")
        transactions = []
        
        try:
            text = extract_text(pdf_file, password=password)
            print(f"[DEBUG] Full text extracted successfully. Length: {len(text)}")
        except Exception as e:
            print(f"[ERROR] Text extraction failed: {type(e).__name__}: {str(e)}")
            raise
            
        if bank_type == "SBI":
            print("[DEBUG] Using SBI parser")
            transactions = parse_sbi(text)
        elif bank_type == "SIB":
            print("[DEBUG] Using SIB parser")
            transactions = parse_sib(text)
        else:
            print("[DEBUG] No parser available for UNKNOWN bank type")
            pass

        print(f"[DEBUG] Transactions parsed: {len(transactions)}")

        if not transactions:
            print("[DEBUG] No transactions found, returning error")
            return JSONResponse(
                status_code=422,
                content={"detail": {"code": "NO_TRANSACTIONS", "message": "No transactions found."}}
            )

        # 4. Analytics
        total_credit = sum(t['credit'] or 0 for t in transactions)
        total_debit = sum(t['debit'] or 0 for t in transactions)
        
        print(f"[DEBUG] Analytics: Credit={total_credit}, Debit={total_debit}")
        
        response_data = {
            "bank": bank_type,
            "transactions": transactions,
            "analytics": {
                "totalCredit": total_credit,
                "totalDebit": total_debit,
                "netCashFlow": total_credit - total_debit,
                "flaggedCount": len([t for t in transactions if t['is_flagged']])
            }
        }
        
        print("[DEBUG] Request completed successfully")
        return response_data

    except PasswordRequiredException as e:
        print(f"[ERROR] Password required: {str(e)}")
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "PASSWORD_REQUIRED",
                    "message": str(e)
                }
            }
        )
    except Exception as e:
        print(f"[ERROR] Unhandled exception: {type(e).__name__}")
        print(f"[ERROR] Message: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500, 
            detail={
                "message": f"{type(e).__name__}: {str(e)}",
                "type": type(e).__name__
            }
        )
    finally:
        if pdf_file:
            pdf_file.close()
            print("[DEBUG] PDF file handle closed")
