import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { formatIndianCurrency, parseIndianNumber, formatIndianInteger } from '@/lib/formatNumber';

export function AmountInput({ value, onChange, onBlur, className, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const cursorPositionRef = useRef(0);

  // Format value when not focused or when value changes externally
  useEffect(() => {
    if (!isFocused) {
      if (value !== null && value !== undefined && value !== '' && value !== 0) {
        setDisplayValue(formatIndianCurrency(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleFocus = (e) => {
    setIsFocused(true);
    // Show raw number when focused (without commas for easier editing)
    const numValue = parseIndianNumber(value?.toString() || '');
    setDisplayValue(numValue === 0 ? '' : numValue.toString());
    // Select all text for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Store cursor position before formatting
    cursorPositionRef.current = cursorPos;
    
    // Remove all non-numeric characters except decimal point
    let cleaned = inputValue.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    // Parse the numeric value
    const numericValue = parseIndianNumber(cleaned);
    
    // Format for display in real-time (Indian number system)
    let formattedDisplay = cleaned;
    
    if (cleaned && cleaned !== '.') {
      const [intPart, decPart] = cleaned.split('.');
      
      if (intPart) {
        // Format integer part with Indian numbering system
        const formattedInt = formatIndianInteger(intPart);
        
        if (decPart !== undefined) {
          // Has decimal part
          if (decPart.length <= 2) {
            formattedDisplay = `${formattedInt}.${decPart}`;
          } else {
            formattedDisplay = `${formattedInt}.${decPart.slice(0, 2)}`;
          }
        } else if (cleaned.endsWith('.')) {
          // User just typed decimal point
          formattedDisplay = formattedInt + '.';
        } else {
          // No decimal part
          formattedDisplay = formattedInt;
        }
      }
    }
    
    setDisplayValue(formattedDisplay);
    
    // Calculate new cursor position after formatting
    // Count commas before original cursor position
    const beforeCursor = inputValue.slice(0, cursorPos);
    const commasBefore = (beforeCursor.match(/,/g) || []).length;
    const cleanedBefore = beforeCursor.replace(/,/g, '');
    
    // Count commas in formatted string before equivalent position
    const formattedBefore = formattedDisplay.slice(0, Math.min(cursorPos + (formattedDisplay.length - inputValue.length), formattedDisplay.length));
    const commasAfter = (formattedBefore.match(/,/g) || []).length;
    
    // Adjust cursor position
    const newCursorPos = Math.min(
      cursorPos + (commasAfter - commasBefore),
      formattedDisplay.length
    );
    
    // Send numeric value to parent (without formatting)
    const event = {
      ...e,
      target: {
        ...e.target,
        value: numericValue === 0 ? '' : numericValue.toString(),
        valueAsNumber: numericValue
      }
    };
    
    if (onChange) {
      onChange(event);
    }
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Format on blur with 2 decimal places
    const numValue = parseIndianNumber(displayValue);
    if (numValue > 0) {
      setDisplayValue(formatIndianCurrency(numValue));
    } else {
      setDisplayValue('');
    }
    if (onBlur) onBlur(e);
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={props.placeholder || "0.00"}
    />
  );
}
