import { Link } from "react-router-dom";

const UserLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <header className="bg-indigo-600 text-white p-4 flex justify-between">
        <h1 className="font-bold text-xl">Gov Exam Portal</h1>
        <Link to="/login">Logout</Link>
      </header>

      <div className="p-6">{children}</div>
    </div>
  );
};

export default UserLayout;