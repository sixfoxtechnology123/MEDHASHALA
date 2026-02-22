import { Link } from "react-router-dom";

const AdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      <aside className="w-64 bg-indigo-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

        <nav className="space-y-4">
          <Link to="/admin/exam" className="block hover:text-yellow-300">Exam Master</Link>
          <Link to="/admin/category" className="block hover:text-yellow-300">Category Master</Link>
          <Link to="/admin/question" className="block hover:text-yellow-300">Question Master</Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
};

export default AdminLayout;