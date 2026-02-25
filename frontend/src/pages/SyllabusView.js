import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axios";

const SyllabusView = () => {
  const { syllabusId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syllabus, setSyllabus] = useState(null);

  useEffect(() => {
    const loadSyllabus = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/master/syllabus/${syllabusId}`);
        if (res.data?.success) {
          setSyllabus(res.data.data);
        } else {
          setError("SYLLABUS NOT FOUND");
        }
      } catch (err) {
        setError(err?.response?.data?.message || "FAILED TO LOAD SYLLABUS");
      } finally {
        setLoading(false);
      }
    };

    if (syllabusId) loadSyllabus();
  }, [syllabusId]);

  if (loading) return <div className="p-10 font-semibold text-slate-500 animate-pulse">Loading syllabus...</div>;
  if (error) return <div className="p-10 font-semibold text-red-600 bg-red-50">{error}</div>;
  if (!syllabus) return <div className="p-10 font-semibold text-slate-500">No data found</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      {/* Header Section */}
      <div className="mb-4 bg-slate-900 rounded-3xl p-4 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
        
          <h1 className="text-2xl md:text-2xl font-bold">
            {syllabus.subjectName}
          </h1>
          <p className="mt-2 text-slate-400 font-semibold text-sm">
            {syllabus.examName} <span className="mx-2 text-slate-700">|</span> {syllabus.catName}
          </p>
        </div>
        {/* Background Decorative Circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Syllabus Table */}
      <div className="bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="w-20 p-2 text-left text-[11px] font-semibold text-slate-500">SL.</th>
              <th className="w-1/3 p-2 text-left text-[11px] font-semibold text-slate-500 border-x border-slate-100">Topic Name</th>
              <th className="p-2 text-left text-[11px] font-semibold text-slate-500">Details</th>
            </tr>
          </thead>
          <tbody>
            {(syllabus.topics || []).map((topic, idx) => (
              <tr 
                key={idx} 
                className="group hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-none"
              >
                <td className="p-3 align-top">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all text-sm font-semibold text-slate-600">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </td>
                <td className="p-3 align-top border-x border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                    {topic.topicName}
                  </h3>
                </td>
                <td className="p-3 align-top">
                  <ul className="space-y-1">
                    {(topic.subTopics || []).map((sub, sIdx) => (
                      <li 
                        key={sIdx} 
                        className="flex items-start gap-3 text-sm text-slate-600 font-semibold"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                        <span className="leading-relaxed">{sub}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

     
    </div>
  );
};

export default SyllabusView;
