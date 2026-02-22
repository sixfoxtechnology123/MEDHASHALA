import { useEffect, useState } from "react";
import API from "../api/axios";
import { useParams } from "react-router-dom";
import axios from "axios";

const ExamView = () => {
  const { examId, categoryId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!examId || !categoryId) {
      setError("Open Exam View using a valid exam and category.");
      return;
    }
    fetchQuestions();
  }, [examId, categoryId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get(
        `/question?examId=${examId}&categoryId=${categoryId}`
      );
      setQuestions(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to load questions");
      } else {
        setError("Failed to load questions");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!questions.length) return <div>No questions found.</div>;

  const q = questions[current];

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">

      <div className="flex justify-between mb-4">
        <h2 className="font-bold">Question {current+1}</h2>
        <span className="text-red-600 font-bold">Time: {timer}s</span>
      </div>

      <p className="mb-4">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt,i)=>(
          <button key={i}
            className="block w-full border p-2 rounded hover:bg-indigo-100">
            {opt}
          </button>
        ))}
      </div>

      <button
        onClick={() => setCurrent((prev) => Math.min(prev + 1, questions.length - 1))}
        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Next
      </button>

    </div>
  );
};

export default ExamView;
