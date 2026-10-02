import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    i = 0
    n = len(content)
    
    # Track lines for debugging
    line_no = 1
    col_no = 1
    
    # Store line and column for opened tokens
    token_positions = []
    
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False
    
    escaped = False
    
    while i < n:
        char = content[i]
        
        # Track line/col
        if char == '\n':
            line_no += 1
            col_no = 1
        else:
            col_no += 1
            
        if escaped:
            escaped = False
            i += 1
            continue
            
        # Handle escape sequence in strings
        if char == '\\' and (in_single_quote or in_double_quote or in_backtick):
            escaped = True
            i += 1
            continue
            
        # Handle line comments
        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            i += 1
            continue
            
        # Handle block comments
        if in_block_comment:
            if char == '*' and i + 1 < n and content[i+1] == '/':
                in_block_comment = False
                i += 2
                col_no += 1
            else:
                i += 1
            continue
            
        # Handle comments start
        if not (in_single_quote or in_double_quote or in_backtick):
            if char == '/' and i + 1 < n and content[i+1] == '/':
                in_line_comment = True
                i += 2
                col_no += 1
                continue
            if char == '/' and i + 1 < n and content[i+1] == '*':
                in_block_comment = True
                i += 2
                col_no += 1
                continue
                
        # Handle strings
        if char == "'" and not (in_double_quote or in_backtick):
            in_single_quote = not in_single_quote
            i += 1
            continue
        if char == '"' and not (in_single_quote or in_backtick):
            in_double_quote = not in_double_quote
            i += 1
            continue
        if char == '`' and not (in_single_quote or in_double_quote):
            in_backtick = not in_backtick
            i += 1
            continue
            
        # If in string, skip brace matching
        if in_single_quote or in_double_quote or in_backtick:
            i += 1
            continue
            
        # Handle braces and parentheses
        if char in '({[':
            stack.append(char)
            token_positions.append((char, line_no, col_no - 1))
            if 2880 <= line_no <= 3110:
                print(f"PUSH: '{char}' at line {line_no}, col {col_no - 1}")
        elif char in ')}]':
            if not stack:
                print(f"Error: Unmatched closing token '{char}' at line {line_no}, col {col_no - 1}")
                return False
            
            top = stack.pop()
            top_char, top_line, top_col = token_positions.pop()
            
            if 2880 <= line_no <= 3110 or 3820 <= line_no <= 3835:
                print(f"POP: '{char}' at line {line_no}, col {col_no - 1} matches '{top_char}' from line {top_line}, col {top_col}")
            
            # Check match
            if (char == ')' and top != '(') or (char == '}' and top != '{') or (char == ']' and top != '['):
                print(f"Error: Mismatched closing token '{char}' at line {line_no}, col {col_no - 1}")
                print(f"Opened '{top_char}' at line {top_line}, col {top_col}")
                return False
                
        i += 1
        
    if stack:
        print(f"Error: Unclosed tokens remain:")
        for t, l, c in token_positions[-10:]:
            print(f"  '{t}' opened at line {l}, col {c}")
        return False
        
    print("Success: All braces and parentheses are perfectly balanced!")
    return True

if __name__ == '__main__':
    check_balance(r"D:\CalTrack\calservices\frontend\src\ui\pages\catalog\CatalogPackagesPage.jsx")
