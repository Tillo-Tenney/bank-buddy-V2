# import re

# def parse_sib(text: str):
#     transactions = []
    
#     # --- PHASE 1: PRE-PROCESSING (Global Cleanup) ---
    
#     # 1. Fix Stuttering Text (e.g. "SSSTTTAAA" -> "STA")
#     text = re.sub(r'([A-Z])\1{2,}', r'\1', text)
    
#     # 2. Dynamic Noise Removal (Line-based)
#     clean_lines = []
#     raw_lines = text.splitlines()
    
#     LINE_NOISE_PATTERNS = [
#         r"Page\s+Total", 
#         r"Grand\s+Total", 
#         r"Statement\s+of\s+Account", 
#         r"Account\s+Summary",
#         r"Opening\s+Balance",
#         r"Closing\s+Balance",
#         r"Page\s+\d+\s+of\s+\d+",
#         r"Customer\s+ID",
#         r"Branch\s+Code",
#         r"Visit\s+us\s+at",
#         r"System\s+Generated",
#         r"IFSC\s*:",
#         r"DATE\s+PARTICULARS",
#         r"WITHDRAWALS\s+DEPOSITS"
#     ]
    
#     for line in raw_lines:
#         clean_line = " ".join(line.split())
#         is_noise = False
#         for pat in LINE_NOISE_PATTERNS:
#             if re.search(pat, clean_line, re.IGNORECASE):
#                 is_noise = True
#                 break
#         if not is_noise:
#             clean_lines.append(line)

#     cleaned_text = "\n".join(clean_lines)
    
#     # --- PHASE 2: CHUNKING ---
#     chunk_pattern = r"(?m)^\s*(?=\d{2}-\d{2}-\d{2}(?!\d))" 
#     chunks = re.split(chunk_pattern, cleaned_text)

#     txn_id = 1
#     previous_balance = None
    
#     amount_pattern = re.compile(r"[\d,]+\.\d{2}(?:[Cc][Rr]|[Dd][Rr])?")

#     for chunk in chunks:
#         if not chunk.strip(): continue

#         # 1. Validate Date
#         date_match = re.match(r"^\s*(\d{2}-\d{2}-\d{2})", chunk)
#         if not date_match: continue
        
#         date_str = date_match.group(1)
        
#         # 2. Extract Money
#         money_matches = amount_pattern.findall(chunk)
#         if len(money_matches) < 2: continue
            
#         balance_str = money_matches[-1]
#         amount_str = money_matches[-2]  
        
#         def parse_amt(val):
#             val = val.upper().replace(",", "").replace("CR", "").replace("DR", "").strip()
#             try: return float(val)
#             except: return 0.0

#         balance = parse_amt(balance_str)
#         amount = parse_amt(amount_str)

#         # 3. Debit vs Credit
#         debit = None
#         credit = None
#         is_debit = True 
        
#         upper_chunk = chunk.upper()
#         if any(x in upper_chunk for x in [" BY ", "CR/", "DEPOSIT", "CREDIT", "NEFT", "RTGS BY"]):
#             is_debit = False
#         if any(x in upper_chunk for x in [" TO ", "DR/", "WITHDRAWAL", "DEBIT", "RTGS TO", "ATM"]):
#             is_debit = True

#         if previous_balance is not None:
#             if abs(previous_balance - amount - balance) < 5.0:
#                 is_debit = True
#             elif abs(previous_balance + amount - balance) < 5.0:
#                 is_debit = False

#         if is_debit: debit = amount
#         else: credit = amount

#         # --- PHASE 3: CLEAN DESCRIPTION & REF NO ---
        
#         # A. Create a "Rough" Description by removing Date/Amounts
#         flat_chunk = chunk.replace("\n", " ")
#         temp_text = flat_chunk.replace(date_str, "").replace(balance_str, "").replace(amount_str, "")
        
#         # B. REMOVE FOOTER GARBAGE *BEFORE* LOOKING FOR REF NO
#         # This prevents "111888" or Phone numbers from being mistaken as Ref No.
        
