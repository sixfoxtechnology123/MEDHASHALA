const Exam = require("../models/Exam");
const Category = require("../models/Category");

exports.getSidebarStructure = async (req, res) => {
  try {
    // 1. Fetch official list from Exam Master
    const allExams = await Exam.find().sort({ examName: 1 }).lean();
    
    // 2. Fetch all categories from Category Master
    const allCategories = await Category.find().lean();

    // 3. Merge: Nest categories into their parent Exam based on examName
    const structure = allExams.map(exam => ({
      _id: exam._id,
      examName: exam.examName,
      // We match using the string 'examName' as per your denormalized DB
      categories: allCategories.filter(cat => cat.examName === exam.examName)
    }));

    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: "SIDEBAR_ERROR: " + err.message });
  }
};