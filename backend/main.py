from fastapi import FastAPI
from api.parse import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Bank Statement Parser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

app.include_router(router)

