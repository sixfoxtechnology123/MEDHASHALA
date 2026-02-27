const Exam = require("../models/Exam");
const Category = require("../models/Category");
const Syllabus = require("../models/Syllabus");
const MockTest = require("../models/MockTest");

exports.getSidebarStructure = async (req, res) => {
  try {
    // 1. Fetch official list from Exam Master
    const allExams = await Exam.find().sort({ examName: 1 }).lean();
    
    // 2. Fetch all categories from Category Master
    const allCategories = await Category.find().lean();
    const allSyllabus = await Syllabus.find({ status: "ACTIVE" })
      .select("syllabusId subjectName examCode catId")
      .lean();
    const selectedMockSets = await MockTest.find({
      status: "ACTIVE",
      isActive: true,
      isSelectedForAttempt: true,
    })
      .select("subjectId")
      .lean();
    const selectedSubjectSet = new Set(
      selectedMockSets.map((s) => String(s.subjectId || "").toUpperCase()).filter(Boolean)
    );

    // 3. Merge: Nest categories into their parent Exam based on examName
    const structure = allExams.map(exam => ({
      _id: exam._id,
      examName: exam.examName,
      // We match using the string 'examName' as per your denormalized DB
      categories: allCategories
        .filter(cat => cat.examName === exam.examName)
        .map((cat) => ({
          ...cat,
          subjects: allSyllabus.filter(
            (s) =>
              String(s.examCode || "").toUpperCase() === String(cat.examCode || "").toUpperCase() &&
              String(s.catId || "").toUpperCase() === String(cat.catId || "").toUpperCase()
          ),
          mockTestSubjects: allSyllabus.filter(
            (s) =>
              String(s.examCode || "").toUpperCase() === String(cat.examCode || "").toUpperCase() &&
              String(s.catId || "").toUpperCase() === String(cat.catId || "").toUpperCase() &&
              selectedSubjectSet.has(String(s.syllabusId || "").toUpperCase())
          ),
        })),
    }));

    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: "SIDEBAR_ERROR: " + err.message });
  }
};