#         FOOTER_TRIGGERS = [
#             r"IFSC\s*:",                
#             r"PIN\s*:\s*\d{6}",         
#             r"Ph\s*:\s*\d+",            
#             r"\S+@\S+\.\S+",            
#             r"GATE\s+NO",               
#             r"DATE\s*:",                
#             r"PAGE\s*:",
#             r"Date/Time\s*:",       
#             r"This\s+is\s+a",       
#             r"C/O\s",                   
#             r"Br\.\s*mail\s*id",
#             r"Statement\s+of",
#             r"Account\s+Summary",
#             r"Period\s+From",
#             r"-{3,}" # Catches "---111222---"
#         ]
        
#         cut_index = len(temp_text)
#         for trigger in FOOTER_TRIGGERS:
#             match = re.search(trigger, temp_text, re.IGNORECASE)
#             if match:
#                 if match.start() < cut_index:
#                     cut_index = match.start()
        
#         # Chop off the footer
#         clean_desc_text = temp_text[:cut_index]

#         # C. EXTRACT REF NO (Only from the CLEAN text)
#         chq_no = ""
#         # Look for 6-12 digit number
#         chq_match = re.search(r"\b(\d{6,12})\b", clean_desc_text)
#         if chq_match:
#             chq_no = chq_match.group(1)
#             # Remove from description
#             clean_desc_text = clean_desc_text.replace(chq_no, "")

#         # D. Final Polish
#         description = clean_desc_text.strip()
#         description = description.replace("|", "").strip()
#         description = description.replace("RRN-", "") # Clean artifacts
#         description = description.replace("//", "/")
#         description = " ".join(description.split())
#         if description.endswith("/"):
#             description = description[:-1]

#         txn = {
#             "id": txn_id,
#             "txn_date": date_str,
#             "description": description,
#             "ref_no": chq_no if chq_no else None,
#             "debit": debit,
#             "credit": credit,
#             "balance": balance,
#             "confidence": 1.0, 
#             "is_flagged": False
#         }

#         transactions.append(txn)
#         previous_balance = balance
#         txn_id += 1

#     return transactions


import re

