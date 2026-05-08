import React, { useState } from "react";
import { useFetch } from "../hooks/useFetch";

/**
 * Example page showing React pattern:
 * - State management for filters
 * - useFetch hook for API calls
 * - Component composition
 */
export default function LessonList() {
  const [hskLevel, setHskLevel] = useState(1);

  const {
    data: lessons,
    loading,
    error,
  } = useFetch(`/lessons?hsk_level=${hskLevel}`, [hskLevel]);

  if (loading)
    return <div className="text-center py-8">Loading lessons...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Bài Học</h1>

      {/* HSK Level Filter */}
      <div className="mb-6">
        <select
          value={hskLevel}
          onChange={(e) => setHskLevel(Number(e.target.value))}
          className="px-4 py-2 border rounded"
        >
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              HSK {level}
            </option>
          ))}
        </select>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons?.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

function LessonCard({ lesson }) {
  return (
    <div className="bg-white p-4 rounded shadow hover:shadow-lg transition">
      <div className="text-3xl mb-2">{lesson.emoji}</div>
      <h3 className="font-bold text-lg">{lesson.title}</h3>
      <p className="text-sm text-gray-600">{lesson.description}</p>
      <div className="mt-4 flex justify-between text-sm text-gray-500">
        <span>⏱️ {lesson.duration_minutes}m</span>
        <span>📚 {lesson.word_count} từ</span>
      </div>
      <button className="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
        Học Ngay
      </button>
    </div>
  );
}
