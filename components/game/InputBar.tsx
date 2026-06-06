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
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (isComposing) return;

    const normalizedVal = normalizeRoadName(val);
    if (normalizedVal.length < 2) {
      if (inputRef.current) {
        inputRef.current.classList.add('animate-shake');
        setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 400);
      }
      addToast('請輸入至少兩個字以進行匹配', 'warning');
      return;
    }

    // Anti-cheat: Ignore pure reserved keywords/types
    const reservedWords = new Set(['路', '街', '大道', '橋', '地下道', '高速公路', '快速道路', '快速公路', '國道', '環線', '支線', '省道', '縣道', '市道', '大道一段', '大道二段', '大道三段', '大道四段', '大道五段', '大道六段', '大道七段', '大道八段', '大道九段', '大道十段']);
    if (reservedWords.has(normalizedVal)) {
      addToast('請輸入具體的道路名稱，不能僅輸入類型', 'warning');
      return;
    }

    const allMatches = roads.filter(r => r.name.startsWith(normalizedVal));
    const unfoundMatches = allMatches.filter(r => !foundRoads.has(r.name));

    if (unfoundMatches.length > 0) {
      const uniqueNames = Array.from(new Set(unfoundMatches.map(r => r.name)));
      onRoadsFound(uniqueNames);
      setStatus('success');
      setTimeout(() => {
        setStatus('none');
        setInput('');
      }, 200);
    } else if (allMatches.length > 0) {
      const exactMatch = allMatches.find(r => r.name === normalizedVal);
      if (exactMatch) {
        addToast(`「${exactMatch.name}」已經點亮了！`, 'warning');
        setInput('');
      } else {
        // If there are partial matches but all found, still show error-like feedback but with hint
        addToast(`包含「${normalizedVal}」的道路皆已找齊`, 'warning');
        setStatus('error');
        setTimeout(() => setStatus('none'), 200);
      }
    } else {
      // No matches at all
      setStatus('error');
      if (inputRef.current) {
        inputRef.current.classList.add('animate-shake');
        setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 400);
      }
      addToast(`找不到以「${normalizedVal}」開頭的道路`, 'error');
      setTimeout(() => {
        setStatus('none');
      }, 200);
    }
  }, [roads, foundRoads, onRoadsFound, addToast, isComposing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      checkMatch(input);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 pointer-events-none flex justify-center">
      <div className="w-full max-w-2xl relative pointer-events-auto flex items-center group">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="輸入路名並按下 Enter…"
          className={`w-full p-3 md:p-4 pr-14 md:pr-16 bg-surface border-2 outline-none rounded-2xl text-lg md:text-xl font-sans shadow-2xl text-text-primary placeholder-text-muted/50 transition-all duration-300 ${status === 'success' ? 'border-green-500 scale-[1.02]' :
            status === 'error' ? 'border-red-500' :
              'border-border focus:border-cyan hover:border-cyan/50'
            }`}
        />
        <button
          onClick={() => checkMatch(input)}
          className={`absolute right-3 p-2 md:p-3 rounded-xl transition-all duration-300 ${input.length >= 2 ? 'bg-cyan text-bg scale-100 opacity-100' : 'bg-border text-text-muted scale-90 opacity-50'
            } hover:scale-110 active:scale-95`}
          title="搜尋 (Enter)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
}