def parse_sib(text: str):
    transactions = []
    
    # --- PHASE 1: PRE-PROCESSING (Global Cleanup) ---
    text = re.sub(r'([A-Z])\1{2,}', r'\1', text)
    
    clean_lines = []
    raw_lines = text.splitlines()
    
    LINE_NOISE_PATTERNS = [
        r"Page\s+Total", r"Grand\s+Total", r"Statement\s+of\s+Account", 
        r"Account\s+Summary", r"Opening\s+Balance", r"Closing\s+Balance",
        r"Page\s+\d+\s+of\s+\d+", r"Customer\s+ID", r"Branch\s+Code",
        r"Visit\s+us\s+at", r"System\s+Generated", r"IFSC\s*:",
        r"DATE\s+PARTICULARS", r"WITHDRAWALS\s+DEPOSITS"
    ]
    
    for line in raw_lines:
        clean_line = " ".join(line.split())
        is_noise = False
        for pat in LINE_NOISE_PATTERNS:
            if re.search(pat, clean_line, re.IGNORECASE):
                is_noise = True
                break
        if not is_noise:
            clean_lines.append(line)

    cleaned_text = "\n".join(clean_lines)
    
    # --- PHASE 2: CHUNKING ---
    chunk_pattern = r"(?m)^\s*(?=\d{2}-\d{2}-\d{2}(?!\d))" 
    chunks = re.split(chunk_pattern, cleaned_text)

    txn_id = 1
    previous_balance = None
    
    amount_pattern = re.compile(r"[\d,]+\.\d{2}(?:[Cc][Rr]|[Dd][Rr])?")

    for chunk in chunks:
        if not chunk.strip(): continue

        # 1. Validate Date
        date_match = re.match(r"^\s*(\d{2}-\d{2}-\d{2})", chunk)
        if not date_match: continue
        
        date_str = date_match.group(1)
        
        # 2. Extract Money
        money_matches = amount_pattern.findall(chunk)
        if len(money_matches) < 2: continue
            
        balance_str = money_matches[-1]
        amount_str = money_matches[-2]  
        
        def parse_amt(val):
            val = val.upper().replace(",", "").replace("CR", "").replace("DR", "").strip()
            try: return float(val)
            except: return 0.0

        balance = parse_amt(balance_str)
        amount = parse_amt(amount_str)

        # 3. Debit vs Credit (BEST FIT MATH)
        is_debit = None

        if previous_balance is not None:
            # Calculate error margin for both scenarios
            diff_if_debit = abs(previous_balance - amount - balance)
            diff_if_credit = abs(previous_balance + amount - balance)
            
            # Pick the scenario with the smaller error (closest to 0)
            if diff_if_debit < diff_if_credit and diff_if_debit < 5.0:
                is_debit = True
            elif diff_if_credit < diff_if_debit and diff_if_credit < 5.0:
                is_debit = False
            
            # If both are suspiciously close (unlikely) or math failed, leave as None to trigger fallback

        # Fallback
        if is_debit is None:
            is_debit = guess_debit_credit_fallback(chunk)

        if is_debit: 
            debit = amount
            credit = None
        else: 
            debit = None
            credit = amount

        # --- PHASE 3: CLEAN DESCRIPTION & REF NO ---
        flat_chunk = chunk.replace("\n", " ")
        temp_text = flat_chunk.replace(date_str, "").replace(balance_str, "").replace(amount_str, "")
        
        FOOTER_TRIGGERS = [
            r"IFSC\s*:", r"PIN\s*:\s*\d{6}", r"Ph\s*:\s*\d+", r"\S+@\S+\.\S+",            
            r"GATE\s+NO", r"DATE\s*:", r"PAGE\s*:", r"Date/Time\s*:",       
            r"This\s+is\s+a", r"C/O\s", r"Br\.\s*mail\s*id", r"Statement\s+of",
            r"Account\s+Summary", r"Period\s+From", r"-{3,}"
        ]
        
        cut_index = len(temp_text)
        for trigger in FOOTER_TRIGGERS:
            match = re.search(trigger, temp_text, re.IGNORECASE)
            if match:
                if match.start() < cut_index:
                    cut_index = match.start()
        
        clean_desc_text = temp_text[:cut_index]

        # Extract Ref No from clean text
        chq_no = ""
        chq_match = re.search(r"\b(\d{6,12})\b", clean_desc_text)
        if chq_match:
            chq_no = chq_match.group(1)
            clean_desc_text = clean_desc_text.replace(chq_no, "")

        # Final Polish
        description = clean_desc_text.strip()
        description = description.replace("|", "").strip()
        description = description.replace("RRN-", "")
        description = description.replace("//", "/")
        description = " ".join(description.split())
        if description.endswith("/"):
            description = description[:-1]

        txn = {
            "id": txn_id,
            "txn_date": date_str,
            "description": description,
            "ref_no": chq_no if chq_no else None,
            "debit": debit,
            "credit": credit,
            "balance": balance,
            "confidence": 1.0, 
            "is_flagged": False
        }

        transactions.append(txn)
        previous_balance = balance
        txn_id += 1

    return transactions

def guess_debit_credit_fallback(text):
    upper_text = text.upper()
    if any(x in upper_text for x in [" BY ", "CR/", "DEPOSIT", "CREDIT", "NEFT", "RTGS BY"]):
        return False
    if any(x in upper_text for x in [" TO ", "DR/", "WITHDRAWAL", "DEBIT", "RTGS TO", "ATM", "CHARGES"]):
        return True
    
    # Ambiguous Fallback: Check for Refund/Reversal patterns
    if "REFUND" in upper_text or "REV" in upper_text:
        return False
        
    return True
