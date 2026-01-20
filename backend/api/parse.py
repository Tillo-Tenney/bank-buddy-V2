# from fastapi import APIRouter, UploadFile, File, HTTPException
# from services.pdf_loader import extract_text, extract_title
# from services.analytics import detect_bank, compute_analytics
# from services.sbi_parser import parse_sbi
# from services.sib_parser import parse_sib

# router = APIRouter()

# @router.post("/parse")
# async def parse_statement(file: UploadFile = File(...)):
#     try:
#         text = extract_text(file.file)
#         title = extract_title(file.file)
#         print("---- PDF TEXT PREVIEW ----")
#         print(text)
#         print("---- END PREVIEW ----")

#         if not text or len(text.strip()) < 50:
#             raise HTTPException(
#                 status_code=400,
#                 detail={
#                     "code": "TEXT_EXTRACTION_FAILED",
#                     "message": "Unable to extract readable text from PDF"
#                 }
#             )


#         bank = detect_bank(title)

#         if bank == "SBI":
#             txns = parse_sbi(text)
#         elif bank == "SIB":
#             txns = parse_sib(text)
#         else:
#             raise HTTPException(
#                 status_code=400,
#                 detail={
#                     "code": "UNSUPPORTED_BANK",
#                     "message": "Only SBI and South Indian Bank are supported"
#                 }
#             )

#         if not txns:
#             raise HTTPException(
#                 status_code=400,
#                 detail={
#                     "code": "NO_TRANSACTIONS_FOUND",
#                     "message": "No transactions could be parsed from the statement"
#                 }
#             )

#         analytics = compute_analytics(txns)

#         return {
#             "bank": bank,
#             "transactions": txns,
#             "analytics": analytics
#         }

#     except HTTPException:
#         raise

#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail={
#                 "code": "INTERNAL_ERROR",
#                 "message": str(e)
#             }
#         )





from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from services.pdf_loader import extract_text, extract_title
from services.analytics import detect_bank, compute_analytics
from services.sbi_parser import parse_sbi
from services.sib_parser import parse_sib

router = APIRouter()

@router.post("/parse")
async def parse_statement(
    file: UploadFile = File(...),
    password: str | None = Form(None)  # 🔑 ADDED (required for Swagger)
):
    try:
        # 🔑 pass password through (no behavior change if None)
        text = extract_text(file.file, password=password)
        title = extract_title(file.file, password=password)

        print("---- PDF TEXT PREVIEW ----")
        print(text)
        print("---- END PREVIEW ----")

        if not text or len(text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "TEXT_EXTRACTION_FAILED",
                    "message": "Unable to extract readable text from PDF"
                }
            )

        bank = detect_bank(title)

        if bank == "SBI":
            txns = parse_sbi(text)
        elif bank == "SIB":
            txns = parse_sib(text)
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "UNSUPPORTED_BANK",
                    "message": "Only SBI and South Indian Bank are supported"
                }
            )

        if not txns:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "NO_TRANSACTIONS_FOUND",
                    "message": "No transactions could be parsed from the statement"
                }
            )

        analytics = compute_analytics(txns)

        return {
            "bank": bank,
            "transactions": txns,
            "analytics": analytics
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        )
