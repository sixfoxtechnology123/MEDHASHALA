import { useState, useEffect } from "react";
import API from "../api/axios";

const QuestionMaster = () => {
  const [form, setForm] = useState({});
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    const { data } = await API.get("/exam");
    setExams(data);
  };

  const fetchCategories = async (examId) => {
    const { data } = await API.get(`/category/${examId}`);
    setCategories(data);
  };

  const submit = async () => {
    await API.post("/question", form);
    alert("Question Added");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Question Master</h2>

      <div className="bg-white p-6 rounded shadow space-y-3">

        <select
          className="border p-2 w-full"
          onChange={(e) => {
            setForm({ ...form, examId: e.target.value });
            fetchCategories(e.target.value);
          }}
        >
          <option>Select Exam</option>
          {exams.map(e => (
            <option key={e._id} value={e._id}>{e.examName}</option>
          ))}
        </select>

        <select
          className="border p-2 w-full"
          onChange={(e)=>setForm({...form, categoryId:e.target.value})}
        >
          <option>Select Category</option>
          {categories.map(c=>(
            <option key={c._id} value={c._id}>{c.categoryName}</option>
          ))}
        </select>

        <textarea
          className="border p-2 w-full"
          placeholder="Question"
          onChange={(e)=>setForm({...form,question:e.target.value})}
        />

        <input className="border p-2 w-full"
          placeholder="Option 1"
          onChange={(e)=>setForm({...form,options:[e.target.value]})}
        />

        <input className="border p-2 w-full"
          placeholder="Correct Answer"
          onChange={(e)=>setForm({...form,correctAnswer:e.target.value})}
        />

        <input className="border p-2 w-full"
          placeholder="Marks"
          onChange={(e)=>setForm({...form,marks:e.target.value})}
        />

        <input className="border p-2 w-full"
          placeholder="Time (seconds)"
          onChange={(e)=>setForm({...form,timeLimit:e.target.value})}
        />

        <button
          onClick={submit}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Question
        </button>

      </div>
    </div>
  );
};

export default QuestionMaster;