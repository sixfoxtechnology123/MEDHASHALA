import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, ChevronRight, GraduationCap, 
  CheckCircle2, BookOpen, LayoutGrid, ShieldCheck 
} from "lucide-react";
import axios from "../api/axios";

const Sidebar = () => {
  const location = useLocation();
  const [menuData, setMenuData] = useState([]);
  
  // Track open states by ID so they toggle independently
  const [openExams, setOpenExams] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [adminOpen, setAdminOpen] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get("/public/sidebar-menu");
        if (res.data.success) setMenuData(res.data.data);
      } catch (err) { console.error("Sidebar sync failed", err); }
    };
    fetchMenu();
  }, []);

  const toggleExam = (id) => {
    setOpenExams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCategory = (id) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 h-screen bg-[#0F172A] text-white flex flex-col border-r border-slate-800 shadow-2xl">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-black uppercase tracking-tighter text-blue-500">MEDHASHALA</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 custom-scrollbar">
        {/* --- DYNAMIC EXAMS LIST --- */}
        <div>
          <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Exams List</h3>
          <div className="space-y-1">
            {menuData.map((exam) => (
              <div key={exam._id} className="space-y-1">
                {/* LEVEL 1: EXAM NAME */}
                <button
                  onClick={() => toggleExam(exam._id)}
                  className={`flex items-center justify-between w-full p-2 text-xs font-bold rounded-lg transition-all ${
                    openExams[exam._id] ? "bg-blue-600/10 text-blue-400" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} />
                    <span>{exam.examName}</span>
                  </div>
                  {openExams[exam._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* LEVEL 2: CATEGORY NAME */}
                {openExams[exam._id] && (
                  <div className="ml-5 border-l border-slate-700 pl-3 py-1 space-y-1">
                    {exam.categories.map((cat) => (
                      <div key={cat._id}>
                        <button
                          onClick={() => toggleCategory(cat._id)}
                          className={`flex items-center justify-between w-full p-2 text-[11px] font-bold transition-all ${
                            openCategories[cat._id] ? "text-emerald-400" : "text-slate-500 hover:text-white"
                          }`}
                        >
                          <span>{cat.catName}</span>
                          {openCategories[cat._id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {/* LEVEL 3: FEATURES (MOCK TEST, etc) */}
                        {openCategories[cat._id] && (
                          <div className="ml-2 mt-1 space-y-1 bg-slate-800/20 rounded-lg p-2">
                            {cat.features.map((feat) => (
                              <div key={feat} className="flex items-center gap-2 py-1 px-2 text-[9px] font-black text-slate-400 hover:text-blue-400 transition-colors uppercase">
                                <CheckCircle2 size={10} className="text-emerald-500" /> {feat}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* --- ADMIN CONTROLLER --- */}
        <div>
          <button onClick={() => setAdminOpen(!adminOpen)} className="flex justify-between w-full px-2 text-[10px] font-black uppercase text-slate-500 hover:text-white">
            <span>Admin Controller</span>
            {adminOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {adminOpen && (
            <div className="mt-2 space-y-1">
              <Link to="/dashboard/exam-master" className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-all ${isActive("/dashboard/exam-master") ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>
                <BookOpen size={16} /> Exam Master
              </Link>
              <Link to="/dashboard/category-master" className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-all ${isActive("/dashboard/category-master") ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>
                <LayoutGrid size={16} /> Category Master
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 bg-slate-950/50 text-center flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
        <ShieldCheck size={12} /> SECURED ADMIN AREA
      </div>
    </div>
  );
};

export default Sidebar;