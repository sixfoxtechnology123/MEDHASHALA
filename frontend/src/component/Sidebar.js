import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, ChevronRight, GraduationCap, 
  CheckCircle2, BookOpen, LayoutGrid, ShieldCheck, BookCopy, ClipboardList, CircleHelp, Home
} from "lucide-react";
import axios from "../api/axios";

const Sidebar = () => {
  const location = useLocation();
  const [menuData, setMenuData] = useState([]);
  
  const [openExams, setOpenExams] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [openSyllabus, setOpenSyllabus] = useState({});
  const [openMockTest, setOpenMockTest] = useState({});
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

  const toggleExam = (id) => setOpenExams(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCategory = (id) => setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSyllabus = (id) => setOpenSyllabus(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMockTest = (id) => setOpenMockTest(prev => ({ ...prev, [id]: !prev[id] }));

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 h-screen fixed left-0 top-0 bg-[#E0F2FE] text-slate-900 flex flex-col border-r border-sky-200 shadow-xl z-40">
      <div className="p-6 border-b border-sky-200 bg-white/50">
        <h2 className="text-xl font-bold uppercase tracking-tighter text-sky-800">
          MEDHASHALA
        </h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Dashboard Link - More prominent text */}
          <Link to="/dashboard" className={`flex items-center gap-3 p-2.5 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all ${isActive("/dashboard") ? "bg-sky-600 text-white shadow-lg" : "text-sky-900 hover:bg-white/60"}`}>
                <Home size={16} strokeWidth={2.5} /> Dashboard
          </Link>

        {/* --- DYNAMIC EXAMS LIST --- */}
        <div>
          <h3 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-[2px] text-sky-700/60">Exams Portal</h3>
          <div className="space-y-1">
            {menuData.map((exam) => (
              <div key={exam._id} className="space-y-1">
                <button
                  onClick={() => toggleExam(exam._id)}
                  className={`flex items-center justify-between w-full p-2.5 text-[11px] font-bold uppercase tracking-tighter rounded-xl transition-all ${
                    openExams[exam._id] ? "bg-white text-sky-700 shadow-md ring-1 ring-sky-100" : "text-slate-800 hover:bg-white/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-sky-600" />
                    <span>{exam.examName}</span>
                  </div>
                  {openExams[exam._id] ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                </button>

                {openExams[exam._id] && (
                  <div className="ml-5 border-l-2 border-sky-300 pl-3 py-1 space-y-1">
                    {exam.categories.map((cat) => (
                      <div key={cat._id}>
                        <button
                          onClick={() => toggleCategory(cat._id)}
                          className={`flex items-center justify-between w-full p-2 text-[10px] font-bold uppercase transition-all ${
                            openCategories[cat._id] ? "text-emerald-700" : "text-slate-600 hover:text-sky-700"
                          }`}
                        >
                          <span>{cat.catName}</span>
                          {openCategories[cat._id] ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronRight size={12} strokeWidth={3} />}
                        </button>

                        {openCategories[cat._id] && (
                          <div className="ml-2 mt-1 space-y-1 bg-white/50 rounded-xl p-2 shadow-inner">
                            {(cat.features || []).map((feat) => {
                              const featureUpper = String(feat).toUpperCase();
                              if (featureUpper === "MOCK TEST") {
                                return (
                                  <div key={`${cat._id}-mock-test`} className="space-y-1">
                                    <button onClick={() => toggleMockTest(cat._id)} className="w-full flex items-center justify-between gap-2 py-1 px-2 text-[9px] font-bold text-sky-900 hover:text-sky-600 uppercase">
                                      <span className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> MOCK TEST</span>
                                      {openMockTest[cat._id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    </button>
                                    {openMockTest[cat._id] && (
                                      <div className="ml-3 border-l border-sky-200 pl-2 space-y-1">
                                        {cat.mockTestSubjects?.map((subject) => (
                                          <Link key={subject._id} to={`/dashboard/mock-test-attempt/${subject.syllabusId || subject._id}`} className={`block py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-tight ${isActive(`/dashboard/mock-test-attempt/${subject.syllabusId || subject._id}`) ? "bg-emerald-500 text-white shadow-md" : "text-emerald-800 hover:bg-emerald-100"}`}>
                                            <div className="flex flex-col">
                                              <span>{subject.subjectName}</span>
                                              <span className={`text-[9px] font-semibold ${isActive(`/dashboard/mock-test-attempt/${subject.syllabusId || subject._id}`) ? "text-white/80" : "text-emerald-700/80"}`}>
                                                {subject.examStage ? `STAGE: ${subject.examStage}` : "STAGE: N/A"}
                                              </span>
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              if (featureUpper === "SYLLABUS") {
                                return (
                                  <div key={`${cat._id}-syllabus`} className="space-y-1">
                                    <button onClick={() => toggleSyllabus(cat._id)} className="w-full flex items-center justify-between gap-2 py-1 px-2 text-[9px] font-bold text-sky-900 hover:text-sky-600 uppercase">
                                      <span className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-600" /> SYLLABUS</span>
                                      {openSyllabus[cat._id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    </button>
                                    {openSyllabus[cat._id] && (
                                      <div className="ml-3 border-l border-sky-200 pl-2 space-y-1">
                                        {cat.subjects?.map((subject) => (
                                          <Link key={subject._id} to={`/dashboard/syllabus-view/${subject._id}`} className={`block py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-tight ${isActive(`/dashboard/syllabus-view/${subject._id}`) ? "bg-sky-600 text-white shadow-md" : "text-sky-800 hover:bg-sky-100"}`}>
                                            <div className="flex flex-col">
                                              <span>{subject.subjectName}</span>
                                              <span className={`text-[9px] font-semibold ${isActive(`/dashboard/syllabus-view/${subject._id}`) ? "text-white/80" : "text-sky-700/80"}`}>
                                                {subject.examStage ? `STAGE: ${subject.examStage}` : "STAGE: N/A"}
                                              </span>
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
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

        <hr className="border-sky-200" />

        {/* --- ADMIN CONTROLLER --- */}
        <div>
          <button onClick={() => setAdminOpen(!adminOpen)} className="flex justify-between w-full px-2 text-[10px] font-bold uppercase tracking-widest text-sky-800/60 hover:text-sky-900">
            <span>Admin Control Panel</span>
            {adminOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {adminOpen && (
            <div className="mt-2 space-y-1">
              {[
                { to: "/dashboard/exam-master", icon: BookOpen, label: "Exam Master", bg: "bg-white text-sky-700" },
                { to: "/dashboard/category-master", icon: LayoutGrid, label: "Category Master", bg: "bg-emerald-600 text-white" },
                { to: "/dashboard/syllabus-master", icon: BookCopy, label: "Syllabus Master", bg: "bg-sky-600 text-white" },
                { to: "/dashboard/question-bank", icon: CircleHelp, label: "Question Bank", bg: "bg-emerald-600 text-white" },
                { to: "/dashboard/mock-test", icon: ClipboardList, label: "Mock Test Set", bg: "bg-sky-800 text-white" },
              ].map((item) => (
                <Link 
                  key={item.to}
                  to={item.to} 
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive(item.to) ? `${item.bg} shadow-lg scale-105` : "text-sky-900 hover:bg-white/60"}`}
                >
                  <item.icon size={16} strokeWidth={2.5} /> {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="p-4 bg-sky-200/50 text-center flex items-center justify-center gap-2 text-[10px] font-bold text-sky-800 tracking-widest uppercase">
        <ShieldCheck size={12} strokeWidth={3} /> Secured Area
      </div>
    </div>
  );
};

export default Sidebar;
