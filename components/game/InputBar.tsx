'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { RoadFeature } from '../../types';
import { normalizeRoadName } from '../../lib/roadUtils';
import { useToast } from '../ui/Toast';

interface Props {
  roads: RoadFeature[];
  foundRoads: Set<string>;
  onRoadsFound: (names: string[]) => void;
}

export function InputBar({ roads, foundRoads, onRoadsFound }: Props) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'none' | 'success' | 'error'>('none');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Focus input on '/'
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const checkMatch = useCallback((val: string) => {
    const normalizedVal = normalizeRoadName(val);
    if (normalizedVal.length < 2) return;

    const allMatches = roads.filter(r => r.name.includes(normalizedVal));
    const unfoundMatches = allMatches.filter(r => !foundRoads.has(r.name));

    if (unfoundMatches.length > 0) {
      const uniqueNames = Array.from(new Set(unfoundMatches.map(r => r.name)));
      onRoadsFound(uniqueNames);
      setInput('');
      setStatus('success');
      setTimeout(() => setStatus('none'), 500);
    } else if (allMatches.length > 0) {
      const exactMatch = allMatches.find(r => r.name === normalizedVal);
      if (exactMatch) {
        addToast(`「${exactMatch.name}」已經點亮了！項目`, 'warning');
        setInput('');
      }
    } else {
      // No matches at all
      setStatus('error');
      setTimeout(() => setStatus('none'), 500);
    }
  }, [roads, foundRoads, onRoadsFound, addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (normalizeRoadName(val).length >= 2) {
      timeoutRef.current = setTimeout(() => {
        checkMatch(val);
      }, 300); // 300ms delay
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalizedInput = normalizeRoadName(input);
      if (normalizedInput.length > 0 && normalizedInput.length < 2) {
        // If user presses enter on 1 char, they might be trying to submit, but we need 2 chars or exact match.
        // Let's just check for exact match anyway on enter.
        const exactMatch = roads.find(r => r.name === normalizedInput);
        if (exactMatch) {
          if (!foundRoads.has(exactMatch.name)) {
            onRoadsFound([exactMatch.name]);
            setInput('');
          } else {
            addToast(`「${exactMatch.name}」已找到過了！`, 'warning');
            setInput('');
          }
          return;
        }
      }
      
      if (input.trim()) {
        if (inputRef.current) {
          inputRef.current.classList.add('animate-shake');
          setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 400);
        }
        addToast(`找不到包含「${input.trim()}」的道路`, 'error');
      }
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 pointer-events-none flex justify-center">
      <div className="w-full max-w-2xl relative pointer-events-auto">
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="輸入路名…" 
          className={`w-full p-3 md:p-4 bg-surface border-2 outline-none rounded-xl text-lg md:text-xl font-sans shadow-xl text-text-primary placeholder-text-muted/50 transition-all duration-300 ${
            status === 'success' ? 'border-green-500 scale-[1.02]' : 
            status === 'error' ? 'border-red-500' : 
            'border-border focus:border-cyan'
          }`}
        />
      </div>
    </div>
  );
}
