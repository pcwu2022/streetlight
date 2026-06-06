'use client';
import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const normalizedInput = normalizeRoadName(input);
    if (normalizedInput.length >= 2) {
      const matchingUnfound = roads.filter(r => !foundRoads.has(r.name) && r.name.includes(normalizedInput));
      
      if (matchingUnfound.length > 0) {
        const uniqueNames = Array.from(new Set(matchingUnfound.map(r => r.name)));
        onRoadsFound(uniqueNames);
        setInput('');
      }
    }
  }, [input, roads, foundRoads, onRoadsFound]);

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
    <div className="absolute bottom-0 left-0 w-full p-6 pointer-events-none flex justify-center">
      <div className="w-full max-w-2xl relative pointer-events-auto">
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入路名…（例如：中山）" 
          className="w-full p-4 bg-surface border-2 border-border focus:border-cyan outline-none rounded-xl text-xl font-sans shadow-xl text-text-primary placeholder-text-muted/50 transition-colors"
        />
      </div>
    </div>
  );
}
