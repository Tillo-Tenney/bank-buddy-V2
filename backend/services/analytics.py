import re

def detect_bank(text: str) -> str:
    if not text:
        return "UNKNOWN"

    t = text.upper()

    sbi_patterns = [
        r"STATE\s+BANK\s+OF\s+INDIA",
        r"\bSBI\b",
        r"STATE\s+BANK"
    ]

    sib_patterns = [
        r"SOUTH\s+INDIAN\s+BANK",
        r"\bSIB\b"
    ]

    for p in sbi_patterns:
        if re.search(p, t):
            return "SBI"

    for p in sib_patterns:
        if re.search(p, t):
            return "SIB"

    return "UNKNOWN"


def compute_analytics(transactions):
    total_credit = sum(t["credit"] or 0 for t in transactions)
    total_debit = sum(t["debit"] or 0 for t in transactions)

    return {
        "totalCredit": total_credit,
        "totalDebit": total_debit,
        "netCashFlow": total_credit - total_debit,
        "flaggedCount": sum(1 for t in transactions if t["is_flagged"])
    }
