from pydantic import BaseModel
from typing import List, Optional

class Transaction(BaseModel):
    id: int
    txn_date: str
    description: str
    debit: Optional[float]
    credit: Optional[float]
    balance: float
    confidence: float
    is_flagged: bool

class Analytics(BaseModel):
    totalCredit: float
    totalDebit: float
    netCashFlow: float
    flaggedCount: int

class ParseResponse(BaseModel):
    bank: str
    transactions: List[Transaction]
    analytics: Analytics
