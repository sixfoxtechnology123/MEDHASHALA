import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axios";

const MockTestAttempt = () => {
  const { subjectId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [savedMap, setSavedMap] = useState({});
  const [markedMap, setMarkedMap] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeSet, setActiveSet] = useState(null);
  const mathRef = useRef(null);

  const typesetMath = (root) => {
    if (!root) return;
    if (!window.MathJax || !window.MathJax.typesetPromise) {
      setTimeout(() => typesetMath(root), 200);
      return;
    }
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([root]);
    window.MathJax.typesetPromise([root]);
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `/master/mock-test/attempt-questions?subjectId=${encodeURIComponent(subjectId)}`
        );
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setQuestions(rows);
        setActiveSet(res.data?.set || null);
        setAnswers({});
        setSavedMap({});
        setMarkedMap({});
        setCurrentIndex(0);
        setSubmitted(false);
        setElapsedSec(0);
      } catch (err) {
        setError(err?.response?.data?.message || "FAILED TO LOAD QUESTIONS");
      } finally {
        setLoading(false);
      }
    };
    if (subjectId) loadQuestions();
  }, [subjectId]);

  useEffect(() => {
    if (submitted || loading) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, loading]);

  useEffect(() => {
    typesetMath(mathRef.current);
  }, [currentIndex, questions, submitted, loading]);

  const score = useMemo(() => {
    let correct = 0;
    let totalMarks = 0;
    let obtained = 0;
    const perQuestion = {};
    for (const q of questions) {
      const m = Number(q.marks || 1);
      const neg = Number(q.negativeMarks || 0);
      totalMarks += m;
      const ans = answers[q._id] || "";
      if (ans === q.correctOption) {
        correct += 1;
        obtained += m;
        perQuestion[q._id] = +m;
      } else if (ans) {
        obtained -= neg;
        perQuestion[q._id] = -neg;
      } else {
        perQuestion[q._id] = 0;
      }
    }
    return { correct, total: questions.length, totalMarks, obtained, perQuestion };
  }, [answers, questions]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const selected = currentQuestion ? answers[currentQuestion._id] || "" : "";

  const renderImages = (images) => {
    const list = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!list.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {list.map((img, idx) => (
          <div key={`${img}-${idx}`} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-white">
            <img src={img} alt="question" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  };

  const saveCurrentAnswer = () => {
    if (!currentQuestion) return;
    if (!answers[currentQuestion._id]) return;
    setSavedMap((prev) => ({ ...prev, [currentQuestion._id]: true }));
  };

  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    saveCurrentAnswer();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmitWithWarning = () => {
    const ok = window.confirm("Are you sure you want to submit the test?");
    if (!ok) return;
    setSubmitted(true);
  };

  const handleMarkForReview = () => {
    if (!currentQuestion) return;
    setMarkedMap((prev) => ({ ...prev, [currentQuestion._id]: !prev[currentQuestion._id] }));
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: "" }));
    setSavedMap((prev) => ({ ...prev, [currentQuestion._id]: false }));
  };

  const getQuestionStatusClass = (q, idx) => {
    if (markedMap[q._id]) return "bg-violet-500 text-white border-violet-600"; // marked for review
    if (savedMap[q._id]) return "bg-emerald-500 text-white border-emerald-600"; // saved
    if (idx === currentIndex && !submitted) return "bg-amber-400 text-slate-900 border-amber-500"; // current pending
    if (answers[q._id]) return "bg-slate-300 text-slate-900 border-slate-400"; // selected not saved
    return "bg-white text-slate-700 border-slate-300"; // not attempted
  };

  if (loading) return <div className="p-6 text-sm font-semibold text-slate-500">Loading mock test...</div>;
  if (error) return <div className="p-6 text-sm font-semibold text-red-600">{error}</div>;
  if (!questions.length) {
    return <div className="p-6 text-sm font-semibold text-slate-500">No selected question set for this subject. Ask admin to select one set.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-2" ref={mathRef}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Mock Test Attempt</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Subject: {questions[0]?.subjectName || "-"} | Set: {activeSet?.questionSetId || "-"} | Total: {questions.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">Elapsed Time</p>
          <p className="text-2xl font-semibold text-blue-700">{formatTime(elapsedSec)}</p>
        </div>
      </div>

      {!submitted ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 whitespace-pre-wrap">
              Q{currentIndex + 1}. {currentQuestion.questionText}
            </p>
            {renderImages(currentQuestion.questionImages)}

            <div className="space-y-2">
              {[
                { key: "A", val: currentQuestion.optionA },
                { key: "B", val: currentQuestion.optionB },
                { key: "C", val: currentQuestion.optionC },
                { key: "D", val: currentQuestion.optionD },
              ].map((opt) => (
                <label
                  key={`${currentQuestion._id}-${opt.key}`}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${
                    selected === opt.key ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion._id}
                    value={opt.key}
                    checked={selected === opt.key}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion._id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                      {opt.key}. {opt.val}
                    </span>
                    {renderImages(currentQuestion.optionImages?.[opt.key])}
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300"
              >
                Previous
              </button>
              <button
                onClick={handleClearResponse}
                className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200"
              >
                Clear Response
              </button>
              <button
                onClick={handleMarkForReview}
                className="px-4 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-semibold hover:bg-violet-200"
              >
                Mark Review
              </button>
              <button
                onClick={handleSaveAndNext}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Save & Next
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3">
              Questions ({questions.length})
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q._id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg border text-sm font-semibold ${getQuestionStatusClass(q, idx)}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-xs font-semibold text-slate-600">
              <p><span className="inline-block w-3 h-3 bg-emerald-500 rounded mr-2"></span>Saved</p>
              <p><span className="inline-block w-3 h-3 bg-violet-500 rounded mr-2"></span>Marked For Review</p>
              <p><span className="inline-block w-3 h-3 bg-amber-400 rounded mr-2"></span>Current Pending</p>
              <p><span className="inline-block w-3 h-3 bg-slate-300 rounded mr-2"></span>Selected Not Saved</p>
              <p><span className="inline-block w-3 h-3 bg-white border border-slate-300 rounded mr-2"></span>Not Attempted</p>
            </div>
            <button
              onClick={handleSubmitWithWarning}
              className="w-full mt-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
            >
              Submit Test
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-3">
            <p className="text-base font-semibold text-emerald-800">
              Score: {score.obtained} / {score.totalMarks}
            </p>
            <p className="text-sm font-semibold text-emerald-700 mt-1">
             Attemt: {score.correct} / {score.total}
            </p>
            <p className="text-sm font-semibold text-emerald-700 mt-1">
              Total Time Taken: {formatTime(elapsedSec)}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setSavedMap({});
                setMarkedMap({});
                setCurrentIndex(0);
                setElapsedSec(0);
              }}
              className="mt-3 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800"
            >
              Reattempt
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const ans = answers[q._id] || "";
              const ok = ans === q.correctOption;
              return (
                <div key={q._id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">Q{idx + 1}. {q.questionText}</p>
                  {renderImages(q.questionImages)}
                  <div className={`mt-3 p-3 rounded-xl border ${ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <p className="text-sm font-semibold">Your Answer: {ans || "Not Answered"} | Correct: {q.correctOption}</p>
                    <p className={`text-sm font-semibold mt-1 ${score.perQuestion[q._id] < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      Question Score: {score.perQuestion[q._id] > 0 ? `+${score.perQuestion[q._id]}` : score.perQuestion[q._id]}
                    </p>
                    {renderImages(q.optionImages?.[q.correctOption])}
                    {!ok && (
                      <p className="text-sm font-semibold text-slate-700 mt-1 whitespace-pre-wrap">
                        Explanation: {q.explanationText || "No explanation available."}
                      </p>
                    )}
                    {renderImages(q.explanationImages)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTestAttempt;
