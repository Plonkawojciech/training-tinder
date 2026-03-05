'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchExercises, EXERCISE_DB } from '@/lib/exercises';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = 'Search exercises...',
}: ExerciseAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length >= 1) {
      setResults(searchExercises(query, 8));
    } else {
      // Show popular exercises when empty
      const popular = [
        'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
        'Pull-Up', 'Barbell Row', 'Leg Press', 'Dumbbell Curl',
      ];
      setResults(popular);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(exercise: string) {
    onChange(exercise);
    setQuery(exercise);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white pl-9 pr-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none placeholder:text-[#444444]"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111111] border border-[#2A2A2A] max-h-64 overflow-y-auto">
          {results.map((exercise) => (
            <button
              key={exercise}
              type="button"
              onClick={() => handleSelect(exercise)}
              className="w-full text-left px-3 py-2 text-sm text-[#888888] hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              {exercise}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
